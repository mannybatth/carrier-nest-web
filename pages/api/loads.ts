import { Load, LoadStopType } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ExpandedLoad } from '../../interfaces/models';
import prisma from '../../lib/prisma';

export default handler;

const buildOrderBy = (sortBy: string, sortDir: string) => {
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

function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'POST':
            return _post();
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    async function _get() {
        const session = await getSession({ req });

        const expand = req.query.expand as string;
        const expandCustomer = expand?.includes('customer');
        const expandShipper = expand?.includes('shipper');
        const expandReceiver = expand?.includes('receiver');
        const expandStops = expand?.includes('stops');

        const sortBy = req.query.sortBy as string;
        const sortDir = (req.query.sortDir as string) || 'asc';

        const loads = await prisma.load.findMany({
            where: {
                userId: session?.user?.id,
            },
            orderBy: buildOrderBy(sortBy, sortDir) || {
                createdAt: 'desc',
            },
            include: {
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
                              },
                          },
                      }
                    : {}),
            },
        });
        return res.status(200).json({
            data: loads,
        });
    }

    async function _post() {
        try {
            const session = await getSession({ req });
            const loadData = req.body as ExpandedLoad;

            const load = await prisma.load.create({
                data: {
                    refNum: loadData.refNum || '',
                    status: loadData.status || '',
                    rate: loadData.rate || 0,
                    distance: loadData.distance || 0,
                    distanceUnit: loadData.distanceUnit || '',
                    user: {
                        connect: {
                            id: session.user.id,
                        },
                    },
                    customer: {
                        connect: {
                            id: loadData.customer.id,
                        },
                    },
                    carrier: {
                        connect: {
                            id: session.user.carrierId,
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
            return res.status(200).json({
                data: load,
            });
        } catch (error) {
            console.log('load post error', error);
            return res.status(400).json({ message: error });
        }
    }

    function _delete() {
        return res.status(200).json({});
    }
}
