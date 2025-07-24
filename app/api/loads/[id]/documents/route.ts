import { Driver, LoadActivityAction, LoadDocument } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import 'polyfills';

export const POST = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const body = await req.json();
    const driverId = body.driverId as string;
    const loadId = context.params.id;

    let driver: Driver = null;

    // FIX: Needs to be allowed for driver page that doesn't have a login
    if (!req.auth && !driverId) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

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
            id: loadId,
            ...(!driver && { carrierId: req.auth.user.defaultCarrierId }),
            ...(driver && { driverAssignments: { some: { driverId: driver.id } } }),
        },
    });

    if (!load) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Load not found' }] }, { status: 404 });
    }

    const docData = body.loadDocument as LoadDocument;
    const isPod = body.isPod === true;
    const isBol = body.isBol === true;
    const isRatecon = body.isRatecon === true;
    const isNormalDoc = !isPod && !isBol && !isRatecon;

    // Debug log to see what's happening with rate con uploads
    if (isRatecon) {
        console.log('Rate con upload - flags:', { isPod, isBol, isRatecon, isNormalDoc });
    }

    // If uploading a rate con document, check for existing rate con and prevent upload
    if (isRatecon) {
        const existingLoad = await prisma.load.findUnique({
            where: { id: loadId },
            include: { rateconDocument: true },
        });

        if (existingLoad?.rateconDocument) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [
                        {
                            message:
                                'A rate confirmation document already exists for this load. Please delete the existing rate con document first.',
                        },
                    ],
                },
                { status: 400 },
            );
        }
    }

    const loadDocument = await prisma.loadDocument.create({
        data: {
            ...(isNormalDoc && { load: { connect: { id: load.id } } }),
            ...(isPod && { loadForPodDoc: { connect: { id: load.id } } }),
            ...(isBol && { loadForBolDoc: { connect: { id: load.id } } }),
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

    // Determine action explicitly to debug
    let action: LoadActivityAction;
    if (isPod) {
        action = LoadActivityAction.UPLOAD_POD;
    } else if (isBol) {
        action = LoadActivityAction.UPLOAD_BOL;
    } else if (isRatecon) {
        action = LoadActivityAction.UPLOAD_RATECON;
    } else {
        action = LoadActivityAction.UPLOAD_DOCUMENT;
    }

    console.log('About to create LoadActivity with action:', action);

    await prisma.loadActivity.create({
        data: {
            load: { connect: { id: load.id } },
            carrierId: load.carrierId,
            action: action,
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
