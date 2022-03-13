import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ExpandedDriver, JSONResponse } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'PUT':
            return _put();
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).send({
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const session = await getSession({ req });

        const expand = req.query.expand as string;
        const expandLoads = expand?.includes('loads');

        const driver = await prisma.driver.findFirst({
            where: {
                id: Number(req.query.id),
                carrierId: session?.user?.carrierId,
            },
            ...(expand
                ? {
                      include: {
                          ...(expandLoads
                              ? {
                                    loads: {
                                        select: {
                                            id: true,
                                            customer: true,
                                            refNum: true,
                                            rate: true,
                                            distance: true,
                                            distanceUnit: true,
                                            shipper: true,
                                            receiver: true,
                                            stops: true,
                                        },
                                    },
                                }
                              : {}),
                      },
                  }
                : {}),
        });
        return res.status(200).json({
            data: { driver },
        });
    }

    async function _put() {
        const session = await getSession({ req });

        const driver = await prisma.driver.findFirst({
            where: {
                id: Number(req.query.id),
                carrierId: session?.user?.carrierId,
            },
        });

        if (!driver) {
            return res.status(404).send({
                errors: [{ message: 'Driver not found' }],
            });
        }

        const driverData = req.body as ExpandedDriver;

        console.log('driver to update', driverData);

        const updatedDriver = await prisma.driver.update({
            where: {
                id: Number(req.query.id),
            },
            data: {
                name: driverData.name,
                email: driverData.email || '',
                phone: driverData.phone || '',
            },
        });

        return res.status(200).json({
            data: { updatedDriver },
        });
    }

    async function _delete() {
        const session = await getSession({ req });

        const driver = await prisma.driver.findFirst({
            where: {
                id: Number(req.query.id),
                carrierId: session?.user?.carrierId,
            },
        });

        if (!driver) {
            return res.status(404).send({
                errors: [{ message: 'Driver not found' }],
            });
        }

        await prisma.driver.delete({
            where: {
                id: Number(req.query.id),
            },
        });

        return res.status(200).send({
            data: { result: 'Driver deleted' },
        });
    }
}
