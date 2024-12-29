import { Load, LoadStopType } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Session, getServerSession } from 'next-auth';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedLoad, JSONResponse, exclude } from '../../../../interfaces/models';
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
        const tokenCarrierId = session?.user?.carrierId || session?.user?.defaultCarrierId;

        if (!session || !tokenCarrierId) {
            return res.status(401).send({
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            });
        }

        const response = await getLoad({ session, tokenCarrierId, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _put() {
        const session = await getServerSession(req, res, authOptions);
        const tokenCarrierId = session?.user?.defaultCarrierId;

        if (!session || !tokenCarrierId) {
            return res.status(401).send({
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            });
        }

        const load = await prisma.load.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: tokenCarrierId,
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
                poNumbers: loadData.shipper.poNumbers || '',
                pickUpNumbers: loadData.shipper.pickUpNumbers || '',
                referenceNumbers: loadData.shipper.referenceNumbers || '',
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
                poNumbers: loadData.shipper.poNumbers || '',
                pickUpNumbers: loadData.shipper.pickUpNumbers || '',
                referenceNumbers: loadData.shipper.referenceNumbers || '',
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
                poNumbers: loadData.receiver.poNumbers || '',
                pickUpNumbers: loadData.receiver.pickUpNumbers || '',
                referenceNumbers: loadData.receiver.referenceNumbers || '',
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
                poNumbers: loadData.receiver.poNumbers || '',
                pickUpNumbers: loadData.receiver.pickUpNumbers || '',
                referenceNumbers: loadData.receiver.referenceNumbers || '',
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
                    deleteMany: { type: { equals: LoadStopType.STOP } },
                    create: (loadData.stops || []).map((stop) => ({
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
                        longitude: stop.longitude,
                        latitude: stop.latitude,
                        poNumbers: stop.poNumbers || '',
                        pickUpNumbers: stop.pickUpNumbers || '',
                        referenceNumbers: stop.referenceNumbers || '',
                        user: {
                            connect: {
                                id: session.user.id,
                            },
                        },
                    })),
                },
                routeEncoded: loadData.routeEncoded || '',
                routeDistance: loadData.routeDistance || 0,
                routeDuration: loadData.routeDuration || 0,
            },
        });

        return res.status(200).json({
            code: 200,
            data: { updatedLoad },
        });
    }

    async function _delete() {
        const session = await getServerSession(req, res, authOptions);
        const tokenCarrierId = session?.user?.defaultCarrierId;

        if (!session || !tokenCarrierId) {
            return res.status(401).send({
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            });
        }

        const load = await prisma.load.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: tokenCarrierId,
            },
            include: {
                loadDocuments: true,
                podDocuments: true,
                rateconDocument: true,
            },
        });

        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const documentsToDelete = [
            ...(load.loadDocuments || []),
            ...(load.podDocuments || []),
            ...(load.rateconDocument ? [load.rateconDocument] : []),
        ];
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

const getLoad = async ({
    session,
    tokenCarrierId,
    query,
}: {
    session?: Session;
    tokenCarrierId?: string;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ load: ExpandedLoad }>> => {
    const driverId = query.driverId as string;
    const expand = query.expand as string;
    const expandCustomer = expand?.includes('customer');
    const expandShipper = expand?.includes('shipper');
    const expandReceiver = expand?.includes('receiver');
    const expandStops = expand?.includes('stops');
    const expandInvoice = expand?.includes('invoice');
    const expandDriverAssignments = expand?.includes('driverAssignments');
    const expandDocuments = expand?.includes('documents');
    const expandCarrier = expand?.includes('carrier');
    const expandRoute = expand?.includes('route');

    const load = await prisma.load.findFirst({
        where: {
            id: String(query.id),
            carrierId: session?.user?.defaultCarrierId || tokenCarrierId,
            ...(driverId ? { driverAssignments: { some: { driverId: driverId } } } : null),
        },
        include: {
            ...(expandCustomer ? { customer: true } : {}),
            ...(expandCarrier ? { carrier: true } : {}),
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
                              poNumbers: true,
                              pickUpNumbers: true,
                              referenceNumbers: true,
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
                              poNumbers: true,
                              pickUpNumbers: true,
                              referenceNumbers: true,
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
                              poNumbers: true,
                              pickUpNumbers: true,
                              referenceNumbers: true,
                          },
                      },
                  }
                : {}),
            ...(expandDriverAssignments
                ? {
                      driverAssignments: {
                          select: {
                              id: true,
                              assignedAt: true,
                              driver: {
                                  select: {
                                      id: true,
                                      name: true,
                                      email: true,
                                      phone: true,
                                  },
                              },
                              chargeType: true,
                              chargeValue: true,
                          },
                      },
                  }
                : {}),
            ...(expandDocuments
                ? {
                      loadDocuments: {
                          orderBy: {
                              createdAt: 'desc',
                          },
                      },
                      rateconDocument: true,
                      podDocuments: {
                          orderBy: {
                              createdAt: 'desc',
                          },
                      },
                  }
                : {}),
            ...(expandRoute
                ? {
                      route: {
                          select: {
                              id: true,
                              loadId: true,
                              routeLegs: {
                                  orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
                                  select: {
                                      id: true,
                                      driverInstructions: true,
                                      locations: { select: { id: true, loadStop: true, location: true } },
                                      scheduledDate: true,
                                      scheduledTime: true,
                                      startedAt: true,
                                      startLatitude: true,
                                      startLongitude: true,
                                      createdAt: true,
                                      endedAt: true,
                                      endLatitude: true,
                                      endLongitude: true,
                                      routeLegDistance: true,
                                      routeLegDuration: true,
                                      status: true,
                                      routeId: true,
                                      driverAssignments: {
                                          select: {
                                              id: true,
                                              assignedAt: true,
                                              driver: {
                                                  select: {
                                                      id: true,
                                                      name: true,
                                                      email: true,
                                                      phone: true,
                                                  },
                                              },
                                              chargeType: true,
                                              chargeValue: true,
                                          },
                                      },
                                  },
                              },
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

    if (driverId) {
        const loadWithoutRate = exclude(load, ['rate']);

        return {
            code: 200,
            data: { load: loadWithoutRate as Omit<Load, 'rate'> },
        };
    } else {
        return {
            code: 200,
            data: { load: load as Load },
        };
    }
};
