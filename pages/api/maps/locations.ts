import { IncomingMessage } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ParsedUrlQuery } from 'querystring';
import { JSONResponse, LocationEntry } from '../../../interfaces/models';

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
}): Promise<JSONResponse<{ locations: LocationEntry[] }>> => {
    const session = await getSession({ req });

    if (!session || !session.user) {
        return {
            code: 400,
            errors: [{ message: 'No session found' }],
        };
    }

    const params = new URLSearchParams({
        access_token: process.env.MAPBOX_TOKEN,
        types: 'address',
        country: 'us,ca',
        proximity: 'ip',
    });

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query.q}.json?${params.toString()}`;
    const response = await fetch(url);
    const json = await response.json();

    const findValueInContext = (name: string, context: any[], keyToReturn = 'text'): string => {
        const feature = context.find((x) => x.id.includes(`${name}.`));
        if (!feature) {
            return null;
        }
        return feature[keyToReturn];
    };

    const locations: LocationEntry[] = json?.features
        ?.map((feature: any) => {
            const place = findValueInContext('place', feature.context);
            if (!place) {
                return null;
            }

            const regionCode = findValueInContext('region', feature.context, 'short_code');
            const regionText = findValueInContext('region', feature.context);
            const countryCode = findValueInContext('country', feature.context, 'short_code')?.toUpperCase();
            const countryText = findValueInContext('country', feature.context);
            return {
                street: feature.place_name.split(',')[0],
                city: place,
                region: {
                    shortCode: regionCode,
                    text: regionText,
                },
                zip: findValueInContext('postcode', feature.context),
                country: {
                    shortCode: countryCode,
                    text: countryText,
                },
                longitude: feature.center[0],
                latitude: feature.center[1],
            } as LocationEntry;
        })
        .filter((x) => x);

    return {
        code: 200,
        data: { locations: locations },
    };
};
