import { Driver } from '@prisma/client';
import { IncomingMessage } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ParsedUrlQuery } from 'querystring';
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
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const response = await getDriver({ req, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _put() {
        const session = await getSession({ req });

        const driver = await prisma.driver.findFirst({
            where: {
                id: Number(req.query.id),
                carrierId: session.user.carrierId,
            },
        });

        if (!driver) {
            return res.status(404).send({
                code: 404,
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
            code: 200,
            data: { updatedDriver },
        });
    }

    async function _delete() {
        const session = await getSession({ req });

        const driver = await prisma.driver.findFirst({
            where: {
                id: Number(req.query.id),
                carrierId: session.user.carrierId,
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
                id: Number(req.query.id),
            },
        });

        return res.status(200).send({
            code: 200,
            data: { result: 'Driver deleted' },
        });
    }
}

export const getDriver = async ({
    req,
    query,
}: {
    req: IncomingMessage;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ driver: Driver }>> => {
    const session = await getSession({ req });

    const driver = await prisma.driver.findFirst({
        where: {
            id: Number(query.id),
            carrierId: session.user.carrierId,
        },
    });
    return {
        code: 200,
        data: { driver },
    };
};
