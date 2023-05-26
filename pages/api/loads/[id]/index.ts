import type { NextApiRequest, NextApiResponse } from 'next';
import { Session, getServerSession } from 'next-auth';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedLoad, JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';
import { authOptions } from '../../auth/[...nextauth]';
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
        const session = await getServerSession(req, res, authOptions);
        const response = await getLoad({ session, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _put() {
        const session = await getServerSession(req, res, authOptions);

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
                    upsert: {
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
                            longitude: loadData.shipper.longitude || 0,
                            latitude: loadData.shipper.latitude || 0,
                            stopIndex: loadData.shipper.stopIndex || 0,
                            user: {
                                connect: {
                                    id: session.user.id,
                                },
                            },
                        },
                        update: {
                            type: loadData.shipper.type,
                            name: loadData.shipper.name,
                            street: loadData.shipper.street || '',
                            city: loadData.shipper.city || '',
                            state: loadData.shipper.state || '',
                            zip: loadData.shipper.zip || '',
                            country: loadData.shipper.country || '',
                            date: loadData.shipper.date || '',
                            time: loadData.shipper.time || '',
                            longitude: loadData.shipper.longitude || 0,
                            latitude: loadData.shipper.latitude || 0,
                            stopIndex: loadData.shipper.stopIndex || 0,
                            user: {
                                connect: {
                                    id: session.user.id,
                                },
                            },
                        },
                    },
                },
                receiver: {
                    upsert: {
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
                            longitude: loadData.receiver.longitude || 0,
                            latitude: loadData.receiver.latitude || 0,
                            stopIndex: loadData.receiver.stopIndex || 0,
                            user: {
                                connect: {
                                    id: session.user.id,
                                },
                            },
                        },
                        update: {
                            type: loadData.receiver.type,
                            name: loadData.receiver.name,
                            street: loadData.receiver.street || '',
                            city: loadData.receiver.city || '',
                            state: loadData.receiver.state || '',
                            zip: loadData.receiver.zip || '',
                            country: loadData.receiver.country || '',
                            date: loadData.receiver.date || '',
                            time: loadData.receiver.time || '',
                            longitude: loadData.receiver.longitude || 0,
                            latitude: loadData.receiver.latitude || 0,
                            stopIndex: loadData.receiver.stopIndex || 0,
                            user: {
                                connect: {
                                    id: session.user.id,
                                },
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
        const session = await getServerSession(req, res, authOptions);

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
    session,
    query,
}: {
    session?: Session;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ load: ExpandedLoad }>> => {
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
            ...(expandCustomer ? { customer: true } : {}),
            ...(expandInvoice ? { invoice: true } : {}),
            ...(expandShipper ? { shipper: true } : {}),
            ...(expandReceiver ? { receiver: true } : {}),
            ...(expandStops
                ? {
                      stops: {
                          orderBy: {
                              stopIndex: 'asc',
                          },
                      },
                  }
                : {}),
            ...(expandDriver ? { driver: true } : {}),
            ...(expandDocuments
                ? {
                      loadDocuments: {
                          orderBy: {
                              createdAt: 'desc',
                          },
                      },
                  }
                : {}),
        },
    });

    if (!load) {
        return {
            code: 404,
            errors: [{ message: 'Load not found' }],
        };
    }

    return {
        code: 200,
        data: { load },
    };
};
