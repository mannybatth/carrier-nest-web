import { IncomingMessage } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedLoad, JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';
import { deleteDocumentFromS3 } from './documents/[did]';

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
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const response = await getLoad({ req, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _put() {
        const session = await getSession({ req });

        const load = await prisma.load.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session.user.id,
            },
        });

        if (!load) {
            return res.status(404).send({
                code: 404,
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
            code: 200,
            data: { updatedLoad },
        });
    }

    async function _delete() {
        const session = await getSession({ req });

        const load = await prisma.load.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session.user.id,
            },
            include: {
                loadDocuments: true,
            },
        });

        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const documentsToDelete = load.loadDocuments;
        await Promise.all(documentsToDelete.map((document) => deleteDocumentFromS3(document)));

        await prisma.load.delete({
            where: {
                id: Number(req.query.id),
            },
        });

        return res.status(200).send({
            code: 200,
            data: { result: 'Load deleted' },
        });
    }
}

export const getLoad = async ({
    req,
    query,
}: {
    req: IncomingMessage;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ load: ExpandedLoad }>> => {
    const session = await getSession({ req });

    const expand = query.expand as string;
    const expandCustomer = expand?.includes('customer');
    const expandShipper = expand?.includes('shipper');
    const expandReceiver = expand?.includes('receiver');
    const expandStops = expand?.includes('stops');
    const expandInvoice = expand?.includes('invoice');
    const expandDriver = expand?.includes('driver');
    const expandDocuments = expand?.includes('documents');

    const load = await prisma.load.findFirst({
        where: {
            id: Number(query.id),
            userId: session.user.id,
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
                              longitude: true,
                              latitude: true,
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
                              longitude: true,
                              latitude: true,
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
    return {
        code: 200,
        data: { load },
    };
};
