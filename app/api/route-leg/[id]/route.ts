import { Prisma, LoadActivityAction, RouteLegStatus } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const PATCH = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    try {
        const routeLegId = req.nextUrl.searchParams.get('id') as string;
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
                where: { id: routeLegId },
                data: dataToUpdate,
                include: {
                    route: {
                        include: {
                            load: {
                                select: {
                                    id: true,
                                    status: true,
                                    carrierId: true,
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
                                },
                            },
                            chargeType: true,
                            chargeValue: true,
                        },
                    },
                },
            });

            const driver = driverIdFromSession
                ? await prisma.driver.findFirst({ where: { id: driverIdFromSession } })
                : null;

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

        return NextResponse.json({ code: 200, data: { routeLeg: updates.routeLeg, loadStatus: updates.loadStatus } });
    } catch (error) {
        console.error('Error updating route leg status:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});
