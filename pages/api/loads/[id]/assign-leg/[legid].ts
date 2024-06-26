import { LoadActivityAction } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { ExpandedRouteLeg, JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';
import { de } from 'date-fns/locale';
import { LoadLegStatus } from 'pages/loads/[id]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'DELETE':
            return _delete();
        case 'PUT':
            return _update();
        case 'PATCH':
            return _patch();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _delete() {
        const session = await getServerSession(req, res, authOptions);

        const load = await prisma.load.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
                route: {
                    id: { not: undefined },
                    routeLegs: {
                        some: { id: { equals: String(req.query.legid) } },
                    },
                },
            },
        });

        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const routeLegId = String(req.query.legid);
        const route = await prisma.route.findFirst({
            where: {
                loadId: req.query.id as string,
                routeLegs: {
                    some: { id: routeLegId },
                },
            },
        });

        if (!route) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Route assignment not found' }],
            });
        }

        const updatedLoad = await prisma.routeLeg.delete({
            where: {
                id: routeLegId,
            },
        });

        /* await prisma.loadActivity.create({
            data: {
                load: {
                    connect: {
                        id: load.id,
                    },
                },
                carrierId: load.carrierId,
                action: LoadActivityAction.REMOVE_ASSIGNMENT,
                actorUser: {
                    connect: {
                        id: session.user.id,
                    },
                },
            },
        });
 */
        return res.status(200).json({
            code: 200,
            data: { updatedLoad },
        });
    }

    async function _update() {
        const session = await getServerSession(req, res, authOptions);

        // Validate request body
        const { routeLeg, loadId, sendSMS } = req.body as {
            routeLeg: ExpandedRouteLeg;
            loadId: string;
            sendSMS: boolean;
        };

        // Check if the load exists and is assigned to the carrier
        const load = await prisma.load.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
                route: {
                    id: { not: undefined },
                    routeLegs: {
                        some: { id: { equals: String(req.query.legid) } },
                    },
                },
            },
            select: {
                route: {
                    select: {
                        routeLegs: {
                            where: { id: String(req.query.legid) },
                            select: {
                                locations: true,
                                driverAssignments: {
                                    select: {
                                        driverId: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        // If the load is not found, return 404
        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        // Update the route leg with the new data
        const routeLegId = String(req.query.legid);
        const updatedRoute = await prisma.routeLeg.update({
            where: {
                id: routeLegId,
            },
            data: {
                driverInstructions: routeLeg.driverInstructions,
                driverAssignments: {
                    deleteMany: {},
                    create: routeLeg.driverAssignments.map((driver) => ({ driverId: driver.driverId })),
                },
                locations: {
                    disconnect: load.route.routeLegs[0].locations.map((location) => ({ id: location.id })),
                    connect: routeLeg.locations.map((location) => ({ id: location.id })),
                },
            },
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
        });

        // If the route assignment not updated then no data will be returned, return 404
        if (!updatedRoute) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Route assignment not found' }],
            });
        }

        // return the updated route leg
        return res.status(200).json({
            code: 200,
            data: { updatedRoute },
        });
    }

    async function _patch() {
        const session = await getServerSession(req, res, authOptions);

        // Validate request body
        const { routeLegStatus, loadId } = req.body as {
            routeLegStatus: LoadLegStatus;
            loadId: string;
        };

        // Check if the load exists and is assigned to the carrier
        const load = await prisma.load.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
                route: {
                    id: { not: undefined },
                    routeLegs: {
                        some: { id: { equals: String(req.query.legid) } },
                    },
                },
            },
            select: {
                route: {
                    select: {
                        routeLegs: {
                            where: { id: String(req.query.legid) },
                            select: {
                                startedAt: true,
                                endedAt: true,
                            },
                        },
                    },
                },
            },
        });

        // If the load is not found, return 404
        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        // Update the route leg status
        const routeLegId = String(req.query.legid);

        let _startedAt;
        let _endedAt;

        switch (routeLegStatus) {
            case LoadLegStatus.ASSIGNED:
                console.log('changing leg status to assigned');
                _startedAt = null;
                _endedAt = null;
                break;
            case LoadLegStatus.STARTED:
                console.log('changing leg status to started');
                _startedAt = new Date();
                _endedAt = null;
                break;
            default:
                console.log('changing leg status to completed');
                _startedAt = load.route.routeLegs[0].startedAt ?? new Date();
                _endedAt = new Date();
                break;
        }

        const updatedRouteLegStatus = await prisma.routeLeg.update({
            where: {
                id: routeLegId,
            },
            data: {
                startedAt: _startedAt,
                endedAt: _endedAt,
            },
            select: {
                id: true,
            },
        });

        // If the route assignment not updated then no data will be returned, return 404
        if (!updatedRouteLegStatus) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Route assignment not found' }],
            });
        }

        // return the updated route leg
        return res.status(200).json({
            code: 200,
            data: { result: 'success' },
        });
    }
}
