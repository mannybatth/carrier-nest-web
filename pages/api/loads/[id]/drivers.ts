import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';
import { authOptions } from '../../auth/[...nextauth]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    // Get list of drivers assigned to load
    async function _get() {
        const session = await getServerSession(req, res, authOptions);

        const drivers = await prisma.driver.findMany({
            where: {
                assignments: {
                    some: {
                        loadId: String(req.query.id),
                    },
                },
                carrierId: session.user.defaultCarrierId,
            },
        });

        return res.status(200).send({
            code: 200,
            data: {
                drivers,
            },
        });
    }
}
