import { Carrier } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { ParsedUrlQuery } from 'querystring';
import { JSONResponse } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';
import { authOptions } from '../auth/[...nextauth]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'PUT':
            return _put();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const response = await getCarrier({ req, res, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _put() {
        const carrier = await getCarrier({ req, res, query: req.query });

        if (!carrier) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Carrier not found' }],
            });
        }

        const carrierData = req.body as Carrier;

        const updatedCarrier = await prisma.carrier.update({
            where: {
                id: String(req.query.id),
            },
            data: {
                name: carrierData.name,
                email: carrierData.email,
                phone: carrierData.phone,
                dotNum: carrierData.dotNum,
                mcNum: carrierData.mcNum,
                street: carrierData.street,
                city: carrierData.city,
                state: carrierData.state,
                zip: carrierData.zip,
                country: carrierData.country,
                carrierCode: carrierData.carrierCode,
            },
        });

        return res.status(200).json({
            code: 200,
            data: {
                carrier: updatedCarrier,
            },
        });
    }
}

export const getCarrier = async ({
    req,
    res,
    query,
}: {
    req: NextApiRequest;
    res: NextApiResponse<JSONResponse<any>>;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ carrier: Carrier }>> => {
    const session = await getServerSession(req, res, authOptions);
    const userCarrierId = session?.user?.defaultCarrierId;

    if (!userCarrierId) {
        return {
            code: 404,
            errors: [{ message: 'Carrier not found' }],
        };
    }

    const carrierIdToFind = String(query.id);

    if (carrierIdToFind !== userCarrierId) {
        return {
            code: 403,
            errors: [{ message: 'Unauthorized' }],
        };
    }

    const carrier = await prisma.carrier.findFirst({
        where: {
            id: carrierIdToFind,
        },
    });

    if (!carrier) {
        return {
            code: 404,
            errors: [{ message: 'Carrier not found' }],
        };
    }

    return {
        code: 200,
        data: {
            carrier,
        },
    };
};
