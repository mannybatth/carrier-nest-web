import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'PATCH':
            return _patch();
        default:
            return res.status(405).send({
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _patch() {
        const session = await getSession({ req });

        const load = await prisma.load.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session.user.id,
            },
        });

        if (!load) {
            return res.status(404).send({
                errors: [{ message: 'Load not found' }],
            });
        }

        const driverId = Number(req.query.did);

        if (driverId === 0) {
            console.log('Remove assigned driver from load', load.id);

            const updatedLoad = await prisma.load.update({
                where: { id: load.id },
                data: { driverId: null },
            });

            return res.status(200).json({
                data: { updatedLoad },
            });
        }

        const driver = await prisma.driver.findFirst({
            where: {
                id: driverId,
                carrierId: session.user.carrierId,
            },
        });

        if (!driver) {
            return res.status(404).send({
                errors: [{ message: 'Driver not found' }],
            });
        }

        console.log('Assign Driver to load', driverId, load.id);

        const updatedLoad = await prisma.load.update({
            where: {
                id: load.id,
            },
            data: {
                driver: {
                    connect: {
                        id: driver.id,
                    },
                },
            },
        });

        return res.status(200).json({
            data: { updatedLoad },
        });
    }
}
