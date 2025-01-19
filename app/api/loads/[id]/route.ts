import { Load, LoadStopType } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { exclude, ExpandedLoad, JSONResponse } from 'interfaces/models';
import { deleteDocumentFromGCS } from 'lib/delete-doc-from-gcs';
import { Session } from 'next-auth';
import 'polyfills';

export const GET = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const session = req.auth;
    const tokenCarrierId = session?.user?.carrierId || session?.user?.defaultCarrierId;

    const loadId = context.params.id;

    if (!session || !tokenCarrierId) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    const response = await getLoad({ session, tokenCarrierId, query: req.nextUrl.searchParams, loadId });
    return NextResponse.json(response, { status: response.code });
});

export const PUT = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const session = req.auth;
    const tokenCarrierId = session?.user?.defaultCarrierId;

    if (!session || !tokenCarrierId) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    const loadId = context.params.id;

    const load = await prisma.load.findFirst({
        where: {
            id: loadId,
            carrierId: tokenCarrierId,
        },
    });

    if (!load) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Load not found' }] }, { status: 404 });
    }

    const loadData = await req.json();

    const loadShipper = await prisma.loadStop.upsert({
        where: { id: loadData.shipper.id },
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
            user: { connect: { id: session.user.id } },
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
            user: { connect: { id: session.user.id } },
        },
    });

    const loadReceiver = await prisma.loadStop.upsert({
        where: { id: loadData.receiver.id },
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
            user: { connect: { id: session.user.id } },
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
            user: { connect: { id: session.user.id } },
        },
    });

    const updatedLoad = await prisma.load.update({
        where: { id: loadId },
        data: {
            refNum: loadData.refNum || '',
            rate: loadData.rate || 0,
            carrier: { connect: { id: session.user.defaultCarrierId } },
            customer: { connect: { id: loadData.customer.id } },
            shipper: { connect: { id: loadShipper.id } },
            receiver: { connect: { id: loadReceiver.id } },
            stops: {
                deleteMany: { type: { equals: LoadStopType.STOP } },
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
                    longitude: stop.longitude,
                    latitude: stop.latitude,
                    poNumbers: stop.poNumbers || '',
                    pickUpNumbers: stop.pickUpNumbers || '',
                    referenceNumbers: stop.referenceNumbers || '',
                    user: { connect: { id: session.user.id } },
                })),
            },
            routeEncoded: loadData.routeEncoded || '',
            routeDistanceMiles: loadData.routeDistanceMiles || 0,
            routeDurationHours: loadData.routeDurationHours || 0,
        },
    });

    return NextResponse.json({ code: 200, data: { updatedLoad } }, { status: 200 });
});

export const DELETE = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const session = req.auth;
    const tokenCarrierId = session?.user?.defaultCarrierId;

    if (!session || !tokenCarrierId) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    const loadId = context.params.id;

    const load = await prisma.load.findFirst({
        where: {
            id: loadId,
            carrierId: tokenCarrierId,
        },
        include: {
            loadDocuments: true,
            podDocuments: true,
            rateconDocument: true,
        },
    });

    if (!load) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Load not found' }] }, { status: 404 });
    }

    const documentsToDelete = [
        ...(load.loadDocuments || []),
        ...(load.podDocuments || []),
        ...(load.rateconDocument ? [load.rateconDocument] : []),
    ];
    await Promise.all(documentsToDelete.map((document) => deleteDocumentFromGCS(document)));

    await prisma.load.delete({
        where: { id: loadId },
    });

    return NextResponse.json({ code: 200, data: { result: 'Load deleted' } }, { status: 200 });
});

const getLoad = async ({
    session,
    tokenCarrierId,
    query,
    loadId,
}: {
    session?: Session;
    tokenCarrierId?: string;
    query: URLSearchParams;
    loadId: string;
}): Promise<JSONResponse<{ load: ExpandedLoad }>> => {
    const driverId = query.get('driverId');
    const expand = query.get('expand')?.split(',') || [];
    const expandCustomer = expand.includes('customer');
    const expandShipper = expand.includes('shipper');
    const expandReceiver = expand.includes('receiver');
    const expandStops = expand.includes('stops');
    const expandInvoice = expand.includes('invoice');
    const expandDriverAssignments = expand.includes('driverAssignments');
    const expandDocuments = expand.includes('documents');
    const expandCarrier = expand.includes('carrier');
    const expandRoute = expand.includes('route');

    const load = await prisma.load.findFirst({
        where: {
            id: loadId,
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
                                      distanceMiles: true,
                                      durationHours: true,
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
        return { code: 404, errors: [{ message: 'Load not found' }] };
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
