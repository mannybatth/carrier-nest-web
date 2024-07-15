import { LoadActivity, LoadActivityAction } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { ExpandedRouteLeg, JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';
import { de } from 'date-fns/locale';
import { LoadLegStatus } from 'pages/loads/[id]';

// export default handler;

// function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
//     switch (req.method) {
//         case 'DELETE':
//             return _delete();
//         case 'PUT':
//             return _update();
//         case 'PATCH':
//             return _patch();
//         default:
//             return res.status(405).send({
//                 code: 405,
//                 errors: [{ message: `Method ${req.method} Not Allowed` }],
//             });
//     }

//     async function _delete() {
//         const session = await getServerSession(req, res, authOptions);

//         const load = await prisma.load.findFirst({
//             where: {
//                 id: String(req.query.id),
//                 carrierId: session.user.defaultCarrierId,
//                 route: {
//                     id: { not: undefined },
//                     routeLegs: {
//                         some: { id: { equals: String(req.query.legid) } },
//                     },
//                 },
//             },
//             select: {
//                 id: true,
//                 carrierId: true,
//                 route: {
//                     select: {
//                         id: true,
//                         routeLegs: {
//                             orderBy: { createdAt: 'desc' },
//                             select: {
//                                 id: true,
//                                 driverAssignments: {
//                                     select: {
//                                         driverId: true,
//                                         driver: true,
//                                     },
//                                 },
//                             },
//                         },
//                     },
//                 },
//             },
//         });

//         if (!load) {
//             return res.status(404).send({
//                 code: 404,
//                 errors: [{ message: 'Load not found' }],
//             });
//         }

//         const routeLegId = String(req.query.legid);
//         const route = await prisma.route.findFirst({
//             where: {
//                 loadId: req.query.id as string,
//                 routeLegs: {
//                     some: { id: routeLegId },
//                 },
//             },
//         });

//         if (!route) {
//             return res.status(404).send({
//                 code: 404,
//                 errors: [{ message: 'Route assignment not found' }],
//             });
//         }

//         const updatedLoad = await prisma.routeLeg.delete({
//             where: {
//                 id: routeLegId,
//             },
//         });

//         await prisma.loadActivity.create({
//             data: {
//                 load: {
//                     connect: {
//                         id: load.id,
//                     },
//                 },
//                 carrierId: load.carrierId,
//                 action: LoadActivityAction.REMOVE_ASSIGNMENT,
//                 actorUser: {
//                     connect: {
//                         id: session.user.id,
//                     },
//                 },
//             },
//         });

//         const loadActivityArray: LoadActivity[] = load.route.routeLegs
//             .find((leg) => leg.id === req.query.legid)
//             .driverAssignments.map((driver) => ({
//                 loadId: req.query.id as string,
//                 carrierId: session.user.defaultCarrierId,
//                 action: LoadActivityAction.REMOVE_DRIVER_FROM_ASSIGNMENT,
//                 actorUserId: session.user.id,
//                 actionDriverId: driver.driverId,
//                 actionDriverName: driver.driver?.name,
//             })) as unknown as LoadActivity[];

//         await prisma.loadActivity.createMany({
//             data: [...loadActivityArray],
//         });

//         return res.status(200).json({
//             code: 200,
//             data: { updatedLoad },
//         });
//     }

//     async function _update() {
//         const session = await getServerSession(req, res, authOptions);

//         // Validate request body
//         const { routeLeg, loadId, sendSMS } = req.body as {
//             routeLeg: ExpandedRouteLeg;
//             loadId: string;
//             sendSMS: boolean;
//         };

//         // Check if the load exists and is assigned to the carrier
//         const load = await prisma.load.findFirst({
//             where: {
//                 id: String(req.query.id),
//                 carrierId: session.user.defaultCarrierId,
//                 route: {
//                     id: { not: undefined },
//                     routeLegs: {
//                         some: { id: { equals: String(req.query.legid) } },
//                     },
//                 },
//             },
//             select: {
//                 route: {
//                     select: {
//                         routeLegs: {
//                             where: { id: String(req.query.legid) },
//                             select: {
//                                 locations: true,
//                                 driverAssignments: {
//                                     select: {
//                                         driverId: true,
//                                     },
//                                 },
//                             },
//                         },
//                     },
//                 },
//             },
//         });

//         // If the load is not found, return 404
//         if (!load) {
//             return res.status(404).send({
//                 code: 404,
//                 errors: [{ message: 'Load not found' }],
//             });
//         }

//         // Update the route leg with the new data
//         const routeLegId = String(req.query.legid);
//         const updatedRoute = await prisma.routeLeg.update({
//             where: {
//                 id: routeLegId,
//             },
//             data: {
//                 driverInstructions: routeLeg.driverInstructions,
//                 scheduledDate: routeLeg.scheduledDate || undefined,
//                 scheduledTime: routeLeg.scheduledTime || undefined,
//                 driverAssignments: {
//                     deleteMany: {},
//                     create: routeLeg.driverAssignments.map((driver) => ({ driverId: driver.driverId })),
//                 },
//                 locations: {
//                     disconnect: load.route.routeLegs[0].locations.map((location) => ({ id: location.id })),
//                     connect: routeLeg.locations.map((location) => ({ id: location.id })),
//                 },
//             },
//             select: {
//                 id: true,
//                 driverInstructions: true,
//                 locations: { select: { id: true } },
//                 scheduledDate: true,
//                 scheduledTime: true,
//                 startedAt: true,
//                 startLatitude: true,
//                 startLongitude: true,
//                 endedAt: true,
//                 endLatitude: true,
//                 endLongitude: true,
//                 driverAssignments: {
//                     select: {
//                         driverId: true,
//                         assignedAt: true,
//                         driver: true,
//                     },
//                 },
//             },
//         });

//         // If the route assignment not updated then no data will be returned, return 404
//         if (!updatedRoute) {
//             return res.status(404).send({
//                 code: 404,
//                 errors: [{ message: 'Route assignment not found' }],
//             });
//         }

//         await prisma.loadActivity.create({
//             data: {
//                 load: {
//                     connect: {
//                         id: loadId,
//                     },
//                 },
//                 carrierId: session.user.defaultCarrierId,
//                 action: LoadActivityAction.UPDATED_ASSIGNMENT,
//                 actorUser: {
//                     connect: {
//                         id: session.user.id,
//                     },
//                 },
//             },
//         });

//         // return the updated route leg
//         return res.status(200).json({
//             code: 200,
//             data: { updatedRoute },
//         });
//     }

//     async function _patch() {
//         const session = await getServerSession(req, res, authOptions);

//         // Validate request body
//         const { routeLegStatus, loadId, driverId, lattitue, longitude } = req.body as {
//             routeLegStatus: LoadLegStatus;
//             loadId: string;
//             driverId: string;
//             lattitue: number;
//             longitude: number;
//         };

//         // Check if the load exists and is assigned to the carrier
//         const load = await prisma.load.findFirst({
//             where: {
//                 id: String(req.query.id),
//                 carrierId: session.user.defaultCarrierId,
//                 route: {
//                     id: { not: undefined },
//                     routeLegs: {
//                         some: { id: { equals: String(req.query.legid) } },
//                     },
//                 },
//             },
//             select: {
//                 status: true,
//                 route: {
//                     select: {
//                         routeLegs: {
//                             orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
//                             select: {
//                                 id: true,
//                                 startedAt: true,
//                                 endedAt: true,
//                             },
//                         },
//                     },
//                 },
//             },
//         });

//         // If the load is not found, return 404
//         if (!load) {
//             return res.status(404).send({
//                 code: 404,
//                 errors: [{ message: 'Load not found' }],
//             });
//         }

//         // Update the route leg status
//         const routeLegId = String(req.query.legid);

//         let _startedAt;
//         let _endedAt;

//         // Lookup the route leg status and update the startedAt and endedAt dates accordingly
//         switch (routeLegStatus) {
//             case LoadLegStatus.ASSIGNED:
//                 console.log('changing leg status to assigned');
//                 _startedAt = null;
//                 _endedAt = null;
//                 break;
//             case LoadLegStatus.STARTED:
//                 console.log('changing leg status to started');
//                 _startedAt = new Date();
//                 _endedAt = null;
//                 break;
//             default:
//                 console.log('changing leg status to completed');
//                 _startedAt = load.route.routeLegs[0].startedAt ?? new Date();
//                 _endedAt = new Date();
//                 break;
//         }

//         const updatedRouteLegStatus = await prisma.routeLeg.update({
//             where: {
//                 id: routeLegId,
//             },
//             data: {
//                 startedAt: _startedAt,
//                 endedAt: _endedAt,
//                 ...(routeLegStatus === LoadLegStatus.ASSIGNED
//                     ? {
//                           startLatitude: null,
//                           startLongitude: null,
//                           endLatitude: null,
//                           endLongitude: null,
//                       }
//                     : {}),
//                 ...(routeLegStatus === LoadLegStatus.STARTED
//                     ? {
//                           startLatitude: lattitue || null,
//                           startLongitude: longitude || null,
//                           endLatitude: null,
//                           endLongitude: null,
//                       }
//                     : {}),
//                 ...(routeLegStatus === LoadLegStatus.COMPLETED
//                     ? { endLatitude: lattitue || null, endLongitude: longitude || null }
//                     : {}),
//             },
//             select: {
//                 id: true,
//             },
//         });

//         // If the route assignment not updated then no data will be returned, return 404
//         if (!updatedRouteLegStatus) {
//             return res.status(404).send({
//                 code: 404,
//                 errors: [{ message: 'Route assignment not found' }],
//             });
//         }

//         await prisma.loadActivity.create({
//             data: {
//                 load: {
//                     connect: {
//                         id: loadId,
//                     },
//                 },
//                 carrierId: session.user.defaultCarrierId,
//                 action: LoadActivityAction.CHANGE_ASSIGNMENT_STATUS,
//                 actorUser: {
//                     connect: {
//                         id: session.user.id,
//                     },
//                 },
//             },
//         });

//         // Get count route legs
//         const routeLegsCount = load.route.routeLegs.length;
//         const routeLeg = load.route.routeLegs.find((leg) => leg.id === req.query.legid);
//         const routeLegIndex = load.route.routeLegs.findIndex((leg) => leg.id === req.query.legid);

//         let loadStatus = load.status;

//         // If this is the first leg, update load status to in progress
//         // if this is the last leg, update load status to delevered
//         if (routeLeg) {
//             // if this is the anyleg (not last one, update load status to in progress
//             if (
//                 routeLegIndex !== routeLegsCount - 1 &&
//                 load.status === 'CREATED' &&
//                 (routeLegStatus === LoadLegStatus.STARTED || routeLegStatus === LoadLegStatus.COMPLETED)
//             ) {
//                 // update load status to in progress
//                 loadStatus = 'IN_PROGRESS';
//                 await prisma.load.update({
//                     where: {
//                         id: loadId,
//                     },
//                     data: {
//                         status: 'IN_PROGRESS',
//                     },
//                 });
//             } else if (
//                 routeLegIndex === routeLegsCount - 1 &&
//                 routeLegStatus === LoadLegStatus.COMPLETED &&
//                 load.status !== 'DELIVERED'
//             ) {
//                 // update load status to delivered
//                 loadStatus = 'DELIVERED';
//                 await prisma.load.update({
//                     where: {
//                         id: loadId,
//                     },
//                     data: {
//                         status: 'DELIVERED',
//                     },
//                 });
//             }
//         }

//         // return the updated route leg
//         return res.status(200).json({
//             code: 200,
//             data: { loadStatus: loadStatus },
//         });
//     }
// }
