import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';
import { authOptions } from '../auth/[...nextauth]';
import { RouteLegStatus, LoadActivityAction } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({
            code: 401,
            errors: [{ message: 'Unauthorized' }],
        });
    }

    switch (req.method) {
        case 'PATCH':
            return _patch(req, res);
        default:
            return res.status(405).json({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }
}

async function _patch(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    try {
        const session = await getServerSession(req, res, authOptions);

        const routeLegId = req.query.id as string;
        const { routeLegStatus } = req.body;

        if (!routeLegId || !routeLegStatus) {
            return res.status(400).json({
                code: 400,
                errors: [{ message: 'Missing required fields' }],
            });
        }

        if (!Object.values(RouteLegStatus).includes(routeLegStatus)) {
            return res.status(400).json({
                code: 400,
                errors: [{ message: 'Invalid routeLegStatus' }],
            });
        }

        const updates = await prisma.$transaction(async (prisma) => {
            const routeLeg = await prisma.routeLeg.update({
                where: { id: routeLegId },
                data: { status: routeLegStatus },
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
                },
            });

            // Create LoadActivity for status change
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
                    actorUser: {
                        connect: {
                            id: session.user.id,
                        },
                    },
                },
            });

            // Optionally, update the load status based on route leg status changes
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

        return res.status(200).json({
            code: 200,
            data: {
                routeLeg: updates.routeLeg,
                loadStatus: updates.loadStatus,
            },
        });
    } catch (error) {
        console.error('Error updating route leg status:', error);
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
