import { Prisma, LoadActivityAction, RouteLegStatus } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { AssignmentNotificationHelper } from 'lib/helpers/AssignmentNotificationHelper';

export const PATCH = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const routeLegId = context.params.id;

    if (!routeLegId) {
        return NextResponse.json(
            {
                code: 400,
                errors: [{ message: 'Invalid or missing route leg ID' }],
            },
            { status: 400 },
        );
    }

    try {
        const tokenCarrierId = req.auth?.user?.carrierId || req.auth?.user?.defaultCarrierId;

        const {
            routeLegStatus,
            startLatitude,
            startLongitude,
            endLatitude,
            endLongitude,
            latitude,
            longitude,
            driverId,
        } = await req.json();

        // FIX: Needs to be allowed for driver page that doesn't have a login
        if (!tokenCarrierId && !driverId) {
            return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
        }

        if (!routeLegId || !routeLegStatus) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Missing required fields' }] }, { status: 400 });
        }

        if (!Object.values(RouteLegStatus).includes(routeLegStatus)) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Invalid routeLegStatus' }] }, { status: 400 });
        }

        const session = req.auth;
        const driverIdFromSession = session?.user?.driverId || driverId;
        const finalLatitude = latitude || startLatitude || endLatitude;
        const finalLongitude = longitude || startLongitude || endLongitude;

        const updates = await prisma.$transaction(async (prisma) => {
            // First, check if the driver making the update is active
            if (driverIdFromSession) {
                const driver = await prisma.driver.findFirst({
                    where: { id: driverIdFromSession },
                    select: { active: true, name: true },
                });

                if (!driver) {
                    throw new Error('Driver not found');
                }

                if (!driver.active) {
                    throw new Error('Cannot update assignment status: Driver account is inactive');
                }
            }

            const dataToUpdate: Partial<Prisma.RouteLegUpdateInput> = {
                status: routeLegStatus,
                ...(startLatitude !== undefined && { startLatitude }),
                ...(startLongitude !== undefined && { startLongitude }),
                ...(endLatitude !== undefined && { endLatitude }),
                ...(endLongitude !== undefined && { endLongitude }),
            };

            switch (routeLegStatus) {
                case RouteLegStatus.ASSIGNED:
                    dataToUpdate.startedAt = null;
                    dataToUpdate.endedAt = null;
                    break;
                case RouteLegStatus.IN_PROGRESS:
                    dataToUpdate.startedAt = new Date();
                    dataToUpdate.endedAt = null;
                    break;
                default:
                    dataToUpdate.startedAt = new Date();
                    dataToUpdate.endedAt = new Date();
                    break;
            }

            const routeLeg = await prisma.routeLeg.update({
                where: {
                    id: routeLegId,
                    driverAssignments: {
                        some: {
                            driverId: driverIdFromSession,
                        },
                    },
                },
                data: dataToUpdate,
                include: {
                    route: {
                        include: {
                            load: {
                                select: {
                                    id: true,
                                    status: true,
                                    carrierId: true,
                                    refNum: true,
                                },
                            },
                        },
                    },
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
                                    active: true,
                                },
                            },
                            chargeType: true,
                            chargeValue: true,
                            billedLoadRate: true,
                        },
                    },
                },
            });

            // Get driver info for activity logging (reuse from above if available)
            let driver = null;
            if (driverIdFromSession) {
                driver = await prisma.driver.findFirst({
                    where: { id: driverIdFromSession },
                    select: { name: true },
                });
            }

            await prisma.loadActivity.create({
                data: {
                    load: {
                        connect: {
                            id: routeLeg.route.load.id,
                        },
                    },
                    carrierId: routeLeg.route.load.carrierId,
                    action: LoadActivityAction.CHANGE_ASSIGNMENT_STATUS,
                    fromLegStatus: routeLeg.status,
                    toLegStatus: routeLegStatus,
                    ...(!driverIdFromSession
                        ? {
                              actorUser: {
                                  connect: {
                                      id: session.user.id,
                                  },
                              },
                          }
                        : {}),
                    ...(driverIdFromSession
                        ? {
                              actorDriver: {
                                  connect: {
                                      id: driverIdFromSession,
                                  },
                              },
                          }
                        : {}),
                    ...(driver ? { actorDriverName: driver?.name } : {}),
                    ...(finalLongitude ? { longitude: finalLongitude } : {}),
                    ...(finalLatitude ? { latitude: finalLatitude } : {}),
                },
            });

            let loadStatus = routeLeg.route.load.status;
            if (routeLegStatus === RouteLegStatus.IN_PROGRESS && loadStatus === 'CREATED') {
                loadStatus = 'IN_PROGRESS';
                await prisma.load.update({
                    where: { id: routeLeg.route.load.id },
                    data: { status: loadStatus },
                });
            } else if (routeLegStatus === RouteLegStatus.COMPLETED) {
                const allRouteLegsCompleted = await prisma.routeLeg.findMany({
                    where: {
                        routeId: routeLeg.routeId,
                        status: { not: RouteLegStatus.COMPLETED },
                    },
                });
                if (allRouteLegsCompleted.length === 0) {
                    loadStatus = 'DELIVERED';
                    await prisma.load.update({
                        where: { id: routeLeg.route.load.id },
                        data: { status: loadStatus },
                    });
                }
            }

            return { routeLeg, loadStatus };
        });

        // Send notifications for assignment status changes
        try {
            const routeLeg = updates.routeLeg;

            // Only send notifications for specific status changes and if we have driver assignments
            if (routeLeg.driverAssignments && routeLeg.driverAssignments.length > 0) {
                for (const assignment of routeLeg.driverAssignments) {
                    // Prepare notification parameters
                    const notificationParams = {
                        assignmentId: assignment.id,
                        routeLegId: routeLeg.id,
                        loadId: routeLeg.route.load.id,
                        carrierId: routeLeg.route.load.carrierId,
                        driverId: assignment.driver.id,
                        driverName: assignment.driver.name,
                        loadNum: routeLeg.route.load.refNum, // Use actual order/reference number
                    };

                    // Send notifications based on status
                    if (routeLegStatus === RouteLegStatus.IN_PROGRESS) {
                        await AssignmentNotificationHelper.notifyAssignmentStarted(notificationParams);
                    } else if (routeLegStatus === RouteLegStatus.COMPLETED) {
                        await AssignmentNotificationHelper.notifyAssignmentCompleted(notificationParams);
                    } else if (routeLegStatus === RouteLegStatus.ASSIGNED) {
                        // Determine user type based on whether the session user is a driver or admin/user
                        const userType = session?.user?.driverId ? 'Driver' : 'Admin';

                        // Use driver name if session user is a driver, otherwise use session user name
                        const changedByName = session?.user?.driverId
                            ? assignment.driver.name
                            : session?.user?.name || 'User';

                        // Optionally notify about assignment being assigned/updated
                        await AssignmentNotificationHelper.notifyStatusChange({
                            ...notificationParams,
                            fromStatus: 'UNKNOWN',
                            toStatus: 'ASSIGNED',
                            changedBy: changedByName, // Include who changed the status
                            changedByType: userType, // Include user type
                        });
                    }
                }
            }
        } catch (notificationError) {
            // Log the error but don't fail the main operation
            console.error('Error sending assignment notifications:', notificationError);
        }

        return NextResponse.json({ code: 200, data: { routeLeg: updates.routeLeg, loadStatus: updates.loadStatus } });
    } catch (error) {
        console.error('Error updating route leg status:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});
