import { Driver } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedDriver, JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Session } from 'next-auth';

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
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const session = await getServerSession(req, res, authOptions);
        const response = await getDriver({ session, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _put() {
        const session = await getServerSession(req, res, authOptions);

        const driver = await prisma.driver.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
            },
        });

        if (!driver) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Driver not found' }],
            });
        }

        const driverData = req.body as ExpandedDriver;

        const updatedDriver = await prisma.driver.update({
            where: {
                id: String(req.query.id),
            },
            data: {
                name: driverData.name,
                email: driverData.email || '',
                phone: driverData.phone || '',
                defaultChargeType: driverData.defaultChargeType,
                perMileRate: driverData.perMileRate,
                perHourRate: driverData.perHourRate,
                defaultFixedPay: driverData.defaultFixedPay,
                takeHomePercent: driverData.takeHomePercent,
            },
        });

        return res.status(200).json({
            code: 200,
            data: { updatedDriver },
        });
    }

    async function _delete() {
        const session = await getServerSession(req, res, authOptions);

        const driver = await prisma.driver.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
            },
        });

        if (!driver) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Driver not found' }],
            });
        }

        await prisma.driver.delete({
            where: {
                id: String(req.query.id),
            },
        });

        return res.status(200).send({
            code: 200,
            data: { result: 'Driver deleted' },
        });
    }
}

const getDriver = async ({
    session,
    query,
}: {
    session: Session;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ driver: Driver }>> => {
    const driver = await prisma.driver.findFirst({
        where: {
            id: String(query.id),
            carrierId: session.user.defaultCarrierId,
        },
    });
    return {
        code: 200,
        data: { driver },
    };
};
