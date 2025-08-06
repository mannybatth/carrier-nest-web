import { DriverInvoiceStatus, Prisma, Driver } from '@prisma/client';
import { auth } from 'auth';
import { ca } from 'date-fns/locale';
import { UIDriverInvoiceStatus } from 'interfaces/models';
import { calcPaginationMetadata } from 'lib/pagination';
import prisma from 'lib/prisma';
import { Session } from 'next-auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

export type SimplifiedDriverInvoice = {
    id: string;
    invoiceNum: number;
    createdAt: Date;
    status: DriverInvoiceStatus;
    driver: Driver;
    assignmentCount: number;
    totalAmount: number;
};

const buildOrderBy = (
    sortBy: string,
    sortDir: 'asc' | 'desc',
): Prisma.Enumerable<Prisma.DriverInvoiceOrderByWithRelationInput> => {
    if (sortBy && sortDir) {
        if (sortBy.includes('.')) {
            const split = sortBy.split('.');
            if (split.length === 3) {
                return {
                    [split[0]]: {
                        [split[1]]: {
                            [split[2]]: sortDir,
                        },
                    },
                };
            } else {
                return {
                    [split[0]]: {
                        [split[1]]: sortDir,
                    },
                };
            }
        }
        return { [sortBy]: sortDir };
    }
    return undefined;
};

