import { Driver, Load, LoadActivityAction, LoadStatus } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { ExpandedLoad, JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';
import { authOptions } from '../../auth/[...nextauth]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'PATCH':
            return _patch();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _patch() {
        let load: Load;
        let driver: Driver;

        const session = await getServerSession(req, res, authOptions);
        const tokenCarrierId = session?.user?.carrierId || session?.user?.defaultCarrierId;

        if (!session && !tokenCarrierId) {
            return res.status(401).send({
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            });
        }

        const { id } = req.query;
        const { status, driverId, longitude, latitude } = req.body as {
            status: LoadStatus;
            driverId?: string;
            longitude?: number;
            latitude?: number;
        };

        if (driverId) {
            const [_load, _driver] = await Promise.all([
                prisma.load.findFirst({
                    where: {
                        id: id as string,
                        carrierId: tokenCarrierId,
                        driverAssignments: { some: { driverId: driverId } },
                    },
                }),
                prisma.driver.findFirst({
                    where: {
                        id: driverId,
                        carrierId: tokenCarrierId,
                    },
                }),
            ]);
            load = _load;
            driver = _driver;
        } else {
            load = await prisma.load.findFirst({
                where: {
                    id: id as string,
                    carrierId: session.user.defaultCarrierId,
                },
            });
        }

        if (!load) {
            return res.status(404).json({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const fromStatus = load.status;
        const toStatus = status;

        const updatedLoad = await prisma.load.update({
            where: { id: id as string },
            data: { status },
        });

        await prisma.loadActivity.create({
            data: {
                load: {
                    connect: {
                        id: updatedLoad.id,
                    },
                },
                carrierId: updatedLoad.carrierId,
                action: LoadActivityAction.CHANGE_STATUS,
                ...(session
                    ? {
                          actorUser: {
                              connect: {
                                  id: session.user.id,
                              },
                          },
                      }
                    : {}),
                ...(driverId
                    ? {
                          actorDriver: {
                              connect: {
                                  id: driverId,
                              },
                          },
                      }
                    : {}),
                ...(driver ? { actorDriverName: driver?.name } : {}),
                fromStatus,
                toStatus,
                ...(longitude ? { longitude } : {}),
                ...(latitude ? { latitude } : {}),
            },
        });

        return res.status(200).json({
            code: 200,
            data: { load: updatedLoad as ExpandedLoad },
        });
    }
}
