import { Driver, LoadActivityAction, LoadDocument } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { AssignmentNotificationHelper } from 'lib/helpers/AssignmentNotificationHelper';
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

    // OPTIMIZATION: Single query to get load with all necessary related data
    const load = await prisma.load.findFirst({
        where: {
            id: loadId,
            ...(!driverId && { carrierId: req.auth.user.defaultCarrierId }),
            ...(driverId && { driverAssignments: { some: { driverId: driverId } } }),
        },
        select: {
            id: true,
            carrierId: true,
            refNum: true,
            userId: true,
            rateconDocument: true, // Include for rate con validation
            driverAssignments: {
                // Include for notifications
                include: {
                    driver: true,
                    routeLeg: true,
                },
            },
        },
    });

    if (!load) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Load not found' }] }, { status: 404 });
    }

    // OPTIMIZATION: Get driver info only if needed and not already available from assignments
    if (driverId) {
        const driverFromAssignment = load.driverAssignments.find((a) => a.driverId === driverId)?.driver;
        if (driverFromAssignment) {
            driver = driverFromAssignment;
        } else {
            driver = await prisma.driver.findFirst({
                where: { id: driverId },
            });
            if (!driver) {
                return NextResponse.json({ code: 404, errors: [{ message: 'Driver not found' }] }, { status: 404 });
            }
        }
    }

    const docData = body.loadDocument as LoadDocument;
    const isPod = body.isPod === true;
    const isBol = body.isBol === true;
    const isRatecon = body.isRatecon === true;
    const isNormalDoc = !isPod && !isBol && !isRatecon;

    // OPTIMIZATION: Use already fetched rateconDocument instead of new query
    if (isRatecon && load.rateconDocument) {
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

    // OPTIMIZATION: Use transaction for atomic operations (document + activity)
    const [loadDocument] = await prisma.$transaction([
        prisma.loadDocument.create({
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
        }),
    ]);

    // Create activity log immediately after document creation for consistency
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

    // Send notifications for document upload
    try {
        // OPTIMIZATION: Use already fetched assignment data from load query
        let assignment = null;
        let assignedDriver = null;

        if (driver && driverId) {
            // Find the assignment for this specific driver
            assignment = load.driverAssignments.find((a) => a.driverId === driverId);
            assignedDriver = assignment?.driver;
        } else if (load.driverAssignments.length > 0) {
            // If admin/user uploaded, use the first available assignment
            assignment = load.driverAssignments[0];
            assignedDriver = assignment.driver;
        }

        if (assignment && assignedDriver) {
            // Determine document type based on upload flags
            let documentType = 'Document';
            if (isPod) documentType = 'POD';
            else if (isBol) documentType = 'BOL';
            else if (isRatecon) documentType = 'Rate Confirmation';

            // Determine uploader type using session role
            const uploaderType = driver ? 'Driver' : req.auth?.user?.role === 'admin' ? 'Admin' : 'User';

            await AssignmentNotificationHelper.notifyDocumentUploaded({
                assignmentId: assignment.id,
                routeLegId: assignment.routeLegId,
                loadId: loadId,
                carrierId: load.carrierId,
                driverId: assignedDriver.id,
                driverName: assignedDriver.name,
                loadNum: load.refNum || `Load-${loadId}`, // Use actual order number (refNum) or fallback
                documentType: documentType,
                documentName: docData.fileName, // Include the actual file name
                uploadedByType: uploaderType, // Use proper role detection
            });
        }
    } catch (notificationError) {
        // Log the error but don't fail the main operation
        console.error('Error sending document upload notification:', notificationError);
    }

    return NextResponse.json({ code: 200, data: { loadDocument } }, { status: 200 });
});
