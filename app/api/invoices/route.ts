import { InvoiceStatus, Prisma } from '@prisma/client';
import { auth } from 'auth';
import { ExpandedInvoice, UIInvoiceStatus } from 'interfaces/models';
import { calcPaginationMetadata } from 'lib/pagination';
import prisma from 'lib/prisma';
import { Session } from 'next-auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

const buildOrderBy = (
    sortBy: string,
    sortDir: 'asc' | 'desc',
): Prisma.Enumerable<Prisma.InvoiceOrderByWithRelationInput> => {
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

const buildWhere = (session: Session, status?: UIInvoiceStatus): Prisma.InvoiceWhereInput => {
    const conditions: Prisma.InvoiceWhereInput = {
        carrierId: session.user.defaultCarrierId,
    };

    if (!status) {
        return conditions;
    }

    const invoiceStatus = (() => {
        switch (status) {
            case UIInvoiceStatus.NOT_PAID:
                return InvoiceStatus.NOT_PAID;
            case UIInvoiceStatus.PARTIALLY_PAID:
                return InvoiceStatus.PARTIALLY_PAID;
            case UIInvoiceStatus.PAID:
                return InvoiceStatus.PAID;
            default:
                return InvoiceStatus.NOT_PAID;
        }
    })();

    if (status !== UIInvoiceStatus.OVERDUE) {
        conditions.status = invoiceStatus;
    } else {
        conditions.dueDate = {
            lt: new Date(),
        };
        conditions.status = {
            in: [InvoiceStatus.NOT_PAID, InvoiceStatus.PARTIALLY_PAID],
        };
        conditions.dueNetDays = {
            gt: 0,
        };
    }

    return conditions;
};

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const query = req.nextUrl.searchParams;
    const expand = query.get('expand');
    const expandLoad = expand?.includes('load');
    const status = query.get('status') as string;
    const sortBy = query.get('sortBy') as string;
    const sortDir = (query.get('sortDir') as 'asc' | 'desc') || 'asc';
    const limit = query.get('limit') ? Number(query.get('limit')) : undefined;
    const offset = query.get('offset') ? Number(query.get('offset')) : undefined;

    if (limit != null || offset != null) {
        if (limit == null || offset == null) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Limit and Offset must be set together' }] });
        }

        if (isNaN(limit) || isNaN(offset)) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Invalid limit or offset' }] });
        }
    }

    const total = await prisma.invoice.count({
        where: buildWhere(session, status as UIInvoiceStatus),
    });

    const metadata = calcPaginationMetadata({ total, limit, offset });

    const invoices = await prisma.invoice.findMany({
        where: buildWhere(session, status as UIInvoiceStatus),
        orderBy: buildOrderBy(sortBy, sortDir) || { createdAt: 'desc' },
        ...(limit ? { take: limit } : { take: 10 }),
        ...(offset ? { skip: offset } : { skip: 0 }),
        include: {
            ...(expandLoad
                ? {
                      load: {
                          select: {
                              id: true,
                              refNum: true,
                              loadNum: true,
                              rate: true,
                              customer: true,
                          },
                      },
                  }
                : {}),
        },
    });

    return NextResponse.json({ code: 200, data: { metadata, invoices } });
});

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const session = req.auth;
        const invoiceData = (await req.json()) as ExpandedInvoice;

        const dueDate = new Date(invoiceData.invoicedAt);
        dueDate.setDate(dueDate.getDate() + invoiceData.dueNetDays);

        const invoice = await prisma.invoice.create({
            data: {
                status: 'NOT_PAID',
                invoiceNum: invoiceData.invoiceNum,
                totalAmount: invoiceData.totalAmount || 0,
                remainingAmount: invoiceData.remainingAmount || 0,
                invoicedAt: invoiceData.invoicedAt,
                dueDate,
                dueNetDays: invoiceData.dueNetDays || 0,
                user: { connect: { id: session.user.id } },
                carrier: { connect: { id: session.user.defaultCarrierId } },
                load: { connect: { id: invoiceData.loadId } },
                extraItems: { create: invoiceData.extraItems.map((extraItem) => ({ ...extraItem })) },
            },
        });

        return NextResponse.json({ code: 200, data: { invoice } });
    } catch (error) {
        console.error('invoice post error', error);
        return NextResponse.json({ code: 400, errors: [{ message: error.message || JSON.stringify(error) }] });
    }
});
