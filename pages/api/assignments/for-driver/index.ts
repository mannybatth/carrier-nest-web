import { Prisma, RouteLegStatus } from '@prisma/client';
import { subDays } from 'date-fns';
import { calcPaginationMetadata } from 'lib/pagination';
import type { NextApiRequest, NextApiResponse } from 'next';
import { JSONResponse, exclude } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from 'pages/api/auth/[...nextauth]';

const buildOrderBy = (
    sortBy: string,
    sortDir: 'asc' | 'desc',
): Prisma.Enumerable<Prisma.DriverAssignmentOrderByWithRelationInput> => {
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

    const session = await getServerSession(req, res, authOptions);
    const tokenCarrierId = session?.user?.carrierId || session?.user?.defaultCarrierId;

    if (!tokenCarrierId) {
        return res.status(401).send({
            code: 401,
            errors: [{ message: 'Unauthorized' }],
        });
    }

    const sortBy = req.query.sortBy as string;
    const sortDir = (req.query.sortDir as 'asc' | 'desc') || 'asc';
    const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;
    const offset = req.query.offset !== undefined ? Number(req.query.offset) : undefined;

    const assignedOnly = req.query.assignedOnly === '1';
    const completedOnly = req.query.completedOnly === '1';

    let whereClause: Prisma.DriverAssignmentWhereInput = {};

    if (assignedOnly) {
        const tenDaysAgo = subDays(new Date(), 10);

        whereClause = {
            routeLeg: {
                scheduledDate: {
                    gte: tenDaysAgo,
                },
                status: {
                    not: RouteLegStatus.COMPLETED,
                },
            },
        };
    } else if (completedOnly) {
        const thirtyDaysAgo = subDays(new Date(), 30);

        whereClause = {
            routeLeg: {
                scheduledDate: {
                    gte: thirtyDaysAgo,
                },
                status: RouteLegStatus.COMPLETED,
            },
        };
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

    try {
        const total = await prisma.driverAssignment.count({
            where: {
                driverId: driverId,
                driver: {
                    carrierId: tokenCarrierId,
                },
                ...whereClause,
            },
        });

        const metadata = calcPaginationMetadata({ total, limit, offset });

        const driverAssignments = await prisma.driverAssignment.findMany({
            where: {
                driverId: driverId,
                driver: {
                    carrierId: tokenCarrierId,
                },
                ...whereClause,
            },
            orderBy: buildOrderBy(sortBy, sortDir) || {
                createdAt: 'desc',
            },
            ...(limit ? { take: limit } : { take: 10 }),
            ...(offset ? { skip: offset } : { skip: 0 }),
            include: {
                driver: true,
                load: {
                    include: {
                        shipper: true,
                        stops: true,
                        receiver: true,
                        customer: true,
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
                        distanceMiles: true,
                        durationHours: true,
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
                                        distanceMiles: true,
                                        durationHours: true,
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
            return res.status(200).send({
                code: 200,
                data: { metadata, assignments: [] },
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
            data: { metadata, assignments: assignmentsWithExcludedRate },
        });
    } catch (error) {
        console.error('Error fetching driver assignments:', error);
        return res.status(500).send({
            code: 500,
            errors: [{ message: 'Internal server error' }],
        });
    }
}
