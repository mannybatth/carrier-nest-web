import type { NextApiRequest, NextApiResponse } from 'next';
import { JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get(req, res);
        default:
            return res.status(405).json({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }
}

async function _get(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    const { id: assignmentId } = req.query;

    if (!assignmentId || typeof assignmentId !== 'string') {
        return res.status(400).json({
            code: 400,
            errors: [{ message: 'Invalid or missing assignment ID' }],
        });
    }

    const session = await getServerSession(req, res, authOptions);
    const tokenCarrierId = session?.user?.carrierId || session?.user?.defaultCarrierId;

    if (!tokenCarrierId) {
        return res.status(401).json({
            code: 401,
            errors: [{ message: 'Unauthorized' }],
        });
    }

    try {
        const driverAssignment = await prisma.driverAssignment.findFirst({
            where: {
                id: assignmentId,
                carrierId: tokenCarrierId,
            },
            include: {
                driver: true,
                load: {
                    include: {
                        shipper: true,
                        stops: true,
                        receiver: true,
                        customer: true,
                        podDocuments: true,
                        carrier: true,
                    },
                },
                routeLeg: {
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
                                chargeType: true,
                                chargeValue: true,
                            },
                        },
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
                                                chargeType: true,
                                                chargeValue: true,
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

        if (!driverAssignment) {
            return res.status(404).json({
                code: 404,
                errors: [{ message: 'Driver assignment not found' }],
            });
        }

        return res.status(200).json({
            code: 200,
            data: driverAssignment,
        });
    } catch (error) {
        console.error('Error fetching driver assignment:', error);
        return res.status(500).json({
            code: 500,
            errors: [{ message: 'Internal server error' }],
        });
    }
}
