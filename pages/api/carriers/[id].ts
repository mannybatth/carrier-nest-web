import { Carrier } from '@prisma/client';
import { IncomingMessage } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ParsedUrlQuery } from 'querystring';
import { JSONResponse } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';

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
        const response = await getCarrier({ req, query: req.query });
        return res.status(response.code).json(response);
    }
}

export const getCarrier = async ({
    req,
    query,
}: {
    req: IncomingMessage;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ carrier: Carrier }>> => {
    const session = await getSession({ req });
    const userCarrierId = session.user?.carrierId;

    if (!userCarrierId) {
        return {
            code: 404,
            errors: [{ message: 'Carrier not found' }],
        };
    }

    const carrierIdToFind = Number(query.id);

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
