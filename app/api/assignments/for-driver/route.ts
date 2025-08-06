import { Prisma, RouteLegStatus } from '@prisma/client';
import { auth } from 'auth';
import { subDays } from 'date-fns';
import { calcPaginationMetadata } from 'lib/pagination';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { exclude } from 'interfaces/models';

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

export const GET = auth(async (req: NextAuthRequest) => {
    const driverId = req.nextUrl.searchParams.get('driverId');

    if (!driverId) {
        return NextResponse.json(
            {
                code: 400,
                errors: [{ message: 'Invalid or missing driver ID' }],
            },
            { status: 400 },
        );
    }

    const session = req.auth;
    const tokenCarrierId = session?.user?.carrierId || session?.user?.defaultCarrierId;

    if (!tokenCarrierId) {
        return NextResponse.json(
            {
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            },
            { status: 401 },
        );
    }

    const sortBy = req.nextUrl.searchParams.get('sortBy') as string;
    const sortDir = (req.nextUrl.searchParams.get('sortDir') as 'asc' | 'desc') || 'asc';
    const limit =
        req.nextUrl.searchParams.get('limit') !== null ? Number(req.nextUrl.searchParams.get('limit')) : undefined;
    const offset =
        req.nextUrl.searchParams.get('offset') !== null ? Number(req.nextUrl.searchParams.get('offset')) : undefined;

    const assignedOnly = req.nextUrl.searchParams.get('assignedOnly') === '1';
    const completedOnly = req.nextUrl.searchParams.get('completedOnly') === '1';

    let whereClause: Prisma.DriverAssignmentWhereInput = {};

    if (assignedOnly) {
        // const tenDaysAgo = subDays(new Date(), 10);

        whereClause = {
            routeLeg: {
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
            return NextResponse.json(
                {
                    code: 400,
                    errors: [{ message: 'Limit and Offset must be set together' }],
                },
                { status: 400 },
            );
        }

        if (isNaN(limit) || isNaN(offset)) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [{ message: 'Invalid limit or offset' }],
                },
                { status: 400 },
            );
        }
    }

    try {
        // First, check if the driver exists and is active
        const driver = await prisma.driver.findFirst({
            where: {
                id: driverId,
                carrierId: tokenCarrierId,
            },
        });

        if (!driver) {
            return NextResponse.json(
                {
                    code: 404,
                    errors: [{ message: 'Driver not found' }],
                },
                { status: 404 },
            );
        }

        if (!driver.active) {
            // Return empty assignments for inactive drivers using the same structure as active drivers with no data
            const metadata = calcPaginationMetadata({ total: 0, limit, offset });
            return NextResponse.json(
                {
                    code: 200,
                    data: { metadata, assignments: [] },
                },
                { status: 200 },
            );
        }

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
                                        active: true,
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
                                                        active: true,
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
            return NextResponse.json(
                {
                    code: 200,
                    data: { metadata, assignments: [] },
                },
                { status: 200 },
            );
        }

        // Exclude the 'rate' field from the load objects
        const assignmentsWithExcludedRate = driverAssignments.map((assignment) => {
            return {
                ...assignment,
                load: assignment.load ? exclude(assignment.load, ['rate']) : null,
            };
        });

        return NextResponse.json(
            {
                code: 200,
                data: { metadata, assignments: assignmentsWithExcludedRate },
            },
            { status: 200 },
        );
    } catch (error) {
        console.error('Error fetching driver assignments:', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Internal server error' }],
            },
            { status: 500 },
        );
    }
});
