import { Driver, LoadActivityAction } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { deleteDocumentFromGCS } from 'lib/delete-doc-from-gcs';
import { AssignmentNotificationHelper } from 'lib/helpers/AssignmentNotificationHelper';

export const DELETE = auth(async (req: NextAuthRequest, context: { params: { id: string; did: string } }) => {
    const session = req.auth;
    const driverId = req.nextUrl.searchParams.get('driverId');
    const loadId = context.params.id;
    const documentId = context.params.did;

    let driver: Driver = null;

    // FIX: Needs to be allowed for driver page that doesn't have a login
    if (!req.auth && !driverId) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    // OPTIMIZATION: Combined query to get load with assignments for notification
    const load = await prisma.load.findFirst({
        where: {
            id: loadId,
            ...(!driverId && { carrierId: session.user.defaultCarrierId }),
            ...(driverId && { driverAssignments: { some: { driverId: driverId } } }),
        },
        select: {
            id: true,
            carrierId: true,
            refNum: true,
            loadNum: true, // Include for notification fallback
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

    // OPTIMIZATION: Get driver info from assignments if available
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

    const isPod = req.nextUrl.searchParams.get('isPod') === 'true';
    const isBol = req.nextUrl.searchParams.get('isBol') === 'true';
    const isRatecon = req.nextUrl.searchParams.get('isRatecon') === 'true';

    const document = await prisma.loadDocument.findFirst({
        where: {
            id: documentId,
            ...(!(isPod || isBol || isRatecon) && { loadId: load.id }),
            ...(isPod && { loadIdForPodDoc: load.id }),
            ...(isBol && { loadIdForBolDoc: load.id }),
            ...(isRatecon && { loadIdForRatecon: load.id }),
            ...(driver && { driverId: driver.id }),
        },
    });

    if (!document) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Document not found' }] }, { status: 404 });
    }

    // Delete file from GCS first (original order maintained)
    await deleteDocumentFromGCS(document);

    // OPTIMIZATION: Use transaction for atomic delete operations
    await prisma.$transaction(async (tx) => {
        // Delete document
        await tx.loadDocument.delete({
            where: { id: documentId },
        });

        // Create activity log
        await tx.loadActivity.create({
            data: {
                load: { connect: { id: load.id } },
                carrierId: load.carrierId,
                action: isPod
                    ? LoadActivityAction.REMOVE_POD
                    : isBol
                    ? LoadActivityAction.REMOVE_BOL
                    : isRatecon
                    ? LoadActivityAction.REMOVE_RATECON
                    : LoadActivityAction.REMOVE_DOCUMENT,
                ...(!driver ? { actorUser: { connect: { id: session.user.id } } } : {}),
                ...(driverId ? { actorDriver: { connect: { id: driverId } } } : {}),
                ...(driver ? { actorDriverName: driver?.name } : {}),
                actionDocumentFileName: document.fileName,
            },
        });
    });

    // Create notification for document deletion
    try {
        // OPTIMIZATION: Use already fetched assignment data
        if (load.driverAssignments.length > 0) {
            const assignment = load.driverAssignments[0]; // Get the first assignment
            const assignedDriver = assignment.driver;

            // Determine document type based on deletion flags instead of filename parsing
            let documentType = 'Document';
            if (isPod) documentType = 'POD';
            else if (isBol) documentType = 'BOL';
            else if (isRatecon) documentType = 'Rate Confirmation';

            const deletedBy = driver ? driver.name : session?.user?.name || 'User';
            // Determine deleter type using session role
            const deletedByType = driver ? 'Driver' : session?.user?.role === 'admin' ? 'Admin' : 'User';

            await AssignmentNotificationHelper.notifyDocumentDeleted({
                assignmentId: assignment.id,
                routeLegId: assignment.routeLegId,
                loadId: loadId,
                carrierId: load.carrierId,
                driverId: assignedDriver?.id,
                driverName: assignedDriver?.name,
                loadNum: load.refNum || load.loadNum || loadId,
                documentType,
                documentName: document.fileName,
                deletedBy,
                deletedByType,
                reason: req.nextUrl.searchParams.get('reason') || undefined,
            });
        }
    } catch (notificationError) {
        console.error('Error creating document deletion notification:', notificationError);
        // Continue with the response even if notification fails
    }

    return NextResponse.json({ code: 200, data: { result: 'Document deleted' } }, { status: 200 });
});
