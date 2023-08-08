import startOfDay from 'date-fns/startOfDay';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';
import { authOptions } from '../auth/[...nextauth]';

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

    async function _get() {
        const session = await getServerSession(req, res, authOptions);

        const start = startOfDay(new Date());
        const end = new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000);

        const loads = await prisma.load.findMany({
            where: {
                carrierId: session.user.defaultCarrierId,
                OR: [
                    {
                        AND: [
                            {
                                shipper: {
                                    date: {
                                        lte: new Date(),
                                    },
                                },
                            },
                            {
                                receiver: {
                                    date: {
                                        gte: start,
                                    },
                                },
                            },
                        ],
                    },
                    {
                        shipper: {
                            date: {
                                gte: start,
                                lte: end,
                            },
                        },
                    },
                ],
            },
            orderBy: {
                shipper: {
                    date: 'asc',
                },
            },
            include: {
                customer: true,
                shipper: true,
                receiver: true,
                stops: true,
                podDocuments: true,
                invoice: true,
                drivers: true,
            },
        });

        return res.status(200).send({
            code: 200,
            data: loads,
        });
    }
}
