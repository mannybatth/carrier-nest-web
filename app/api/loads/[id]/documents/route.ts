import { Driver, LoadActivityAction, LoadDocument } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const driverId = body.driverId as string;
    let driver: Driver = null;

    if (driverId) {
        driver = await prisma.driver.findFirst({
            where: { id: driverId },
        });

        if (!driver) {
            return NextResponse.json({ code: 404, errors: [{ message: 'Driver not found' }] }, { status: 404 });
        }
    }

    const loadId = req.nextUrl.searchParams.get('id');
    const load = await prisma.load.findFirst({
        where: {
            id: String(loadId),
            ...(!driver && { carrierId: req.auth.user.defaultCarrierId }),
            ...(driver && { driverAssignments: { some: { driverId: driver.id } } }),
        },
    });

    if (!load) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Load not found' }] }, { status: 404 });
    }

    const docData = body.loadDocument as LoadDocument;
    const isPod = body.isPod === true;
    const isRatecon = body.isRatecon === true;
    const isNormalDoc = !isPod && !isRatecon;

    const loadDocument = await prisma.loadDocument.create({
        data: {
            ...(isNormalDoc && { load: { connect: { id: load.id } } }),
            ...(isPod && { loadForPodDoc: { connect: { id: load.id } } }),
            ...(isRatecon && { loadForRateCon: { connect: { id: load.id } } }),
            ...(driver && {
                driver: { connect: { id: driver.id } },
                carrierId: driver.carrierId,
            }),
            ...(!driver && {
                user: { connect: { id: req.auth.user.id } },
                carrierId: req.auth.user.defaultCarrierId,
            }),
            fileKey: docData.fileKey,
            fileUrl: docData.fileUrl,
            fileName: docData.fileName,
            fileType: docData.fileType,
            fileSize: docData.fileSize,
        },
    });

    const longitude = body?.longitude as number;
    const latitude = body?.latitude as number;

    await prisma.loadActivity.create({
        data: {
            load: { connect: { id: load.id } },
            carrierId: load.carrierId,
            action: isPod ? LoadActivityAction.UPLOAD_POD : LoadActivityAction.UPLOAD_DOCUMENT,
            ...(!driver ? { actorUser: { connect: { id: req.auth.user.id } } } : {}),
            ...(driverId ? { actorDriver: { connect: { id: driverId } } } : {}),
            ...(driver ? { actorDriverName: driver?.name } : {}),
            actionDocument: { connect: { id: loadDocument.id } },
            actionDocumentFileName: loadDocument.fileName,
            ...(longitude ? { longitude } : {}),
            ...(latitude ? { latitude } : {}),
        },
    });

    return NextResponse.json({ code: 200, data: { loadDocument } }, { status: 200 });
});
