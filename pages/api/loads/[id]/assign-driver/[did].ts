import { LoadActivityAction } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'DELETE':
            return _delete();
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
            },
        });

        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const driverId = String(req.query.did);
        const driver = await prisma.driver.findFirst({
            where: {
                id: driverId,
                carrierId: session.user.defaultCarrierId,
            },
        });

        if (!driver) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Driver not found' }],
            });
        }

        console.log('Removing driver from load', load.id, driverId);

        const updatedLoad = await prisma.load.update({
            where: {
                id: load.id,
            },
            data: {
                drivers: {
                    disconnect: [{ id: driverId }],
                },
            },
        });

        await prisma.loadActivity.create({
            data: {
                load: {
                    connect: {
                        id: load.id,
                    },
                },
                carrierId: load.carrierId,
                action: LoadActivityAction.UNASSIGN_DRIVER,
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

        return res.status(200).json({
            code: 200,
            data: { updatedLoad },
        });
    }
}
