import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { JSONResponse, exclude } from '../../../../interfaces/models';
import { getToken } from 'next-auth/jwt';

export default async function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get(req, res);
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }
}

async function _get(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    const { driverId } = req.query;

    if (!driverId || typeof driverId !== 'string') {
        return res.status(400).send({
            code: 400,
            errors: [{ message: 'Invalid or missing driver ID' }],
        });
    }

    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    const tokenCarrierId = token?.carrierId as string;

    if (!tokenCarrierId) {
        return res.status(401).send({
            code: 401,
            errors: [{ message: 'Unauthorized' }],
        });
    }

    try {
        const driverAssignments = await prisma.driverAssignment.findMany({
            where: {
                driverId: driverId,
                driver: {
                    carrierId: tokenCarrierId,
                },
            },
            include: {
                driver: true,
                load: {
                    include: {
                        shipper: true,
                        stops: true,
                        receiver: true,
                    },
                },
                routeLeg: {
                    include: {
                        route: {
                            select: {
                                id: true,
                                loadId: true,
                                routeLegs: {
                                    orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
                                    select: {
                                        id: true,
                                        driverInstructions: true,
                                        locations: { select: { id: true, loadStop: true, location: true } },
                                        scheduledDate: true,
                                        scheduledTime: true,
                                        startedAt: true,
                                        startLatitude: true,
                                        startLongitude: true,
                                        createdAt: true,
                                        endedAt: true,
                                        endLatitude: true,
                                        endLongitude: true,
                                        routeLegDistance: true,
                                        routeLegDuration: true,
                                        status: true,
                                        routeId: true,
                                        driverAssignments: {
                                            select: {
                                                id: true,
                                                assignedAt: true,
                                                driver: {
                                                    select: {
                                                        id: true,
                                                        name: true,
                                                        email: true,
                                                        phone: true,
                                                    },
                                                },
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

        if (!driverAssignments || driverAssignments.length === 0) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'No assignments found for this driver' }],
            });
        }

        // Exclude the 'rate' field from the load objects
        const assignmentsWithExcludedRate = driverAssignments.map((assignment) => {
            return {
                ...assignment,
                load: assignment.load ? exclude(assignment.load, ['rate']) : null,
            };
        });

        return res.status(200).send({
            code: 200,
            data: assignmentsWithExcludedRate,
        });
    } catch (error) {
        console.error('Error fetching driver assignments:', error);
        return res.status(500).send({
            code: 500,
            errors: [{ message: 'Internal server error' }],
        });
    }
}
