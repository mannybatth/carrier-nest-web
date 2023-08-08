import { Invoice, InvoiceStatus, Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, Session } from 'next-auth';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedInvoice, JSONResponse, UIInvoiceStatus } from '../../interfaces/models';
import { PaginationMetadata } from '../../interfaces/table';
import { calcPaginationMetadata } from '../../lib/pagination';
import prisma from '../../lib/prisma';
import { authOptions } from './auth/[...nextauth]';

const buildOrderBy = (
    sortBy: string,
    sortDir: 'asc' | 'desc',
): Prisma.Enumerable<Prisma.InvoiceOrderByWithRelationAndSearchRelevanceInput> => {
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

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'POST':
            return _post();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const response = await getInvoices({ req, res, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _post() {
        try {
            const session = await getServerSession(req, res, authOptions);
            const invoiceData = req.body as ExpandedInvoice;

            const dueDate = new Date(invoiceData.invoicedAt);
            dueDate.setDate(dueDate.getDate() + invoiceData.dueNetDays);

            const invoice = await prisma.invoice.create({
                data: {
                    status: InvoiceStatus.NOT_PAID,
                    invoiceNum: invoiceData.invoiceNum,
                    totalAmount: invoiceData.totalAmount || 0,
                    remainingAmount: invoiceData.remainingAmount || 0,
                    invoicedAt: invoiceData.invoicedAt,
                    dueDate,
                    dueNetDays: invoiceData.dueNetDays || 0,
                    user: {
                        connect: {
                            id: session.user.id,
                        },
                    },
                    carrier: {
                        connect: {
                            id: session.user.defaultCarrierId,
                        },
                    },
                    load: {
                        connect: {
                            id: invoiceData.loadId,
                        },
                    },
                    extraItems: {
                        create: invoiceData.extraItems.map((extraItem) => ({
                            ...extraItem,
                        })),
                    },
                },
            });
            return res.status(200).json({
                code: 200,
                data: { invoice },
            });
        } catch (error) {
            console.log('invoice post error', error);
            return res.status(400).json({
                code: 400,
                errors: [{ message: error.message || JSON.stringify(error) }],
            });
        }
    }
}

export const getInvoices = async ({
    req,
    res,
    query,
}: {
    req: NextApiRequest;
    res: NextApiResponse<JSONResponse<any>>;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ invoices: ExpandedInvoice[]; metadata: PaginationMetadata }>> => {
    const session = await getServerSession(req, res, authOptions);

    const expand = query.expand as string;
    const expandLoad = expand?.includes('load');

    const status = query.status as string;

    const sortBy = query.sortBy as string;
    const sortDir = (query.sortDir as 'asc' | 'desc') || 'asc';

    const limit = query.limit !== undefined ? Number(query.limit) : undefined;
    const offset = query.offset !== undefined ? Number(query.offset) : undefined;

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

    const total = await prisma.invoice.count({
        where: buildWhere(session, status as UIInvoiceStatus),
    });

    const metadata = calcPaginationMetadata({ total, limit, offset });

    let invoices: Invoice[] = [];

    console.log('session', session);

    invoices = await prisma.invoice.findMany({
        where: buildWhere(session, status as UIInvoiceStatus),
        orderBy: buildOrderBy(sortBy, sortDir) || {
            createdAt: 'desc',
        },
        ...(limit ? { take: limit } : { take: 10 }),
        ...(offset ? { skip: offset } : { skip: 0 }),
        include: {
            ...(expandLoad
                ? {
                      load: {
                          select: {
                              id: true,
                              refNum: true,
                              rate: true,
                              distance: true,
                              customer: true,
                          },
                      },
                  }
                : {}),
        },
    });
    return {
        code: 200,
        data: { metadata, invoices },
    };
};
