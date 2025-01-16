import { Driver, LoadActivityAction, LoadDocument } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { deleteDocumentFromGCS } from 'lib/delete-doc-from-gcs';

export const DELETE = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const driverId = req.nextUrl.searchParams.get('driverId');
    let driver: Driver = null;

    if (driverId) {
        driver = await prisma.driver.findFirst({
            where: { id: driverId },
        });

        if (!driver) {
            return NextResponse.json({ code: 404, errors: [{ message: 'Driver not found' }] }, { status: 404 });
        }
    }

    const load = await prisma.load.findFirst({
        where: {
            id: req.nextUrl.searchParams.get('id'),
            ...(!driver && { carrierId: session.user.defaultCarrierId }),
            ...(driver && { driverAssignments: { some: { driverId: driver.id } } }),
        },
    });

    if (!load) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Load not found' }] }, { status: 404 });
    }

    const documentId = req.nextUrl.searchParams.get('did');
    const isPod = req.nextUrl.searchParams.get('isPod') === 'true';
    const isRatecon = req.nextUrl.searchParams.get('isRatecon') === 'true';

    const document = await prisma.loadDocument.findFirst({
        where: {
            id: documentId,
            ...(!(isPod || isRatecon) && { loadId: load.id }),
            ...(isPod && { loadIdForPodDoc: load.id }),
            ...(isRatecon && { loadIdForRatecon: load.id }),
            ...(driver && { driverId: driver.id }),
        },
    });

    if (!document) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Document not found' }] }, { status: 404 });
    }

    await deleteDocumentFromGCS(document);

    await prisma.loadDocument.delete({
        where: { id: documentId },
    });

    await prisma.loadActivity.create({
        data: {
            load: { connect: { id: load.id } },
            carrierId: load.carrierId,
            action: isPod ? LoadActivityAction.REMOVE_POD : LoadActivityAction.REMOVE_DOCUMENT,
            ...(!driver ? { actorUser: { connect: { id: session.user.id } } } : {}),
            ...(driverId ? { actorDriver: { connect: { id: driverId } } } : {}),
            ...(driver ? { actorDriverName: driver?.name } : {}),
            actionDocumentFileName: document.fileName,
        },
    });

    return NextResponse.json({ code: 200, data: { result: 'Document deleted' } }, { status: 200 });
});
