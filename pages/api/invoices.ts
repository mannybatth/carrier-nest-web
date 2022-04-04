import { Invoice, InvoiceStatus, Prisma } from '@prisma/client';
import { IncomingMessage } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Session } from 'next-auth';
import { getSession } from 'next-auth/react';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedInvoice, JSONResponse, PaginationMetadata, UIInvoiceStatus } from '../../interfaces/models';
import { calcPaginationMetadata } from '../../lib/pagination';
import prisma from '../../lib/prisma';

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

const buildWhere = (session: Session, status: UIInvoiceStatus): Prisma.InvoiceWhereInput => {
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

    const conditions: Prisma.InvoiceWhereInput = {
        userId: session.user.id,
    };

    if (status !== UIInvoiceStatus.OVERDUE) {
        conditions.status = invoiceStatus;
    }

    return conditions;
};

const buildOverdueRawQuery = ({
    session,
    limit,
    offset,
    expandLoad,
}: {
    session: Session;
    limit: number;
    offset: number;
    expandLoad: boolean;
}) => {
    return `
        SELECT
            invoices.*
        FROM invoices
        WHERE invoices.userId = ${session.user.id}
        AND invoices.status = ${InvoiceStatus.NOT_PAID}
        AND invoices.dueDate < NOW()
        GROUP BY invoices.id
        ORDER BY invoices.dueDate ASC
        LIMIT ${limit}
        OFFSET ${offset}
    `;
    // return `
    //     SELECT
    //         invoices.*
    //     FROM invoices
    //     LEFT JOIN payments ON invoices.id = payments.invoiceId
    //     WHERE invoices.userId = ${session.user.id}
    //     AND invoices.status = ${InvoiceStatus.NOT_PAID}
    //     AND invoices.dueDate < NOW()
    //     GROUP BY invoices.id
    //     ORDER BY invoices.dueDate ASC
    //     LIMIT ${limit}
    //     OFFSET ${offset}
    // `;
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
        const response = await getInvoices({ req, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _post() {
        try {
            const session = await getSession({ req });
            const invoiceData = req.body as ExpandedInvoice;

            const dueDate = new Date(invoiceData.invoicedAt);
            dueDate.setDate(dueDate.getDate() + invoiceData.dueNetDays);

            const invoice = await prisma.invoice.create({
                data: {
                    status: InvoiceStatus.NOT_PAID,
                    totalAmount: invoiceData.totalAmount || '',
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
                            id: session.user.carrierId,
                        },
                    },
                    load: {
                        connect: {
                            id: invoiceData.load.id,
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
    query,
}: {
    req: IncomingMessage;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ invoices: ExpandedInvoice[]; metadata: PaginationMetadata }>> => {
    const session = await getSession({ req });

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

    if (status === UIInvoiceStatus.OVERDUE) {
        invoices = await prisma.$queryRaw`${buildOverdueRawQuery({ session, limit, offset, expandLoad })}`;
    } else {
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
                                  distanceUnit: true,
                                  customer: true,
                              },
                          },
                      }
                    : {}),
            },
        });
    }
    return {
        code: 200,
        data: { metadata, invoices },
    };
};
