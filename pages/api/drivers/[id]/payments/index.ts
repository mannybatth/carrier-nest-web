import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, Session } from 'next-auth';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';
import { calcPaginationMetadata } from '../../../../../lib/pagination';

const buildOrderBy = (
    sortBy: string,
    sortDir: 'asc' | 'desc',
): Prisma.Enumerable<Prisma.DriverPaymentOrderByWithRelationInput> => {
    if (sortBy && sortDir) {
        if (sortBy.includes('.')) {
            const split = sortBy.split('.');
            return {
                [split[0]]: {
                    [split[1]]: sortDir,
                },
            };
        }
        return { [sortBy]: sortDir };
    }
    return undefined;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({
            code: 401,
            errors: [{ message: 'Unauthorized' }],
        });
    }

    switch (req.method) {
        case 'GET':
            return _get(req, res, session);
        case 'POST':
            return _post(req, res, session);
        default:
            return res.status(405).json({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }
}

async function _get(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>, session: Session) {
    try {
        const { id: driverId } = req.query;

        if (!driverId || typeof driverId !== 'string') {
            return res.status(400).json({
                code: 400,
                errors: [{ message: 'Invalid or missing driver ID' }],
            });
        }

        const carrierId = session.user.defaultCarrierId;

        const sortBy = req.query.sortBy as string;
        const sortDir = (req.query.sortDir as 'asc' | 'desc') || 'asc';
        const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;
        const offset = req.query.offset !== undefined ? Number(req.query.offset) : undefined;

        if (!carrierId) {
            return res.status(400).json({
                code: 400,
                errors: [{ message: 'Carrier ID is required' }],
            });
        }

        if (limit != null || offset != null) {
            if (limit == null || offset == null) {
                return {
                    code: 400,
                    errors: [{ message: 'Limit and Offset must be set together' }],
                };
            }

            if (isNaN(limit) || isNaN(offset)) {
                return {
                    code: 400,
                    errors: [{ message: 'Invalid limit or offset' }],
                };
            }
        }

        const driverPayments = await prisma.driverPayment.findMany({
            where: { driverId, carrierId },
            orderBy: buildOrderBy(sortBy, sortDir) || {
                createdAt: 'desc',
            },
            ...(limit ? { take: limit } : { take: 10 }),
            ...(offset ? { skip: offset } : { skip: 0 }),
            include: {
                assignmentPayments: {
                    include: {
                        load: true,
                        driverAssignment: {
                            include: {
                                routeLeg: {
                                    include: {
                                        driverAssignments: {
                                            include: {
                                                driver: true,
                                            },
                                        },
                                        locations: {
                                            include: {
                                                loadStop: true,
                                                location: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const total = await prisma.driverPayment.count({
            where: { driverId, carrierId },
        });

        const metadata = calcPaginationMetadata({
            total,
            limit: limit ? Number(limit) : 20,
            offset: offset ? Number(offset) : 0,
        });

        return res.status(200).json({
            code: 200,
            data: {
                driverPayments,
                metadata,
            },
        });
    } catch (error) {
        console.error('Error fetching driver payments:', error);
        return res.status(500).json({
            code: 500,
            errors: [{ message: 'Internal server error' }],
        });
    }
}

async function _post(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>, session: any) {
    const { amount, paymentDate, driverAssignmentIds, notes } = req.body;
    const { id: driverId } = req.query;

    if (!amount || !paymentDate || !driverId || (!driverAssignmentIds && !driverAssignmentIds.length)) {
        return res.status(400).json({
            code: 400,
            errors: [{ message: 'Missing required fields' }],
        });
    }

    try {
        if (driverAssignmentIds.length > 1) {
            // Batch payments

            const driverAssignments = await prisma.driverAssignment.findMany({
                where: {
                    id: { in: driverAssignmentIds },
                    carrierId: session.user.defaultCarrierId,
                    driverId: driverId as string,
                },
                include: { load: true, driver: true },
            });

            if (driverAssignments.length === 0) {
                return res.status(404).json({
                    code: 404,
                    errors: [{ message: 'Driver assignments not found' }],
                });
            }

            const driverPayment = await prisma.driverPayment.create({
                data: {
                    amount,
                    paymentDate: new Date(paymentDate),
                    carrierId: session.user.defaultCarrierId,
                    driverId: driverId as string,
                    isBatchPayment: true,
                    notes,
                },
            });

            const assignmentPayments = driverAssignments.map(
                (driverAssignment): Prisma.AssignmentPaymentCreateManyInput => ({
                    carrierId: session.user.defaultCarrierId,
                    loadId: driverAssignment.loadId,
                    driverAssignmentId: driverAssignment.id,
                    driverPaymentId: driverPayment.id,
                }),
            );

            await prisma.assignmentPayment.createMany({
                data: assignmentPayments,
            });

            return res.status(201).json({
                code: 201,
                data: { driverPayment },
            });
        } else {
            // Single payment

            const driverAssignment = await prisma.driverAssignment.findUnique({
                where: {
                    id: driverAssignmentIds[0],
                    carrierId: session.user.defaultCarrierId,
                    driverId: driverId as string,
                },
                include: { load: true, driver: true },
            });

            if (!driverAssignment) {
                return res.status(404).json({
                    code: 404,
                    errors: [{ message: 'Driver assignment not found' }],
                });
            }

            const driverPayment = await prisma.driverPayment.create({
                data: {
                    amount,
                    paymentDate: new Date(paymentDate),
                    carrierId: session.user.defaultCarrierId,
                    driverId: driverId as string,
                    notes,
                },
            });

            await prisma.assignmentPayment.create({
                data: {
                    carrierId: session.user.defaultCarrierId,
                    loadId: driverAssignment.loadId,
                    driverAssignmentId: driverAssignment.id,
                    driverPaymentId: driverPayment.id,
                },
            });

            return res.status(201).json({
                code: 201,
                data: { driverPayment },
            });
        }
    } catch (error) {
        console.error('Error creating assignment payment:', error);
        return res.status(500).json({
            code: 500,
            errors: [{ message: 'Internal server error' }],
        });
    }
}
