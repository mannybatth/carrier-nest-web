import { InvoiceStatus, Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Session } from 'next-auth';
import { getSession } from 'next-auth/react';
import { ExpandedInvoice, JSONResponse } from '../../interfaces/models';
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

const buildWhere = (session: Session, status: string): Prisma.InvoiceWhereInput => {
    const s = status || 'not_paid';
    const conditions: Prisma.InvoiceWhereInput = {
        userId: session?.user?.id,
    };

    // if (s === 'not_paid') {
    //     conditions.paid = false;
    // } else if (s === 'partially_paid') {
    //     conditions.paid = true;
    // } else if (s === 'overdue') {
    //     conditions.invoiced = true;
    // } else if (s === 'paid') {
    //     // do nothing
    // } else {
    //     throw new Error(`Unknown status: ${s}`);
    // }

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
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const session = await getSession({ req });

        const expand = req.query.expand as string;
        const expandLoad = expand?.includes('load');

        const status = req.query.status as string;

        const sortBy = req.query.sortBy as string;
        const sortDir = (req.query.sortDir as 'asc' | 'desc') || 'asc';

        const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;
        const offset = req.query.offset !== undefined ? Number(req.query.offset) : undefined;

        if (limit != null || offset != null) {
            if (limit == null || offset == null) {
                return res.status(400).send({
                    errors: [{ message: 'Limit and Offset must be set together' }],
                });
            }

            if (isNaN(limit) || isNaN(offset)) {
                return res.status(400).send({
                    errors: [{ message: 'Invalid limit or offset' }],
                });
            }
        }

        const total = await prisma.invoice.count({
            where: buildWhere(session, status),
        });

        const metadata = calcPaginationMetadata({ total, limit, offset });

        const invoices = await prisma.invoice.findMany({
            where: buildWhere(session, status),
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
        return res.status(200).json({
            data: { metadata, invoices },
        });
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
                data: { invoice },
            });
        } catch (error) {
            console.log('invoice post error', error);
            return res.status(400).json({
                errors: [{ message: error.message || JSON.stringify(error) }],
            });
        }
    }
}
