import { Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { calcPaginationMetadata } from 'lib/pagination';

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

export const GET = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json(
            {
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            },
            { status: 401 },
        );
    }

    try {
        const driverId = context.params.id;
        if (!driverId) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [{ message: 'Invalid or missing driver ID' }],
                },
                { status: 400 },
            );
        }

        const carrierId = req.auth.user.defaultCarrierId;
        const sortBy = req.nextUrl.searchParams.get('sortBy') || '';
        const sortDir = (req.nextUrl.searchParams.get('sortDir') as 'asc' | 'desc') || 'asc';
        const limit = req.nextUrl.searchParams.get('limit') ? Number(req.nextUrl.searchParams.get('limit')) : undefined;
        const offset = req.nextUrl.searchParams.get('offset')
            ? Number(req.nextUrl.searchParams.get('offset'))
            : undefined;

        if (!carrierId) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [{ message: 'Carrier ID is required' }],
                },
                { status: 400 },
            );
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

        return NextResponse.json({
            code: 200,
            data: {
                driverPayments,
                metadata,
            },
        });
    } catch (error) {
        console.error('Error fetching driver payments:', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Internal server error' }],
            },
            { status: 500 },
        );
    }
});

export const POST = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json(
            {
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            },
            { status: 401 },
        );
    }
    const driverId = context.params.id;

    const { amount, paymentDate, driverAssignmentIds, notes } = await req.json();

    if (!amount || !paymentDate || !driverId || (!driverAssignmentIds && !driverAssignmentIds.length)) {
        return NextResponse.json(
            {
                code: 400,
                errors: [{ message: 'Missing required fields' }],
            },
            { status: 400 },
        );
    }

    try {
        if (driverAssignmentIds.length > 1) {
            // Batch payments

            const driverAssignments = await prisma.driverAssignment.findMany({
                where: {
                    id: { in: driverAssignmentIds },
                    carrierId: req.auth.user.defaultCarrierId,
                    driverId: driverId as string,
                },
                include: { load: true, driver: true },
            });

            if (driverAssignments.length === 0) {
                return NextResponse.json(
                    {
                        code: 404,
                        errors: [{ message: 'Driver assignments not found' }],
                    },
                    { status: 404 },
                );
            }

            const driverPayment = await prisma.driverPayment.create({
                data: {
                    amount,
                    paymentDate: new Date(paymentDate),
                    carrierId: req.auth.user.defaultCarrierId,
                    driverId: driverId as string,
                    isBatchPayment: true,
                    notes,
                },
            });

            const assignmentPayments = driverAssignments.map(
                (driverAssignment): Prisma.AssignmentPaymentCreateManyInput => ({
                    carrierId: req.auth.user.defaultCarrierId,
                    loadId: driverAssignment.loadId,
                    driverAssignmentId: driverAssignment.id,
                    driverPaymentId: driverPayment.id,
                }),
            );

            await prisma.assignmentPayment.createMany({
                data: assignmentPayments,
            });

            return NextResponse.json(
                {
                    code: 201,
                    data: { driverPayment },
                },
                { status: 201 },
            );
        } else {
            // Single payment

            const driverAssignment = await prisma.driverAssignment.findUnique({
                where: {
                    id: driverAssignmentIds[0],
                    carrierId: req.auth.user.defaultCarrierId,
                    driverId: driverId as string,
                },
                include: { load: true, driver: true },
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

            const driverPayment = await prisma.driverPayment.create({
                data: {
                    amount,
                    paymentDate: new Date(paymentDate),
                    carrierId: req.auth.user.defaultCarrierId,
                    driverId: driverId as string,
                    notes,
                },
            });

            await prisma.assignmentPayment.create({
                data: {
                    carrierId: req.auth.user.defaultCarrierId,
                    loadId: driverAssignment.loadId,
                    driverAssignmentId: driverAssignment.id,
                    driverPaymentId: driverPayment.id,
                },
            });

            return NextResponse.json(
                {
                    code: 201,
                    data: { driverPayment },
                },
                { status: 201 },
            );
        }
    } catch (error) {
        console.error('Error creating assignment payment:', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Internal server error' }],
            },
            { status: 500 },
        );
    }
});
