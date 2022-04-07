import { IncomingMessage } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ParsedUrlQuery } from 'querystring';
import { JSONResponse } from '../../../interfaces/models';

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
        const response = await getLocation({ req, query: req.query });
        return res.status(response.code).json(response);
    }
}

export const getLocation = async ({
    req,
    query,
}: {
    req: IncomingMessage;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ location: any }>> => {
    const session = await getSession({ req });

    if (!session || !session.user) {
        return {
            code: 400,
            errors: [{ message: 'No session found' }],
        };
    }

    // https://api.mapbox.com/geocoding/v5/mapbox.places/<text>.json?access_token=<token>&types=address&country=us%2Cca
    console.log('search', query.q);

    return {
        code: 200,
        data: { location: {} },
    };
};
