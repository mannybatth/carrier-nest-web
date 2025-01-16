import { LoadStopType } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { exclude, ExpandedLoad, JSONResponse } from 'interfaces/models';
import { deleteDocumentFromGCS } from 'lib/delete-doc-from-gcs';
import { Session } from 'next-auth';

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
        create: { ...loadData.shipper, user: { connect: { id: session.user.id } } },
        update: { ...loadData.shipper, user: { connect: { id: session.user.id } } },
    });

    const loadReceiver = await prisma.loadStop.upsert({
        where: { id: loadData.receiver.id },
        create: { ...loadData.receiver, user: { connect: { id: session.user.id } } },
        update: { ...loadData.receiver, user: { connect: { id: session.user.id } } },
    });

    const updatedLoad = await prisma.load.update({
        where: { id: loadId },
        data: {
            ...loadData,
            carrier: { connect: { id: session.user.defaultCarrierId } },
            customer: { connect: { id: loadData.customer.id } },
            shipper: { connect: { id: loadShipper.id } },
            receiver: { connect: { id: loadReceiver.id } },
            stops: {
                deleteMany: { type: { equals: LoadStopType.STOP } },
                create: loadData.stops.map((stop) => ({ ...stop, user: { connect: { id: session.user.id } } })),
            },
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
            ...(expandShipper ? { shipper: true } : {}),
            ...(expandReceiver ? { receiver: true } : {}),
            ...(expandStops ? { stops: { orderBy: { stopIndex: 'asc' } } } : {}),
            ...(expandDriverAssignments ? { driverAssignments: { include: { driver: true } } } : {}),
            ...(expandDocuments ? { loadDocuments: true, rateconDocument: true, podDocuments: true } : {}),
            ...(expandRoute ? { route: true } : {}),
        },
    });

    if (!load) {
        return { code: 404, errors: [{ message: 'Load not found' }] };
    }

    if (driverId) {
        const loadWithoutRate = exclude(load, ['rate']);
        return { code: 200, data: { load: loadWithoutRate } };
    } else {
        return { code: 200, data: { load } };
    }
};
