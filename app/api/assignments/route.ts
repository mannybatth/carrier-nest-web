import { ChargeType, LoadActivityAction, Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { calcPaginationMetadata } from 'lib/pagination';
import { CreateAssignmentRequest, UpdateAssignmentRequest } from 'interfaces/assignment';
import { ExpandedDriverAssignment } from 'interfaces/models';
import firebaseAdmin from '../../../lib/firebase/firebaseAdmin';
import Twilio from 'twilio';
import { appUrl } from 'lib/constants';
import { AssignmentNotificationHelper } from 'lib/helpers/AssignmentNotificationHelper';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = Twilio(accountSid, authToken);

// Helper function to build order by clause
const buildOrderBy = (
    sortBy: string,
    sortDir: 'asc' | 'desc',
): Prisma.Enumerable<Prisma.DriverAssignmentOrderByWithRelationInput> => {
    if (sortBy && sortDir) {
        if (sortBy.includes('.')) {
            const split = sortBy.split('.');
            return {
                [split[0]]: {
                    [split[1]]: sortDir,
                },
            };
        }
        return { [sortBy]: sortDir };
    }
    return undefined;
};

// GET handler
export const GET = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    try {
        const carrierId = session.user.defaultCarrierId;
        const sortBy = req.nextUrl.searchParams.get('sortBy') as string;
        const sortDir = (req.nextUrl.searchParams.get('sortDir') as 'asc' | 'desc') || 'asc';
        const limit =
            req.nextUrl.searchParams.get('limit') !== undefined
                ? Number(req.nextUrl.searchParams.get('limit'))
                : undefined;
        const offset =
            req.nextUrl.searchParams.get('offset') !== undefined
                ? Number(req.nextUrl.searchParams.get('offset'))
                : undefined;
        const showCompletedOnly = req.nextUrl.searchParams.get('showCompletedOnly') === 'true';
        const showNotInvoicedOnly = req.nextUrl.searchParams.get('showNotInvoicedOnly') === 'true';
        const driverIds = req.nextUrl.searchParams.get('driverIds')
            ? (req.nextUrl.searchParams.get('driverIds') as string).split(',')
            : [];
        const invoiceId = req.nextUrl.searchParams.get('invoiceId');

        if (!carrierId) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Carrier ID is required' }] }, { status: 400 });
        }

        if (limit != null || offset != null) {
            if (limit == null || offset == null) {
                return NextResponse.json(
                    { code: 400, errors: [{ message: 'Limit and Offset must be set together' }] },
                    { status: 400 },
                );
            }

            if (isNaN(limit) || isNaN(offset)) {
                return NextResponse.json(
                    { code: 400, errors: [{ message: 'Invalid limit or offset' }] },
                    { status: 400 },
                );
            }
        }

        const whereClause: Prisma.DriverAssignmentWhereInput = { carrierId };
        if (showCompletedOnly) {
            whereClause.routeLeg = {
                status: 'COMPLETED',
            };
        }
        if (showNotInvoicedOnly) {
            if (invoiceId) {
                // either matched id, OR no invoice at all
                whereClause.OR = [{ invoiceId: invoiceId }, { invoice: { is: null } }];
            } else {
                // only the “not invoiced” ones
                whereClause.invoice = { is: null };
            }
        }

        if (driverIds?.length > 0) {
            whereClause.driverId = { in: driverIds };
        }

        const assignments = await prisma.driverAssignment.findMany({
            where: whereClause,
            orderBy: buildOrderBy(sortBy, sortDir) || {
                createdAt: 'desc',
            },
            ...(limit ? { take: limit } : { take: 10 }),
            ...(offset ? { skip: offset } : { skip: 0 }),
            include: {
                driver: true,
                load: true,
                assignmentPayments: {
                    include: {
                        driverPayment: true,
                    },
                },
                routeLeg: {
                    include: {
                        locations: {
                            include: {
                                loadStop: true,
                                location: true,
                            },
                        },
                        driverAssignments: {
                            include: {
                                driver: true,
                            },
                        },
                    },
                },
            },
        });

        const total = await prisma.driverAssignment.count({
            where: whereClause,
        });

        const metadata = calcPaginationMetadata({
            total,
            limit: limit ? Number(limit) : 20,
            offset: offset ? Number(offset) : 0,
        });

        return NextResponse.json({ code: 200, data: { assignments, metadata } });
    } catch (error) {
        console.error('Error fetching assignments:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});

// POST handler
export const POST = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    try {
        const { routeLegData, sendSms, loadId }: CreateAssignmentRequest = await req.json();

        if (!loadId || !routeLegData) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Missing required fields' }] }, { status: 400 });
        }

        const load = await prisma.load.findUnique({
            where: { id: loadId },
            include: {
                carrier: true,
            },
        });

        if (!load) {
            return NextResponse.json({ code: 404, errors: [{ message: 'Load not found' }] }, { status: 404 });
        }

        const driverIds = routeLegData.driversWithCharge.map((driverWithCharge) => driverWithCharge.driver.id);
        const drivers = await prisma.driver.findMany({
            where: { id: { in: driverIds } },
            include: { devices: true },
        });

        const assignments = await prisma.$transaction(async (prisma) => {
            const route = await prisma.route.upsert({
                where: { loadId },
                update: {},
                create: { loadId },
            });

            const newRouteLeg = await prisma.routeLeg.create({
                data: {
                    routeId: route.id,
                    scheduledDate: new Date(routeLegData.scheduledDate),
                    scheduledTime: routeLegData.scheduledTime,
                    driverInstructions: routeLegData.driverInstructions,
                    distanceMiles: routeLegData.distanceMiles,
                    durationHours: routeLegData.durationHours,
                },
            });

            const driverAssignmentsData = routeLegData.driversWithCharge.map((driverWithCharge) => ({
                driverId: driverWithCharge.driver.id,
                routeLegId: newRouteLeg.id,
                loadId,
                carrierId: load.carrierId,
                chargeType: driverWithCharge.chargeType || ChargeType.FIXED_PAY,
                chargeValue: driverWithCharge.chargeValue || 0,
            }));

            const loadActivitiesData = drivers.map((driver) => ({
                loadId,
                carrierId: load.carrierId,
                action: LoadActivityAction.ADD_DRIVER_TO_ASSIGNMENT,
                actionDriverId: driver.id,
                actionDriverName: driver.name,
                actorUserId: session.user.id,
            }));

            const assignments = await prisma.driverAssignment.createManyAndReturn({
                data: driverAssignmentsData,
                select: {
                    id: true,
                    assignedAt: true,
                    driver: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            devices: {
                                select: {
                                    fcmToken: true,
                                },
                            },
                            defaultChargeType: true,
                            defaultFixedPay: true,
                            perMileRate: true,
                            perHourRate: true,
                            takeHomePercent: true,
                        },
                    },
                },
            });

            await prisma.loadActivity.createMany({
                data: [
                    ...loadActivitiesData,
                    {
                        loadId,
                        carrierId: load.carrierId,
                        action: LoadActivityAction.ADD_ASSIGNMENT,
                        actorUserId: session.user.id,
                    },
                ],
            });

            await prisma.routeLegLocation.createMany({
                data: routeLegData.locations.map((location) => ({
                    routeLegId: newRouteLeg.id,
                    loadStopId: location.loadStop?.id,
                    locationId: location.location?.id,
                })),
            });

            return assignments;
        });

        // Send notifications for newly created assignments
        try {
            for (const assignment of assignments) {
                await AssignmentNotificationHelper.notifyAssignmentUpdated({
                    assignmentId: assignment.id,
                    routeLegId: 'route-leg-placeholder', // We don't have direct access to routeLegId here
                    loadId: loadId,
                    carrierId: load.carrierId,
                    driverId: assignment.driver.id,
                    driverName: assignment.driver.name,
                    loadNum: `Load-${loadId}`, // You might want to use a proper load number field
                    updateType: 'new_assignment',
                });
            }
        } catch (notificationError) {
            // Log the error but don't fail the main operation
            console.error('Error sending new assignment notifications:', notificationError);
        }

        sendPushNotification(assignments, loadId, false);

        if (sendSms) {
            await sendSmsNotifications(assignments, loadId, false);
        }

        const routeExpanded = await getExpandedRoute(loadId);

        return NextResponse.json({ code: 201, data: { route: routeExpanded } }, { status: 201 });
    } catch (error) {
        console.error('Error creating route leg:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});

// PUT handler
export const PUT = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    try {
        const { routeLegId, routeLegData, sendSms, loadId }: UpdateAssignmentRequest = await req.json();

        if (!routeLegId || !loadId || !routeLegData) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Missing required fields' }] }, { status: 400 });
        }

        const load = await prisma.load.findUnique({
            where: { id: loadId },
            include: { carrier: true },
        });

        if (!load) {
            return NextResponse.json({ code: 404, errors: [{ message: 'Load not found' }] }, { status: 404 });
        }

        const driverIdsFromRequest = routeLegData.driversWithCharge.map(
            (driverWithCharge) => driverWithCharge.driver.id,
        );

        // Fetch all relevant drivers: those currently assigned and those in the request
        const allRelevantDrivers = await prisma.driver.findMany({
            where: {
                OR: [{ id: { in: driverIdsFromRequest } }, { assignments: { some: { routeLegId } } }],
            },
            include: { devices: true },
        });

        // Get current assignments before the transaction
        const currentAssignments = await prisma.driverAssignment.findMany({
            where: { routeLegId },
            select: { driverId: true },
        });
        const currentDriverIds = currentAssignments.map((assignment) => assignment.driverId);
        const newAssignedDriverIds = driverIdsFromRequest.filter((id) => !currentDriverIds.includes(id));

        await prisma.$transaction(async (prisma) => {
            await prisma.routeLeg.update({
                where: { id: routeLegId },
                data: {
                    scheduledDate: new Date(routeLegData.scheduledDate),
                    scheduledTime: routeLegData.scheduledTime,
                    driverInstructions: routeLegData.driverInstructions,
                    distanceMiles: routeLegData.distanceMiles,
                    durationHours: routeLegData.durationHours,
                },
            });

            const removedDriverIds = currentDriverIds.filter((id) => !driverIdsFromRequest.includes(id));

            const newDriverAssignmentsData = routeLegData.driversWithCharge
                .filter((driverWithCharge) => newAssignedDriverIds.includes(driverWithCharge.driver.id))
                .map((driverWithCharge) => ({
                    driverId: driverWithCharge.driver.id,
                    routeLegId,
                    loadId,
                    carrierId: load.carrierId,
                    chargeType: driverWithCharge.chargeType || ChargeType.FIXED_PAY,
                    chargeValue: driverWithCharge.chargeValue || 0,
                }));

            const newDriverActivities = allRelevantDrivers
                .filter((driver) => newAssignedDriverIds.includes(driver.id))
                .map((driver) => ({
                    loadId,
                    carrierId: load.carrierId,
                    action: LoadActivityAction.ADD_DRIVER_TO_ASSIGNMENT,
                    actionDriverId: driver.id,
                    actionDriverName: driver.name,
                    actorUserId: session.user.id,
                }));

            const removedDriverActivities = allRelevantDrivers
                .filter((driver) => removedDriverIds.includes(driver.id))
                .map((driver) => ({
                    loadId,
                    carrierId: load.carrierId,
                    action: LoadActivityAction.REMOVE_DRIVER_FROM_ASSIGNMENT,
                    actionDriverId: driver.id,
                    actionDriverName: driver.name,
                    actorUserId: session.user.id,
                }));

            const existingDriverAssignments = routeLegData.driversWithCharge
                .filter((driverWithCharge) => currentDriverIds.includes(driverWithCharge.driver.id))
                .map((driverWithCharge) => ({
                    driverId: driverWithCharge.driver.id,
                    routeLegId,
                    chargeType: driverWithCharge.chargeType || ChargeType.FIXED_PAY,
                    chargeValue: driverWithCharge.chargeValue || 0,
                }));

            await prisma.driverAssignment.createMany({
                data: newDriverAssignmentsData,
            });

            await prisma.driverAssignment.deleteMany({
                where: {
                    routeLegId,
                    driverId: { in: removedDriverIds },
                },
            });

            for (const assignment of existingDriverAssignments) {
                await prisma.driverAssignment.updateMany({
                    where: {
                        driverId: assignment.driverId,
                        routeLegId: assignment.routeLegId,
                    },
                    data: {
                        chargeType: assignment.chargeType,
                        chargeValue: assignment.chargeValue,
                    },
                });
            }

            await prisma.loadActivity.createMany({
                data: [...newDriverActivities, ...removedDriverActivities],
            });

            await prisma.routeLegLocation.deleteMany({
                where: { routeLegId },
            });

            await prisma.routeLegLocation.createMany({
                data: routeLegData.locations.map((location) => ({
                    routeLegId,
                    loadStopId: location.loadStop?.id,
                    locationId: location.location?.id,
                })),
            });

            await prisma.loadActivity.create({
                data: {
                    loadId,
                    carrierId: load.carrierId,
                    action: LoadActivityAction.UPDATE_ASSIGNMENT,
                    actorUserId: session.user.id,
                },
            });
        });

        const routeExpanded = await getExpandedRoute(loadId);
        const routeLeg = routeExpanded.routeLegs.find((leg) => leg.id === routeLegId);

        // Send notifications for assignment changes
        try {
            if (routeLeg && routeLeg.driverAssignments) {
                // Track notifications sent to avoid duplicates within this operation
                const sentNotifications = new Set<string>();

                // Get the drivers that were newly assigned
                const newlyAssignedDrivers = allRelevantDrivers.filter((driver) =>
                    newAssignedDriverIds.includes(driver.id),
                );

                // Send notifications for newly assigned drivers
                for (const driver of newlyAssignedDrivers) {
                    const assignment = routeLeg.driverAssignments.find((assign) => assign.driver.id === driver.id);

                    if (assignment) {
                        const notificationKey = `assigned-${assignment.id}`;
                        if (!sentNotifications.has(notificationKey)) {
                            await AssignmentNotificationHelper.notifyAssignmentUpdated({
                                assignmentId: assignment.id,
                                routeLegId: routeLeg.id,
                                loadId: loadId,
                                carrierId: load.carrierId,
                                driverId: driver.id,
                                driverName: driver.name,
                                loadNum: `Load-${loadId}`, // You might want to use a proper load number field
                                updateType: 'assigned',
                            });
                            sentNotifications.add(notificationKey);
                        }
                    }
                }

                // Send notifications for assignment updates (schedule, instructions, etc.)
                // Only for existing assignments that haven't been notified about yet
                for (const assignment of routeLeg.driverAssignments) {
                    if (currentDriverIds.includes(assignment.driver.id)) {
                        // This is an existing assignment that was updated
                        const notificationKey = `schedule_updated-${assignment.id}`;
                        if (!sentNotifications.has(notificationKey)) {
                            await AssignmentNotificationHelper.notifyAssignmentUpdated({
                                assignmentId: assignment.id,
                                routeLegId: routeLeg.id,
                                loadId: loadId,
                                carrierId: load.carrierId,
                                driverId: assignment.driver.id,
                                driverName: assignment.driver.name,
                                loadNum: `Load-${loadId}`, // You might want to use a proper load number field
                                updateType: 'schedule_updated',
                            });
                            sentNotifications.add(notificationKey);
                        }
                    }
                }
            }
        } catch (notificationError) {
            // Log the error but don't fail the main operation
            console.error('Error sending assignment notifications:', notificationError);
        }

        sendPushNotification(routeLeg.driverAssignments, loadId, true);

        if (sendSms) {
            await sendSmsNotifications(routeLeg.driverAssignments, loadId, true);
        }

        return NextResponse.json({ code: 200, data: { route: routeExpanded } });
    } catch (error) {
        console.error('Error updating route leg:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});

// DELETE handler
export const DELETE = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    try {
        const routeLegId = req.nextUrl.searchParams.get('routeLegId');

        if (!routeLegId) {
            return NextResponse.json(
                { code: 400, errors: [{ message: 'Missing or invalid routeLegId' }] },
                { status: 400 },
            );
        }

        await prisma.$transaction(async (prisma) => {
            const routeLeg = await prisma.routeLeg.findUnique({
                where: { id: routeLegId },
                include: {
                    route: {
                        include: {
                            load: {
                                select: {
                                    id: true,
                                    carrierId: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!routeLeg) {
                throw new Error('Route leg not found');
            }

            await prisma.driverAssignment.deleteMany({
                where: { routeLegId },
            });

            await prisma.routeLegLocation.deleteMany({
                where: { routeLegId },
            });

            await prisma.routeLeg.delete({
                where: { id: routeLegId },
            });

            await prisma.loadActivity.create({
                data: {
                    loadId: routeLeg.route.load.id,
                    carrierId: routeLeg.route.load.carrierId,
                    action: LoadActivityAction.REMOVE_ASSIGNMENT,
                    actorUserId: session.user.id,
                },
            });
        });

        return NextResponse.json({
            code: 200,
            data: { message: 'Route leg and associated data deleted successfully' },
        });
    } catch (error) {
        console.error('Error deleting route leg:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});

const sendPushNotification = async (assignments: ExpandedDriverAssignment[], loadId: string, isUpdate = false) => {
    for (const assignment of assignments) {
        const message: firebaseAdmin.messaging.MulticastMessage = {
            notification: {
                title: isUpdate ? 'Assignment Updated' : 'New Assignment',
                body: 'Tap to view assignment details',
            },
            data: {
                type: 'assigned_assignment',
                loadId: assignment.id,
            },
            tokens: assignments.map((assignment) => assignment.driver.devices.map((device) => device.fcmToken)).flat(),
        };

        if (message.tokens.length > 0) {
            try {
                const response = await firebaseAdmin.messaging().sendEachForMulticast(message);

                // Collect all invalid tokens
                const invalidTokens: string[] = response.responses
                    .map((res, idx) => (res.success ? null : message.tokens[idx]))
                    .filter((token): token is string => {
                        if (token === null) {
                            return false;
                        }
                        const res = response.responses[message.tokens.indexOf(token)];
                        const errorCode = res.error?.code;
                        return (
                            token !== null &&
                            (errorCode === 'messaging/registration-token-not-registered' ||
                                errorCode === 'messaging/invalid-registration-token' ||
                                errorCode === 'messaging/invalid-argument')
                        );
                    });

                // If there are invalid tokens, delete them in one batch operation
                if (invalidTokens.length > 0) {
                    try {
                        await prisma.device.deleteMany({
                            where: {
                                fcmToken: { in: invalidTokens },
                            },
                        });
                    } catch (deleteError) {
                        console.error('Error removing invalid tokens:', deleteError);
                    }
                }
            } catch (error) {
                console.error('Error sending notification:', error);
            }
        }
    }
};

async function sendSmsNotifications(assignments: ExpandedDriverAssignment[], loadId: string, isUpdate = false) {
    for (const assignment of assignments) {
        const driver = assignment.driver;
        if (!driver.phone) {
            continue;
        }
        const linkToLoad = `${appUrl}/l/${assignment.id}?did=${driver.id}`;
        const textMessage = isUpdate
            ? `Your assignment has been updated.\n\nView Load: ${linkToLoad}`
            : `You have a new assignment.\n\nView Load: ${linkToLoad}`;

        await client.messages.create({
            body: textMessage,
            from: '+18883429736',
            to: driver.phone,
        });
    }
}

async function getExpandedRoute(loadId: string) {
    return await prisma.route.findUnique({
        where: { loadId },
        include: {
            routeLegs: {
                orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
                include: {
                    locations: {
                        include: {
                            loadStop: true,
                            location: true,
                        },
                    },
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
                                    devices: {
                                        select: {
                                            fcmToken: true,
                                        },
                                    },
                                    defaultChargeType: true,
                                    defaultFixedPay: true,
                                    perMileRate: true,
                                    perHourRate: true,
                                    takeHomePercent: true,
                                },
                            },
                            chargeType: true,
                            chargeValue: true,
                        },
                    },
                },
            },
        },
    });
}
