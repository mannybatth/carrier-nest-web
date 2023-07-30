import { Load, LoadStatus, Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedLoad, JSONResponse } from '../../interfaces/models';
import { PaginationMetadata } from '../../interfaces/table';
import { calcPaginationMetadata } from '../../lib/pagination';
import prisma from '../../lib/prisma';
import { authOptions } from './auth/[...nextauth]';

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
        const response = await getLoads({ req, res, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _post() {
        const response = await postLoads({ req, res });
        return res.status(response.code).json(response);
    }
}

export const getLoads = async ({
    req,
    res,
    query,
}: {
    req: NextApiRequest;
    res: NextApiResponse<JSONResponse<any>>;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ loads: Partial<ExpandedLoad[]>; metadata: PaginationMetadata }>> => {
    const session = await getServerSession(req, res, authOptions);

    const expand = query.expand as string;
    const expandCustomer = expand?.includes('customer');
    const expandShipper = expand?.includes('shipper');
    const expandReceiver = expand?.includes('receiver');
    const expandDriver = expand?.includes('driver');
    const expandStops = expand?.includes('stops');

    const sortBy = query.sortBy as string;
    const sortDir = (query.sortDir as 'asc' | 'desc') || 'asc';

    const customerId = query.customerId !== undefined ? String(query.customerId) : undefined;
    const driverId = query.driverId !== undefined ? String(query.driverId) : undefined;
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
            carrierId: session.user.defaultCarrierId,
            ...(customerId ? { customerId } : null),
            ...(driverId ? { driverId } : null),
            ...(currentOnly ? { invoice: null } : {}),
        },
    });

    const metadata = calcPaginationMetadata({ total, limit, offset });

    const loads = await prisma.load.findMany({
        where: {
            carrierId: session.user.defaultCarrierId,
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
            podDocuments: true,
            invoice: {
                select: {
                    id: true,
                    status: true,
                    totalAmount: true,
                    invoiceNum: true,
                    invoicedAt: true,
                    dueDate: true,
                    dueNetDays: true,
                    paidAmount: true,
                    remainingAmount: true,
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
                              stopIndex: true,
                              longitude: true,
                              latitude: true,
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
                              stopIndex: true,
                              longitude: true,
                              latitude: true,
                          },
                      },
                  }
                : {}),
            ...(expandDriver
                ? {
                      drivers: {
                          select: {
                              id: true,
                              name: true,
                          },
                      },
                  }
                : {}),
            ...(expandStops
                ? {
                      stops: {
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
                              stopIndex: true,
                              longitude: true,
                              latitude: true,
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

export const postLoads = async ({
    req,
    res,
}: {
    req: NextApiRequest;
    res: NextApiResponse<JSONResponse<any>>;
}): Promise<JSONResponse<{ load: Load }>> => {
    try {
        const session = await getServerSession(req, res, authOptions);
        const loadData = req.body as ExpandedLoad;

        const load = await prisma.load.create({
            data: {
                refNum: loadData.refNum || '',
                rate: loadData.rate || 0,
                distance: loadData.distance || 0,
                status: LoadStatus.CREATED,
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
                customer: {
                    connect: {
                        id: loadData.customer.id,
                    },
                },
                shipper: {
                    create: {
                        type: loadData.shipper.type,
                        name: loadData.shipper.name,
                        street: loadData.shipper.street || '',
                        city: loadData.shipper.city || '',
                        state: loadData.shipper.state || '',
                        zip: loadData.shipper.zip || '',
                        country: loadData.shipper.country || '',
                        date: loadData.shipper.date || '',
                        time: loadData.shipper.time || '',
                        stopIndex: loadData.shipper.stopIndex || 0,
                        longitude: loadData.shipper.longitude || 0,
                        latitude: loadData.shipper.latitude || 0,
                        user: {
                            connect: {
                                id: session.user.id,
                            },
                        },
                    },
                },
                receiver: {
                    create: {
                        type: loadData.receiver.type,
                        name: loadData.receiver.name,
                        street: loadData.receiver.street || '',
                        city: loadData.receiver.city || '',
                        state: loadData.receiver.state || '',
                        zip: loadData.receiver.zip || '',
                        country: loadData.receiver.country || '',
                        date: loadData.receiver.date || '',
                        time: loadData.receiver.time || '',
                        stopIndex: loadData.receiver.stopIndex || 0,
                        longitude: loadData.receiver.longitude || 0,
                        latitude: loadData.receiver.latitude || 0,
                        user: {
                            connect: {
                                id: session.user.id,
                            },
                        },
                    },
                },
                stops: {
                    create: loadData.stops.map((stop) => ({
                        type: stop.type,
                        name: stop.name,
                        street: stop.street || '',
                        city: stop.city || '',
                        state: stop.state || '',
                        zip: stop.zip || '',
                        country: stop.country || '',
                        date: stop.date || '',
                        time: stop.time || '',
                        stopIndex: stop.stopIndex || 0,
                        longitude: stop.longitude || 0,
                        latitude: stop.latitude || 0,
                        user: {
                            connect: {
                                id: session.user.id,
                            },
                        },
                    })),
                },
                routeEncoded: loadData.routeEncoded || '',
                ...(loadData.rateconDocument
                    ? {
                          rateconDocument: {
                              create: {
                                  fileKey: loadData.rateconDocument.fileKey || '',
                                  fileUrl: loadData.rateconDocument.fileUrl || '',
                                  fileName: loadData.rateconDocument.fileName || '',
                                  fileType: loadData.rateconDocument.fileType || '',
                                  fileSize: loadData.rateconDocument.fileSize || 0,
                                  user: {
                                      connect: {
                                          id: session.user.id,
                                      },
                                  },
                              },
                          },
                      }
                    : {}),
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
