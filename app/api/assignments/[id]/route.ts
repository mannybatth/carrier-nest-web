import { Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { exclude } from 'interfaces/models';
import 'polyfills';

export const GET = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const assignmentId = context.params.id;

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
    const did = req.nextUrl.searchParams.get('did');

    // FIX: Needs to be allowed for driver page that doesn't have a login
    if (!tokenCarrierId && !did) {
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
                ...(did ? { driverId: did } : {}),
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
                        bolDocuments: true,
                        loadDocuments: true,
                        carrier: true,
                        invoice: {
                            select: {
                                id: true,
                            },
                        },
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
                                billedLoadRate: true,
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
                                                billedLoadRate: true,
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

        // If accessed by driver ID, check if the driver is active
        if (did && driverAssignment.driver && !driverAssignment.driver.active) {
            return NextResponse.json(
                {
                    code: 403,
                    errors: [{ message: 'Access denied. Driver account is inactive.' }],
                },
                { status: 403 },
            );
        }

        // Exclude the 'rate' field from the load objects if carrierId is set
        if (req.auth?.user?.carrierId && driverAssignment.load) {
            (driverAssignment as any).load = exclude(driverAssignment.load, ['rate']);
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

export const PATCH = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const assignmentId = context.params.id;

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
        const body = await req.json();

        // First, get the assignment to check the driver status
        const existingAssignment = await prisma.driverAssignment.findFirst({
            where: {
                id: assignmentId,
                carrierId: tokenCarrierId,
            },
            include: {
                driver: true,
            },
        });

        if (!existingAssignment) {
            return NextResponse.json(
                {
                    code: 404,
                    errors: [{ message: 'Driver assignment not found' }],
                },
                { status: 404 },
            );
        }

        if (!existingAssignment.driver.active) {
            return NextResponse.json(
                {
                    code: 403,
                    errors: [
                        { message: 'Cannot update assignment for inactive driver. Please activate the driver first.' },
                    ],
                },
                { status: 403 },
            );
        }

        const updatedAssignment = await prisma.driverAssignment.updateMany({
            where: {
                id: assignmentId,
                carrierId: tokenCarrierId,
            },
            data: body as Prisma.DriverAssignmentUpdateManyMutationInput,
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
