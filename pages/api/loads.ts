import { Load, Prisma } from '@prisma/client';
import { IncomingMessage } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedLoad, JSONResponse, PaginationMetadata } from '../../interfaces/models';
import { calcPaginationMetadata } from '../../lib/pagination';
import prisma from '../../lib/prisma';

const buildOrderBy = (
    sortBy: string,
    sortDir: 'asc' | 'desc',
): Prisma.Enumerable<Prisma.LoadOrderByWithRelationAndSearchRelevanceInput> => {
    if (sortBy === 'status') {
        return [
            {
                invoice: {
                    lastPaymentAt: sortDir,
                },
            },
            {
                invoice: {
                    id: sortDir,
                },
            },
            {
                receiver: {
                    date: sortDir,
                },
            },
        ];
    }
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
        const response = await getLoads({ req, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _post() {
        const response = await postLoads({ req });
        return res.status(response.code).json(response);
    }
}

export const getLoads = async ({
    req,
    query,
}: {
    req: IncomingMessage;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ loads: ExpandedLoad[]; metadata: PaginationMetadata }>> => {
    const session = await getSession({ req });

    const expand = query.expand as string;
    const expandCustomer = expand?.includes('customer');
    const expandShipper = expand?.includes('shipper');
    const expandReceiver = expand?.includes('receiver');

    const sortBy = query.sortBy as string;
    const sortDir = (query.sortDir as 'asc' | 'desc') || 'asc';

    const customerId = query.customerId !== undefined ? Number(query.customerId) : undefined;
    const driverId = query.driverId !== undefined ? Number(query.driverId) : undefined;
    const limit = query.limit !== undefined ? Number(query.limit) : undefined;
    const offset = query.offset !== undefined ? Number(query.offset) : undefined;

    const currentOnly = query.currentOnly === '1';

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

    const total = await prisma.load.count({
        where: {
            userId: session.user.id,
            ...(customerId ? { customerId } : null),
            ...(driverId ? { driverId } : null),
            ...(currentOnly ? { invoice: null } : {}),
        },
    });

    const metadata = calcPaginationMetadata({ total, limit, offset });

    const loads = await prisma.load.findMany({
        where: {
            userId: session.user.id,
            ...(customerId ? { customerId } : null),
            ...(driverId ? { driverId } : null),
            ...(currentOnly ? { invoice: null } : {}),
        },
        orderBy: buildOrderBy(sortBy, sortDir) || {
            createdAt: 'desc',
        },
        ...(limit ? { take: limit } : { take: 10 }),
        ...(offset ? { skip: offset } : { skip: 0 }),
        include: {
            invoice: {
                select: {
                    id: true,
                    status: true,
                    totalAmount: true,
                    invoicedAt: true,
                    dueDate: true,
                    dueNetDays: true,
                    paidAmount: true,
                    lastPaymentAt: true,
                },
            },
            ...(expandCustomer ? { customer: { select: { id: true, name: true } } } : {}),
            ...(expandShipper
                ? {
                      shipper: {
                          select: {
                              id: true,
                              type: true,
                              name: true,
                              street: true,
                              city: true,
                              state: true,
                              zip: true,
                              country: true,
                              date: true,
                              time: true,
                          },
                      },
                  }
                : {}),
            ...(expandReceiver
                ? {
                      receiver: {
                          select: {
                              id: true,
                              type: true,
                              name: true,
                              street: true,
                              city: true,
                              state: true,
                              zip: true,
                              country: true,
                              date: true,
                              time: true,
                          },
                      },
                  }
                : {}),
        },
    });

    return {
        code: 200,
        data: { metadata, loads },
    };
};

export const postLoads = async ({ req }: { req: NextApiRequest }): Promise<JSONResponse<{ load: Load }>> => {
    try {
        const session = await getSession({ req });
        const loadData = req.body as ExpandedLoad;

        const load = await prisma.load.create({
            data: {
                refNum: loadData.refNum || '',
                rate: loadData.rate || 0,
                distance: loadData.distance || 0,
                distanceUnit: loadData.distanceUnit || '',
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
                customer: {
                    connect: {
                        id: loadData.customer.id,
                    },
                },
                shipper: {
                    create: {
                        ...loadData.shipper,
                        country: 'USA',
                        user: {
                            connect: {
                                id: session.user.id,
                            },
                        },
                    },
                },
                receiver: {
                    create: {
                        ...loadData.receiver,
                        country: 'USA',
                        user: {
                            connect: {
                                id: session.user.id,
                            },
                        },
                    },
                },
                stops: {
                    create: loadData.stops.map((stop) => ({
                        ...stop,
                        country: 'USA',
                        user: {
                            connect: {
                                id: session.user.id,
                            },
                        },
                    })),
                },
            },
        });
        return {
            code: 200,
            data: { load },
        };
    } catch (error) {
        console.log('load post error', error);
        return {
            code: 400,
            errors: [{ message: error.message || JSON.stringify(error) }],
        };
    }
};
