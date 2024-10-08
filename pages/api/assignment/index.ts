import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, Session } from 'next-auth';
import { ExpandedDriverAssignment, JSONResponse } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';
import { authOptions } from '../auth/[...nextauth]';
import { CreateAssignmentRequest, UpdateAssignmentRequest } from 'interfaces/assignment';
import { LoadActivityAction } from '@prisma/client';
import firebaseAdmin from '../../../lib/firebase/firebaseAdmin';
import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = Twilio(accountSid, authToken);

export default async function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({
            code: 401,
            errors: [{ message: 'Unauthorized' }],
        });
    }

    switch (req.method) {
        case 'POST':
            return _post(req, res, session);
        case 'PUT':
            return _put(req, res, session);
        case 'DELETE':
            return _delete(req, res, session);
        default:
            return res.status(405).json({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }
}

async function _post(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>, session: Session) {
    try {
        const { routeLegData, sendSms, loadId }: CreateAssignmentRequest = req.body;

        if (!loadId || !routeLegData) {
            return res.status(400).json({
                code: 400,
                errors: [{ message: 'Missing required fields' }],
            });
        }

        const load = await prisma.load.findUnique({
            where: { id: loadId },
            include: {
                carrier: true,
            },
        });

        if (!load) {
            return res.status(404).json({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const driverIds = routeLegData.drivers.map((driver) => driver.id);
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
                    routeLegDistance: routeLegData.routeLegDistance,
                    routeLegDuration: routeLegData.routeLegDuration,
                },
            });

            const driverAssignmentsData = drivers.map((driver) => ({
                driverId: driver.id,
                routeLegId: newRouteLeg.id,
                loadId,
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

        sendPushNotification(assignments, loadId, false);

        if (sendSms) {
            await sendSmsNotifications(assignments, loadId, false);
        }

        const routeExpanded = await getExpandedRoute(loadId);

        return res.status(201).json({
            code: 201,
            data: { route: routeExpanded },
        });
    } catch (error) {
        console.error('Error creating route leg:', error);
        return res.status(500).json({
            code: 500,
            errors: [{ message: 'Internal server error' }],
        });
    }
}

async function _put(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>, session: Session) {
    try {
        const { routeLegId, routeLegData, sendSms, loadId }: UpdateAssignmentRequest = req.body;

        if (!routeLegId || !loadId || !routeLegData) {
            return res.status(400).json({
                code: 400,
                errors: [{ message: 'Missing required fields' }],
            });
        }

        const load = await prisma.load.findUnique({
            where: { id: loadId },
            include: { carrier: true },
        });

        if (!load) {
            return res.status(404).json({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const driverIdsFromRequest = routeLegData.drivers.map((driver) => driver.id);

        // Fetch all relevant drivers: those currently assigned and those in the request
        const allRelevantDrivers = await prisma.driver.findMany({
            where: {
                OR: [{ id: { in: driverIdsFromRequest } }, { assignments: { some: { routeLegId } } }],
            },
            include: { devices: true },
        });

        await prisma.$transaction(async (prisma) => {
            await prisma.routeLeg.update({
                where: { id: routeLegId },
                data: {
                    scheduledDate: new Date(routeLegData.scheduledDate),
                    scheduledTime: routeLegData.scheduledTime,
                    driverInstructions: routeLegData.driverInstructions,
                    routeLegDistance: routeLegData.routeLegDistance,
                    routeLegDuration: routeLegData.routeLegDuration,
                },
            });

            const currentAssignments = await prisma.driverAssignment.findMany({
                where: { routeLegId },
                select: { driverId: true },
            });

            const currentDriverIds = currentAssignments.map((assignment) => assignment.driverId);

            const newAssignedDriverIds = driverIdsFromRequest.filter((id) => !currentDriverIds.includes(id));
            const removedDriverIds = currentDriverIds.filter((id) => !driverIdsFromRequest.includes(id));

            if (newAssignedDriverIds.length > 0) {
                await prisma.driverAssignment.createMany({
                    data: newAssignedDriverIds.map((driverId) => ({
                        driverId,
                        routeLegId,
                        loadId,
                    })),
                });

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

                await prisma.loadActivity.createMany({ data: newDriverActivities });
            }

            if (removedDriverIds.length > 0) {
                await prisma.driverAssignment.deleteMany({
                    where: {
                        routeLegId,
                        driverId: { in: removedDriverIds },
                    },
                });
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

                await prisma.loadActivity.createMany({ data: removedDriverActivities });
            }

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

        sendPushNotification(routeLeg.driverAssignments, loadId, true);

        if (sendSms) {
            await sendSmsNotifications(routeLeg.driverAssignments, loadId, true);
        }

        return res.status(200).json({
            code: 200,
            data: { route: routeExpanded },
        });
    } catch (error) {
        console.error('Error updating route leg:', error);
        return res.status(500).json({
            code: 500,
            errors: [{ message: 'Internal server error' }],
        });
    }
}

async function _delete(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>, session: Session) {
    try {
        const { routeLegId } = req.query;

        if (!routeLegId || typeof routeLegId !== 'string') {
            return res.status(400).json({
                code: 400,
                errors: [{ message: 'Missing or invalid routeLegId' }],
            });
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

        return res.status(200).json({
            code: 200,
            data: { message: 'Route leg and associated data deleted successfully' },
        });
    } catch (error) {
        console.error('Error deleting route leg:', error);
        return res.status(500).json({
            code: 500,
            errors: [{ message: 'Internal server error' }],
        });
    }
}

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
        const linkToLoad = `${process.env.NEXT_PUBLIC_VERCEL_URL}/l/${assignment.id}?did=${driver.id}`;
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
                                },
                            },
                        },
                    },
                },
            },
        },
    });
}
