import type { NextApiRequest, NextApiResponse } from 'next';
import { Session, getServerSession } from 'next-auth';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedLoad, JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';
import { authOptions } from '../../auth/[...nextauth]';
import { deleteDocumentFromGCS } from './documents/[did]';

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
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
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

        const loadShipper = await prisma.loadStop.upsert({
            where: {
                id: loadData.shipper.id,
            },
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
                longitude: loadData.shipper.longitude,
                latitude: loadData.shipper.latitude,
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
                stopIndex: loadData.shipper.stopIndex || 0,
                longitude: loadData.shipper.longitude,
                latitude: loadData.shipper.latitude,
                user: {
                    connect: {
                        id: session.user.id,
                    },
                },
            },
        });

        const loadReceiver = await prisma.loadStop.upsert({
            where: {
                id: loadData.receiver.id,
            },
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
                longitude: loadData.receiver.longitude,
                latitude: loadData.receiver.latitude,
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
                stopIndex: loadData.receiver.stopIndex || 0,
                longitude: loadData.receiver.longitude,
                latitude: loadData.receiver.latitude,
                user: {
                    connect: {
                        id: session.user.id,
                    },
                },
            },
        });

        const updatedLoad = await prisma.load.update({
            where: {
                id: String(req.query.id),
            },
            data: {
                refNum: loadData.refNum || '',
                rate: loadData.rate || 0,
                distance: loadData.distance || 0,
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
                    connect: {
                        id: loadShipper.id,
                    },
                },
                receiver: {
                    connect: {
                        id: loadReceiver.id,
                    },
                },
                stops: {
                    deleteMany: {},
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
                        user: {
                            connect: {
                                id: session.user.id,
                            },
                        },
                    })),
                },
                routeEncoded: loadData.routeEncoded || '',
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
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
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
        await Promise.all(documentsToDelete.map((document) => deleteDocumentFromGCS(document)));

        await prisma.load.delete({
            where: {
                id: String(req.query.id),
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
            id: String(query.id),
            carrierId: session.user.defaultCarrierId,
        },
        include: {
            ...(expandCustomer ? { customer: true } : {}),
            ...(expandInvoice ? { invoice: true } : {}),
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
                              latitude: true,
                              longitude: true,
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
                              latitude: true,
                              longitude: true,
                          },
                      },
                  }
                : {}),
            ...(expandStops
                ? {
                      stops: {
                          orderBy: {
                              stopIndex: 'asc',
                          },
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
                              latitude: true,
                              longitude: true,
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
