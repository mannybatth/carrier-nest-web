import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';
import { authOptions } from '../auth/[...nextauth]';
import { CreateAssignmentRequest, UpdateAssignmentRequest } from 'interfaces/assignment';
import { LoadActivityAction } from '@prisma/client';

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
            return _post(req, res);
        case 'PUT':
            return _put(req, res);
        case 'DELETE':
            return _delete(req, res);
        default:
            return res.status(405).json({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }
}

async function _post(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    try {
        const { routeLegData, sendSms, loadId }: CreateAssignmentRequest = req.body;

        if (!loadId || !routeLegData) {
            return res.status(400).json({
                code: 400,
                errors: [{ message: 'Missing required fields' }],
            });
        }

        await prisma.$transaction(async (prisma) => {
            // Find or create the route for the load
            let route = await prisma.route.findUnique({ where: { loadId } });
            if (!route) {
                route = await prisma.route.create({ data: { loadId } });
            }

            // Create the new route leg
            const newRouteLeg = await prisma.routeLeg.create({
                data: {
                    routeId: route.id,
                    scheduledDate: new Date(routeLegData.scheduledDate),
                    scheduledTime: routeLegData.scheduledTime,
                    driverInstructions: routeLegData.driverInstructions,
                },
            });

            // Create driver assignments and add LoadActivity for each
            for (const driverId of routeLegData.driverIds) {
                await prisma.driverAssignment.create({
                    data: {
                        driverId,
                        routeLegId: newRouteLeg.id,
                        loadId,
                    },
                });

                const driver = await prisma.driver.findUnique({ where: { id: driverId } });
                const load = await prisma.load.findUnique({ where: { id: loadId } });

                await prisma.loadActivity.create({
                    data: {
                        loadId,
                        carrierId: load.carrierId,
                        action: LoadActivityAction.ADD_DRIVER_TO_ASSIGNMENT,
                        actionDriverId: driverId,
                        actionDriverName: driver.name,
                    },
                });
            }

            // Create route leg locations
            await prisma.routeLegLocation.createMany({
                data: routeLegData.locations.map((location) => ({
                    routeLegId: newRouteLeg.id,
                    [location.type === 'loadStop' ? 'loadStopId' : 'locationId']: location.id,
                })),
            });

            return newRouteLeg;
        });

        // TODO: Implement SMS sending logic here if sendSms is true

        const routeExpanded = await prisma.route.findUnique({
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
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return res.status(201).json({
            code: 201,
            data: {
                route: routeExpanded,
            },
        });
    } catch (error) {
        console.error('Error creating route leg:', error);
        return res.status(500).json({
            code: 500,
            errors: [
                {
                    message: 'Internal server error',
                },
            ],
        });
    }
}

async function _put(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    try {
        const { routeLegId, routeLegData, sendSms, loadId }: UpdateAssignmentRequest = req.body;

        if (!routeLegId || !loadId || !routeLegData) {
            return res.status(400).json({
                code: 400,
                errors: [{ message: 'Missing required fields' }],
            });
        }

        await prisma.$transaction(async (prisma) => {
            // Update the route leg
            await prisma.routeLeg.update({
                where: { id: routeLegId },
                data: {
                    scheduledDate: new Date(routeLegData.scheduledDate),
                    scheduledTime: routeLegData.scheduledTime,
                    driverInstructions: routeLegData.driverInstructions,
                },
            });

            // Get current driver assignments
            const currentAssignments = await prisma.driverAssignment.findMany({
                where: { routeLegId },
            });

            // Update driver assignments
            await prisma.driverAssignment.deleteMany({
                where: { routeLegId },
            });

            const load = await prisma.load.findUnique({ where: { id: loadId } });

            for (const driverId of routeLegData.driverIds) {
                await prisma.driverAssignment.create({
                    data: {
                        driverId,
                        routeLegId,
                        loadId,
                    },
                });

                if (!currentAssignments.some((a) => a.driverId === driverId)) {
                    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
                    await prisma.loadActivity.create({
                        data: {
                            loadId,
                            carrierId: load.carrierId,
                            action: LoadActivityAction.ADD_DRIVER_TO_ASSIGNMENT,
                            actionDriverId: driverId,
                            actionDriverName: driver.name,
                        },
                    });
                }
            }

            // Create LoadActivity for removed drivers
            for (const assignment of currentAssignments) {
                if (!routeLegData.driverIds.includes(assignment.driverId)) {
                    const driver = await prisma.driver.findUnique({ where: { id: assignment.driverId } });
                    await prisma.loadActivity.create({
                        data: {
                            loadId,
                            carrierId: load.carrierId,
                            action: LoadActivityAction.REMOVE_DRIVER_FROM_ASSIGNMENT,
                            actionDriverId: assignment.driverId,
                            actionDriverName: driver.name,
                        },
                    });
                }
            }

            // Update route leg locations
            await prisma.routeLegLocation.deleteMany({
                where: { routeLegId },
            });
            await prisma.routeLegLocation.createMany({
                data: routeLegData.locations.map((location) => ({
                    routeLegId,
                    [location.type === 'loadStop' ? 'loadStopId' : 'locationId']: location.id,
                })),
            });
        });

        // TODO: Implement SMS sending logic here if sendSms is true

        const routeExpanded = await prisma.route.findUnique({
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
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return res.status(200).json({
            code: 200,
            data: {
                route: routeExpanded,
            },
        });
    } catch (error) {
        console.error('Error updating route leg:', error);
        return res.status(500).json({
            code: 500,
            errors: [
                {
                    message: 'Internal server error',
                },
            ],
        });
    }
}

async function _delete(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    try {
        const { routeLegId } = req.query;

        if (!routeLegId || typeof routeLegId !== 'string') {
            return res.status(400).json({
                code: 400,
                errors: [{ message: 'Missing or invalid routeLegId' }],
            });
        }

        await prisma.$transaction(async (prisma) => {
            // Delete associated driver assignments
            await prisma.driverAssignment.deleteMany({
                where: { routeLegId },
            });

            // Delete associated route leg locations
            await prisma.routeLegLocation.deleteMany({
                where: { routeLegId },
            });

            // Delete the route leg
            await prisma.routeLeg.delete({
                where: { id: routeLegId },
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
            errors: [
                {
                    message: 'Internal server error',
                },
            ],
        });
    }
}
