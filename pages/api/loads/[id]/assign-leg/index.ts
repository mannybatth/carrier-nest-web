import { DriverAssignment, LoadActivity, LoadActivityAction } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import Twilio from 'twilio';
import { ExpandedDriver, ExpandedRoute, ExpandedRouteLeg, JSONResponse } from '../../../../../interfaces/models';
import firebaseAdmin from '../../../../../lib/firebase/firebaseAdmin';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = Twilio(accountSid, authToken);

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'POST':
            return _post();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _post() {
        const session = await getServerSession(req, res, authOptions);
        const { routeLeg, loadId, sendSms } = req.body as {
            routeLeg: ExpandedRouteLeg;
            loadId: string;
            sendSms: boolean;
        };

        console.log('Assigning route leg to load', loadId, routeLeg);

        const routeExists = await prisma.route.findFirst({
            where: {
                loadId,
            },
        });

        let updatedRoute;
        let updatedLoad;

        if (routeExists) {
            updatedRoute = await prisma.route.update({
                where: {
                    id: routeExists.id,
                },
                data: {
                    routeLegs: {
                        create: [
                            {
                                scheduledDate: routeLeg.scheduledDate || undefined,
                                scheduledTime: routeLeg.scheduledTime || undefined,
                                driverInstructions: routeLeg.driverInstructions,
                                driverAssignments: {
                                    create: routeLeg.driverAssignments.map((driver) => ({
                                        driverId: driver.driverId,
                                    })),
                                },
                                locations: {
                                    connect: routeLeg.locations.map((location) => ({ id: location.id })),
                                },
                            },
                        ],
                    },
                },
                select: {
                    id: true,
                    routeLegs: {
                        orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
                        select: {
                            id: true,
                            driverInstructions: true,
                            locations: { select: { id: true } },
                            scheduledDate: true,
                            scheduledTime: true,
                            startedAt: true,
                            startLatitude: true,
                            startLongitude: true,
                            endedAt: true,
                            endLatitude: true,
                            endLongitude: true,
                            driverAssignments: {
                                select: {
                                    driverId: true,
                                    assignedAt: true,
                                    driver: true,
                                },
                            },
                        },
                    },
                },
            });
        } else {
            updatedLoad = await prisma.load.update({
                where: {
                    id: loadId,
                },
                data: {
                    route: {
                        create: {
                            routeLegs: {
                                create: [
                                    {
                                        scheduledAt: routeLeg.scheduledDate || undefined,
                                        driverInstructions: routeLeg.driverInstructions,
                                        driverAssignments: {
                                            create: routeLeg.driverAssignments.map((driver) => ({
                                                driverId: driver.driverId,
                                            })),
                                        },
                                        locations: {
                                            connect: routeLeg.locations.map((location) => ({ id: location.id })),
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },

                select: {
                    customer: { select: { name: true } },
                    id: true,
                    route: {
                        select: {
                            id: true,
                            routeLegs: {
                                orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
                                select: {
                                    id: true,
                                    driverInstructions: true,
                                    locations: { select: { id: true, city: true, state: true } },
                                    scheduledDate: true,
                                    scheduledTime: true,
                                    startedAt: true,
                                    startLatitude: true,
                                    startLongitude: true,
                                    endedAt: true,
                                    endLatitude: true,
                                    endLongitude: true,
                                    driverAssignments: {
                                        select: {
                                            driverId: true,
                                            assignedAt: true,
                                            driver: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
        }

        const expandedRouteDetails: ExpandedRoute = updatedRoute ?? updatedLoad;

        const legCreatedLoadActivity = {
            loadId: loadId,
            carrierId: session.user.defaultCarrierId,
            action: LoadActivityAction.ADD_ASSIGNMENT,
            actorUserId: session.user.id,
        } as unknown as LoadActivity;

        const loadActivityArray: LoadActivity[] = routeLeg.driverAssignments.map((driver) => ({
            loadId: loadId,

            carrierId: session.user.defaultCarrierId,
            action: LoadActivityAction.ADD_DRIVER_TO_ASSIGNMENT,
            actorUserId: session.user.id,

            actionDriverId: driver.driverId,

            actionDriverName: expandedRouteDetails.routeLegs
                .find((leg) => leg.driverAssignments.find((da) => da.driverId === driver.driverId))
                .driverAssignments.find((da) => da.driverId === driver.driverId).driver.name,
        })) as unknown as LoadActivity[];

        await prisma.loadActivity.create({
            data: legCreatedLoadActivity,
        });
        await prisma.loadActivity.createMany({
            data: [...loadActivityArray],
        });

        const drivers = expandedRouteDetails.routeLegs
            .flatMap((leg) => leg.driverAssignments.map((da) => da.driver))
            .filter((d) => routeLeg.driverAssignments.find((da) => da.driverId === d.id)) as ExpandedDriver[];

        // Send SMS to driver
        if (sendSms) {
            for (const driver of drivers) {
                if (!driver.phone) {
                    continue;
                }
                const linkToLoad = `${process.env.NEXT_PUBLIC_VERCEL_URL}/l/${expandedRouteDetails.id}?did=${driver.id}`;
                const textMessage = `You have a new assignment!


                View Load: ${linkToLoad}`;

                /* await client.messages.create({

                    body: textMessage,
                    from: '+18883429736',
                    to: driver.phone,
                }); */
            }
        }

        /* const drivers = expandedRouteDetails.routeLegs
            .flatMap((leg) => leg.driverAssignments.map((da) => da.driver))
            .filter((d) => routeLeg.driverAssignments.find((da) => da.driverId === d.id)) as ExpandedDriver[];

        const message: firebaseAdmin.messaging.MulticastMessage = {
            notification: {
                title: 'You have been added to a new load assignment!',
                body: 'Tap to view assignment details',
            },
            data: {
                type: 'assigned_load',
                loadId: loadId,
            },
            tokens: drivers.flatMap((driver) => driver.devices?.map((device) => device.fcmToken) ?? []),
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
        } */

        // console.log('Updated load:', updatedLoad);

        /* const load = await prisma.load.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
            },
            include: sendSMS
                ? {
                      customer: true,
                      shipper: true,
                      receiver: true,
                  }
                : undefined,
        });

        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const drivers: ExpandedDriver[] = await prisma.driver.findMany({
            where: {
                id: {
                    in: driverIds,
                },
            },
            include: {
                devices: true,
            },
        });

        if (drivers.length !== driverIds.length) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Driver(s) not found' }],
            });
        }

        console.log('Assigning drivers to load', load.id, driverIds);

        const updatedLoad = await prisma.load.update({
            where: {
                id: load.id,
            },
            data: {
                drivers: {
                    connect: driverIds.map((id) => ({ id })),
                },
            },
        });

        for (const driver of drivers) {
            await prisma.loadActivity.create({
                data: {
                    load: {
                        connect: {
                            id: load.id,
                        },
                    },
                    carrierId: load.carrierId,
                    action: LoadActivityAction.ASSIGN_DRIVER,
                    actorUser: {
                        connect: {
                            id: session.user.id,
                        },
                    },
                    actionDriver: {
                        connect: {
                            id: driver.id,
                        },
                    },
                    actionDriverName: driver.name,
                },
            });
        }

        const message: firebaseAdmin.messaging.MulticastMessage = {
            notification: {
                title: 'You have been assigned to a load!',
                body: 'Tap to view load details',
            },
            data: {
                type: 'assigned_load',
                loadId: load.id,
            },
            tokens: drivers.flatMap((driver) => driver.devices?.map((device) => device.fcmToken) ?? []),
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

        // Send SMS to driver
        if (sendSMS) {
            for (const driver of drivers) {
                if (!driver.phone) {
                    continue;
                }
                const linkToLoad = `${process.env.NEXT_PUBLIC_VERCEL_URL}/l/${load.id}?did=${driver.id}`;
                const textMessage = `You have been assigned to a load!

                ${load.customer.name}
                ${load.shipper.city}, ${load.shipper.state} to ${load.receiver.city}, ${load.receiver.state}
                Pick up: ${new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: '2-digit',
                }).format(new Date(load.shipper.date))} at ${load.shipper.time}

                View Load: ${linkToLoad}`;

                await client.messages.create({
                    body: textMessage,
                    from: '+18883429736',
                    to: driver.phone,
                });
            }
        } */

        //console.log(updatedRoute, updatedLoad);

        return res.status(200).json({
            code: 200,
            data: { expandedRouteDetails },
        });
    }
}
