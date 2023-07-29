import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';
import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = Twilio(accountSid, authToken);

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

        if (!driverId || driverId === 'null') {
            console.log('Remove assigned driver from load', load.id);

            const updatedLoad = await prisma.load.update({
                where: { id: load.id },
                data: { driverId: null },
            });

            return res.status(200).json({
                code: 200,
                data: { updatedLoad },
            });
        }

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

        // Send SMS to driver
        const linkToLoad = `${process.env.NEXT_PUBLIC_VERCEL_URL}/l/${load.id}`;
        const textMessage = `You have been assigned to a load: ${linkToLoad}`;
        const message = await client.messages.create({
            body: textMessage,
            from: '+18883429736',
            to: driver.phone,
        });

        console.log('SMS sent to driver', message.sid, textMessage);

        return res.status(200).json({
            code: 200,
            data: { updatedLoad },
        });
    }
}
