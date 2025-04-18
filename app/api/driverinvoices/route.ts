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

const invoicesJSON = {
    code: 200,
    data: {
        metadata: {
            total: 10,
            currentOffset: 0,
            currentLimit: 10,
        },
        invoices: [
            {
                id: 'inv_1',
                invoiceNum: 1001,
                createdAt: '2024-12-01T10:15:00Z',
                status: 'DRAFT',
                driver: {
                    id: 'drv_1',
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '+11234567890',
                    carrierId: 'carrier_1',
                    createdAt: '2023-10-01T09:00:00Z',
                    updatedAt: '2024-11-01T12:00:00Z',
                },
                assignmentCount: 3,
                totalAmount: 1850.0,
            },
            {
                id: 'inv_2',
                invoiceNum: 1002,
                createdAt: '2024-12-02T08:30:00Z',
                status: 'SENT',
                driver: {
                    id: 'drv_2',
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    phone: '+19876543210',
                    carrierId: 'carrier_1',
                    createdAt: '2023-11-15T08:00:00Z',
                    updatedAt: '2024-11-29T14:20:00Z',
                },
                assignmentCount: 2,
                totalAmount: 920.5,
            },
            {
                id: 'inv_3',
                invoiceNum: 1003,
                createdAt: '2024-12-03T11:45:00Z',
                status: 'PAID',
                driver: {
                    id: 'drv_3',
                    name: 'Carlos Mendoza',
                    email: 'carlos@example.com',
                    phone: '+14151234567',
                    carrierId: 'carrier_1',
                    createdAt: '2022-05-01T10:00:00Z',
                    updatedAt: '2024-11-10T17:00:00Z',
                },
                assignmentCount: 1,
                totalAmount: 650.0,
            },
            {
                id: 'inv_4',
                invoiceNum: 1004,
                createdAt: '2024-12-04T09:00:00Z',
                status: 'PARTIALLY_PAID',
                driver: {
                    id: 'drv_1',
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '+11234567890',
                    carrierId: 'carrier_1',
                    createdAt: '2023-10-01T09:00:00Z',
                    updatedAt: '2024-11-01T12:00:00Z',
                },
                assignmentCount: 2,
                totalAmount: 1175.75,
            },
            {
                id: 'inv_5',
                invoiceNum: 1005,
                createdAt: '2024-12-05T10:30:00Z',
                status: 'VOIDED',
                driver: {
                    id: 'drv_4',
                    name: 'Lena Nguyen',
                    email: 'lena@example.com',
                    phone: '+12025559876',
                    carrierId: 'carrier_1',
                    createdAt: '2023-08-12T13:45:00Z',
                    updatedAt: '2024-10-22T15:10:00Z',
                },
                assignmentCount: 1,
                totalAmount: 0,
            },
            {
                id: 'inv_6',
                invoiceNum: 1006,
                createdAt: '2024-12-06T08:00:00Z',
                status: 'SENT',
                driver: {
                    id: 'drv_5',
                    name: 'Ahmed Khan',
                    email: 'ahmed@example.com',
                    phone: '+12125556677',
                    carrierId: 'carrier_1',
                    createdAt: '2023-12-20T12:00:00Z',
                    updatedAt: '2024-11-30T18:45:00Z',
                },
                assignmentCount: 4,
                totalAmount: 2120.0,
            },
            {
                id: 'inv_7',
                invoiceNum: 1007,
                createdAt: '2024-12-07T13:20:00Z',
                status: 'DRAFT',
                driver: {
                    id: 'drv_6',
                    name: 'Emily Taylor',
                    email: 'emily@example.com',
                    phone: '+15145552323',
                    carrierId: 'carrier_1',
                    createdAt: '2024-01-03T09:45:00Z',
                    updatedAt: '2024-11-05T08:30:00Z',
                },
                assignmentCount: 2,
                totalAmount: 1080.0,
            },
            {
                id: 'inv_8',
                invoiceNum: 1008,
                createdAt: '2024-12-08T14:00:00Z',
                status: 'PAID',
                driver: {
                    id: 'drv_2',
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    phone: '+19876543210',
                    carrierId: 'carrier_1',
                    createdAt: '2023-11-15T08:00:00Z',
                    updatedAt: '2024-11-29T14:20:00Z',
                },
                assignmentCount: 3,
                totalAmount: 1435.0,
            },
            {
                id: 'inv_9',
                invoiceNum: 1009,
                createdAt: '2024-12-09T11:10:00Z',
                status: 'PARTIALLY_PAID',
                driver: {
                    id: 'drv_5',
                    name: 'Ahmed Khan',
                    email: 'ahmed@example.com',
                    phone: '+12125556677',
                    carrierId: 'carrier_1',
                    createdAt: '2023-12-20T12:00:00Z',
                    updatedAt: '2024-11-30T18:45:00Z',
                },
                assignmentCount: 1,
                totalAmount: 850.25,
            },
            {
                id: 'inv_10',
                invoiceNum: 1010,
                createdAt: '2024-12-10T15:35:00Z',
                status: 'SENT',
                driver: {
                    id: 'drv_3',
                    name: 'Carlos Mendoza',
                    email: 'carlos@example.com',
                    phone: '+14151234567',
                    carrierId: 'carrier_1',
                    createdAt: '2022-05-01T10:00:00Z',
                    updatedAt: '2024-11-10T17:00:00Z',
                },
                assignmentCount: 3,
                totalAmount: 1795.6,
            },
        ],
    },
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
            const data: Prisma.DriverAssignmentUpdateInput = {
                chargeType: assignment.chargeType,
                chargeValue: new Prisma.Decimal(assignment.chargeValue),
            };

            if (assignment.chargeType === 'PER_MILE') {
                data.billedDistanceMiles = new Prisma.Decimal(assignment.billedDistanceMiles || 0);
            } else if (assignment.chargeType === 'PER_HOUR') {
                data.billedDurationHours = new Prisma.Decimal(assignment.billedDurationHours || 0);
            } else if (assignment.chargeType === 'PERCENTAGE_OF_LOAD') {
                data.billedLoadRate = new Prisma.Decimal(assignment.billedLoadRate || 0);
            }

            return prisma.driverAssignment.update({
                where: { id: assignment.id },
                data,
            });
        });

        const updatedAssignments = await prisma.$transaction(updates);

        // Calculate the total for the assignments using reduce
        const assignmentTotal = updatedAssignments.reduce((acc, a) => {
            // Check charge type and calculate the total accordingly
            if (!a.chargeValue) return acc;
            if (a.chargeType === 'FIXED_PAY') {
                return acc.add(a.chargeValue);
            }
            if (a.chargeType === 'PERCENTAGE_OF_LOAD') {
                const loadRate = a.billedLoadRate || new Prisma.Decimal(0);
                const percentage = a.chargeValue.div(100);
                return acc.add(loadRate.mul(percentage));
            }
            if (a.chargeType === 'PER_MILE') {
                return acc.add(a.billedDistanceMiles.mul(a.chargeValue));
            }
            if (a.chargeType === 'PER_HOUR') {
                return acc.add(a.billedDurationHours.mul(a.chargeValue));
            }
            // Default case if charge type is not recognized
            return acc;
        }, new Prisma.Decimal(0));

        const lineItemCreates = lineItems.map((item: any) =>
            prisma.driverInvoiceLineItem.create({
                data: {
                    invoiceId: invoice.id,
                    driverId,
                    carrierId,
                    amount: new Prisma.Decimal(item.amount),
                    description: item.description,
                    chargeId: item.chargeId || null,
                },
            }),
        );

        const createdLineItems = await prisma.$transaction(lineItemCreates);

        const lineItemsTotal = createdLineItems.reduce((acc, item) => acc.add(item.amount), new Prisma.Decimal(0));

        const totalAmount = assignmentTotal.add(lineItemsTotal);

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