const buildWhere = (session: Session, status?: UIDriverInvoiceStatus): Prisma.DriverInvoiceWhereInput => {
    const where: Prisma.DriverInvoiceWhereInput = {
        carrierId: session.user.defaultCarrierId,
    };

    if (!status) return where;

    const invoiceStatus = (() => {
        switch (status) {
            case UIDriverInvoiceStatus.PENDING:
                return DriverInvoiceStatus.PENDING;
            case UIDriverInvoiceStatus.APPROVED:
                return DriverInvoiceStatus.APPROVED;
            case UIDriverInvoiceStatus.PARTIALLY_PAID:
                return DriverInvoiceStatus.PARTIALLY_PAID;
            case UIDriverInvoiceStatus.PAID:
                return DriverInvoiceStatus.PAID;
            default:
                return undefined;
        }
    })();

    if (invoiceStatus) {
        where.status = invoiceStatus;
    }

    return where;
};

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const query = req.nextUrl.searchParams;
    const sortBy = query.get('sortBy') as string;
    const sortDir = (query.get('sortDir') as 'asc' | 'desc') || 'asc';
    const limit = query.get('limit') ? Number(query.get('limit')) : undefined;
    const offset = query.get('offset') ? Number(query.get('offset')) : undefined;
    const status = query.get('status') as UIDriverInvoiceStatus;

    if ((limit == null) !== (offset == null)) {
        return NextResponse.json({ code: 400, errors: [{ message: 'Limit and Offset must be set together' }] });
    }

    if ((limit && isNaN(limit)) || (offset && isNaN(offset))) {
        return NextResponse.json({ code: 400, errors: [{ message: 'Invalid limit or offset' }] });
    }

    const total = await prisma.driverInvoice.count({
        where: buildWhere(session, status),
    });

    const metadata = calcPaginationMetadata({ total, limit, offset });

    const invoices = await prisma.driverInvoice.findMany({
        where: buildWhere(session, status as UIDriverInvoiceStatus),
        orderBy: buildOrderBy(sortBy, sortDir) || { createdAt: 'desc' },
        ...(limit ? { take: limit } : { take: 10 }),
        ...(offset ? { skip: offset } : { skip: 0 }),
        select: {
            id: true,
            invoiceNum: true,
            createdAt: true,
            status: true,
            driver: true,
            totalAmount: true,
            _count: {
                select: {
                    assignments: true,
                },
            },
            lineItems: {
                select: {
                    amount: true,
                },
            },
            assignments: {
                select: {
                    billedDistanceMiles: true,
                    billedDurationHours: true,
                    billedLoadRate: true,
                    emptyMiles: true,
                },
            },
        },
    });

    const simplifiedInvoices: SimplifiedDriverInvoice[] = invoices.map((invoice) => {
        return {
            id: invoice.id,
            invoiceNum: invoice.invoiceNum,
            createdAt: invoice.createdAt,
            status: invoice.status,
            driver: invoice.driver,
            assignmentCount: invoice._count.assignments,
            totalAmount: Number(invoice.totalAmount),
        };
    });

    return NextResponse.json({
        code: 200,
        data: { metadata, invoices: simplifiedInvoices },
    });
});

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;

    try {
        const body = await req.json();

        const {
            driverId,
            fromDate,
            toDate,
            status = DriverInvoiceStatus.PENDING,
            notes,
            invoiceNum,
            assignments = [],
            lineItems = [],
        } = body;

        const carrierId = session.user.defaultCarrierId;

        const driver = await prisma.driver.findUnique({ where: { id: driverId, carrierId: carrierId } });
        if (!driver) {
            return NextResponse.json({ code: 404, errors: [{ message: 'Driver not found' }] }, { status: 404 });
        }

        if (!driver.active) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [
                        { message: 'Cannot create invoices for inactive drivers. Please activate the driver first.' },
                    ],
                },
                { status: 400 },
            );
        }

        const checkForInvoiceNum = await prisma.driverInvoice.findFirst({
            where: {
                invoiceNum: invoiceNum,
                carrierId,
            },
        });

        if (checkForInvoiceNum) {
            return NextResponse.json(
                { code: 400, errors: [{ message: 'Invoice number already exists' }] },
                { status: 400 },
            );
        }

        const assignmentIds = assignments.map((a: any) => a.id);
        const existingAssignments = await prisma.driverAssignment.findMany({
            where: {
                id: { in: assignmentIds },
                carrierId,
            },
            select: { id: true },
        });

        if (existingAssignments.length !== assignmentIds.length) {
            return NextResponse.json(
                { code: 400, errors: [{ message: 'One or more assignments are invalid or unauthorized' }] },
                { status: 400 },
            );
        }

        const invoice = await prisma.driverInvoice.create({
            data: {
                driverId,
                carrierId,
                createdById: session.user.id,
                fromDate: new Date(fromDate),
                toDate: new Date(toDate),
                notes: notes || '',
                status,
                invoiceNum,
                totalAmount: new Prisma.Decimal(0),
                assignments: {
                    connect: assignmentIds.map((id: string) => ({ id })),
                },
            },
        });

        const updates = assignments.map((assignment: any) => {
            // Helper function to safely convert to Decimal or null
            const safeDecimal = (value: any): Prisma.Decimal | null => {
                if (
                    value === null ||
                    value === undefined ||
                    value === 'null' ||
                    value === 'undefined' ||
                    value === ''
                ) {
                    return null;
                }
                try {
                    return new Prisma.Decimal(value);
                } catch (error) {
                    console.warn(`Failed to convert value to Decimal: ${value}`, error);
                    return null;
                }
            };

            const data: Prisma.DriverAssignmentUpdateInput = {
                chargeType: assignment.chargeType,
                chargeValue: new Prisma.Decimal(assignment.chargeValue),
            };

            if (assignment.chargeType === 'PER_MILE') {
                // Only set to null if the value is undefined, null, or string representations of null
                data.billedDistanceMiles = safeDecimal(assignment.billedDistanceMiles);
            } else if (assignment.chargeType === 'PER_HOUR') {
                data.billedDurationHours = safeDecimal(assignment.billedDurationHours);
            } else if (assignment.chargeType === 'PERCENTAGE_OF_LOAD') {
                data.billedLoadRate = safeDecimal(assignment.billedLoadRate);
            }

            // Always update emptyMiles if provided
            if (assignment.emptyMiles !== undefined) {
                data.emptyMiles = safeDecimal(assignment.emptyMiles);
            }

            return prisma.driverAssignment.update({
                where: { id: assignment.id },
                data,
            });
        });

        const updatedAssignments = await prisma.$transaction(updates);

        // Calculate the total for the assignments using reduce with proper financial rounding
        const assignmentTotal = updatedAssignments.reduce((acc, a) => {
            // Check charge type and calculate the total accordingly
            if (!a.chargeValue) return acc;

            let calculatedAmount = new Prisma.Decimal(0);

            if (a.chargeType === 'FIXED_PAY') {
                calculatedAmount = a.chargeValue;
            } else if (a.chargeType === 'PERCENTAGE_OF_LOAD') {
                const loadRate = a.billedLoadRate || new Prisma.Decimal(0);
                const percentage = a.chargeValue.div(100);
                // Apply financial rounding: multiply first, then round to 2 decimal places
                calculatedAmount = loadRate.mul(percentage).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
            } else if (a.chargeType === 'PER_MILE') {
                // Calculate total miles including empty miles
                const baseMiles = a.billedDistanceMiles || new Prisma.Decimal(0);
                const emptyMiles = a.emptyMiles || new Prisma.Decimal(0);
                const totalMiles = baseMiles.add(emptyMiles);
                // Apply financial rounding: multiply first, then round to 2 decimal places
                calculatedAmount = totalMiles.mul(a.chargeValue).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
            } else if (a.chargeType === 'PER_HOUR') {
                const hours = a.billedDurationHours || new Prisma.Decimal(0);
                // Apply financial rounding: multiply first, then round to 2 decimal places
                calculatedAmount = hours.mul(a.chargeValue).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
            }

            // Add the calculated amount to the accumulator with proper rounding
            return acc.add(calculatedAmount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        }, new Prisma.Decimal(0));

        const lineItemCreates = lineItems.map((item: any) =>
            prisma.driverInvoiceLineItem.create({
                data: {
                    invoiceId: invoice.id,
                    driverId,
                    carrierId,
                    // Apply financial rounding to line item amounts
                    amount: new Prisma.Decimal(item.amount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
                    description: item.description,
                    chargeId: item.chargeId || null,
                },
            }),
        );

        const createdLineItems = await prisma.$transaction(lineItemCreates);

        // Calculate line items total with proper financial rounding
        const lineItemsTotal = createdLineItems.reduce((acc, item) => {
            return acc.add(item.amount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        }, new Prisma.Decimal(0));

        // Final total calculation with financial rounding
        const totalAmount = assignmentTotal.add(lineItemsTotal).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        await prisma.driverInvoice.update({
            where: { id: invoice.id },
            data: { totalAmount },
        });

        return NextResponse.json({ code: 200, data: { invoiceId: invoice.id } });
    } catch (error) {
        console.error('Error creating driver invoice:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Server error' }] }, { status: 500 });
    }
});
