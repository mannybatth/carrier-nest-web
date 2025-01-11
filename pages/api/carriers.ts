import { Carrier } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../interfaces/models';
import prisma from '../../lib/prisma';
import { authOptions } from './auth/[...nextauth]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'POST':
            return _post();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        try {
            const session = await getServerSession(req, res, authOptions);

            // Get carriers for session user
            const carriers = await prisma.carrier.findMany({
                where: {
                    users: {
                        some: {
                            id: session.user.id,
                        },
                    },
                },
            });

            return res.status(200).json({
                code: 200,
                data: { carriers },
            });
        } catch (error) {
            console.log('carrier get error', error);
            return res.status(400).json({
                code: 400,
                errors: [{ message: error.message || JSON.stringify(error) }],
            });
        }
    }

    async function _post() {
        try {
            const session = await getServerSession(req, res, authOptions);
            const carrierData = req.body as Carrier;

            // Create carrier with subscription and connect to user in a transaction
            const [carrier] = await prisma.$transaction([
                prisma.carrier.create({
                    data: {
                        ...carrierData,
                        subscription: {
                            create: {
                                plan: 'BASIC',
                                status: 'active',
                            },
                        },
                    },
                }),
                prisma.user.update({
                    where: {
                        id: session.user.id,
                    },
                    data: {
                        defaultCarrierId: carrierData.id,
                        carriers: {
                            connect: {
                                id: carrierData.id,
                            },
                        },
                    },
                }),
            ]);

            return res.status(200).json({
                code: 200,
                data: { carrier },
            });
        } catch (error) {
            console.log('carrier post error', error);
            return res.status(400).json({
                code: 400,
                errors: [{ message: error.message || JSON.stringify(error) }],
            });
        }
    }
}
