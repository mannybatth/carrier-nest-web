import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';
import Twilio from 'twilio';
import { LoadActivityAction } from '@prisma/client';

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
        const { driverIds = [], sendSMS } = req.body as { driverIds: string[]; sendSMS: boolean };

        const load = await prisma.load.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
            },
            include: sendSMS
                ? {
                      customer: true,
                      shipper: true,
                      receiver: true,
                  }
                : undefined,
        });

        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const drivers = await prisma.driver.findMany({
            where: {
                id: {
                    in: driverIds,
                },
            },
        });

        if (drivers.length !== driverIds.length) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Driver(s) not found' }],
            });
        }

        console.log('Assigning drivers to load', load.id, driverIds);

        const updatedLoad = await prisma.load.update({
            where: {
                id: load.id,
            },
            data: {
                drivers: {
                    connect: driverIds.map((id) => ({ id })),
                },
            },
        });

        for (const driver of drivers) {
            await prisma.loadActivity.create({
                data: {
                    load: {
                        connect: {
                            id: load.id,
                        },
                    },
                    carrierId: load.carrierId,
                    action: LoadActivityAction.ASSIGN_DRIVER,
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
        }

        // Send SMS to driver
        if (sendSMS) {
            for (const driver of drivers) {
                if (!driver.phone) {
                    continue;
                }
                const linkToLoad = `${process.env.NEXT_PUBLIC_VERCEL_URL}/l/${load.id}?did=${driver.id}`;
                const textMessage = `You have been assigned to a load!

${load.customer.name}
${load.shipper.city}, ${load.shipper.state} to ${load.receiver.city}, ${load.receiver.state}
Pick up: ${new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: '2-digit',
                }).format(new Date(load.shipper.date))} at ${load.shipper.time}

View Load: ${linkToLoad}`;

                await client.messages.create({
                    body: textMessage,
                    from: '+18883429736',
                    to: driver.phone,
                });
            }
        }

        return res.status(200).json({
            code: 200,
            data: { updatedLoad },
        });
    }
}
