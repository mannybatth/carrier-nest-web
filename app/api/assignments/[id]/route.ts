import { Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const GET = auth(async (req: NextAuthRequest) => {
    const assignmentId = req.nextUrl.searchParams.get('id');

    if (!assignmentId) {
        return NextResponse.json(
            {
                code: 400,
                errors: [{ message: 'Invalid or missing assignment ID' }],
            },
            { status: 400 },
        );
    }

    const tokenCarrierId = req.auth?.user?.carrierId || req.auth?.user?.defaultCarrierId;

    if (!tokenCarrierId) {
        return NextResponse.json(
            {
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            },
            { status: 401 },
        );
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
            return NextResponse.json(
                {
                    code: 404,
                    errors: [{ message: 'Driver assignment not found' }],
                },
                { status: 404 },
            );
        }

        return NextResponse.json(
            {
                code: 200,
                data: driverAssignment,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error('Error fetching driver assignment:', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Internal server error' }],
            },
            { status: 500 },
        );
    }
});

export const PATCH = auth(async (req: NextAuthRequest) => {
    const assignmentId = req.nextUrl.searchParams.get('id');

    if (!assignmentId) {
        return NextResponse.json(
            {
                code: 400,
                errors: [{ message: 'Invalid or missing assignment ID' }],
            },
            { status: 400 },
        );
    }

    const tokenCarrierId = req.auth?.user?.carrierId || req.auth?.user?.defaultCarrierId;

    if (!tokenCarrierId) {
        return NextResponse.json(
            {
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            },
            { status: 401 },
        );
    }

    try {
        const updatedAssignment = await prisma.driverAssignment.updateMany({
            where: {
                id: assignmentId,
                carrierId: tokenCarrierId,
            },
            data: req.body as Prisma.DriverAssignmentUpdateManyMutationInput,
        });

        if (updatedAssignment.count === 0) {
            return NextResponse.json(
                {
                    code: 404,
                    errors: [{ message: 'Driver assignment not found or no changes made' }],
                },
                { status: 404 },
            );
        }

        return NextResponse.json(
            {
                code: 200,
                data: updatedAssignment,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error('Error updating driver assignment:', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Internal server error' }],
            },
            { status: 500 },
        );
    }
});
