import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ExpandedLoad, JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'PUT':
            return _put();
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).send({
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const session = await getSession({ req });

        const expand = req.query.expand as string;
        const expandCustomer = expand?.includes('customer');
        const expandShipper = expand?.includes('shipper');
        const expandReceiver = expand?.includes('receiver');
        const expandStops = expand?.includes('stops');
        const expandInvoice = expand?.includes('invoice');
        const expandDriver = expand?.includes('driver');
        const expandDocuments = expand?.includes('documents');

        const load = await prisma.load.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session?.user?.id,
            },
            include: {
                ...(expandCustomer ? { customer: { select: { id: true, name: true } } } : {}),
                ...(expandInvoice
                    ? {
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
                      }
                    : {}),
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
                              orderBy: {
                                  stopIndex: 'asc',
                              },
                          },
                      }
                    : {}),
                ...(expandDriver
                    ? {
                          driver: {
                              select: {
                                  id: true,
                                  name: true,
                                  phone: true,
                                  email: true,
                              },
                          },
                      }
                    : {}),
                ...(expandDocuments
                    ? {
                          loadDocuments: {
                              select: {
                                  id: true,
                                  fileUrl: true,
                                  fileName: true,
                                  fileType: true,
                                  fileSize: true,
                                  createdAt: true,
                              },
                              orderBy: {
                                  createdAt: 'desc',
                              },
                          },
                      }
                    : {}),
            },
        });
        return res.status(200).json({
            data: { load },
        });
    }

    async function _put() {
        const session = await getSession({ req });

        const load = await prisma.load.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session?.user?.id,
            },
        });

        if (!load) {
            return res.status(404).send({
                errors: [{ message: 'Load not found' }],
            });
        }

        const loadData = req.body as ExpandedLoad;

        console.log('load to update', loadData);

        const updatedLoad = await prisma.load.update({
            where: {
                id: Number(req.query.id),
            },
            data: {
                refNum: loadData.refNum || '',
                rate: loadData.rate || 0,
                distance: loadData.distance || 0,
                distanceUnit: loadData.distanceUnit || '',
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
                    update: {
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
                    update: {
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
                    deleteMany: {},
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
            data: { updatedLoad },
        });
    }

    async function _delete() {
        const session = await getSession({ req });

        const load = await prisma.load.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session?.user?.id,
            },
        });

        if (!load) {
            return res.status(404).send({
                errors: [{ message: 'Load not found' }],
            });
        }

        await prisma.load.delete({
            where: {
                id: Number(req.query.id),
            },
        });

        return res.status(200).send({
            data: { result: 'Load deleted' },
        });
    }
}
