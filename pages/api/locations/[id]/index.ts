import { Location } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { JSONResponse } from '../../../../interfaces/models';
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
        const response = await getLocation({ session, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _put() {
        const session = await getServerSession(req, res, authOptions);

        const location = await prisma.location.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
            },
        });

        if (!location) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Location not found' }],
            });
        }

        const locationData = req.body as Location;

        console.log('location to update', locationData);

        const updatedLocation = await prisma.location.update({
            where: {
                id: String(req.query.id),
            },
            data: {
                name: locationData.name,
                street: locationData.street,
                city: locationData.city,
                state: locationData.state,
                zip: locationData.zip,
                country: locationData.country,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
            },
        });

        return res.status(200).json({
            code: 200,
            data: { updatedLocation },
        });
    }

    async function _delete() {
        const session = await getServerSession(req, res, authOptions);

        const location = await prisma.location.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
            },
        });

        if (!location) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Location not found' }],
            });
        }

        await prisma.location.delete({
            where: {
                id: String(req.query.id),
            },
        });

        return res.status(200).send({
            code: 200,
            data: { result: 'Location deleted' },
        });
    }
}

const getLocation = async ({
    session,
    query,
}: {
    session: Session;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ location: Location }>> => {
    const location = await prisma.location.findFirst({
        where: {
            id: String(query.id),
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!location) {
        return {
            code: 404,
            errors: [{ message: 'Location not found' }],
        };
    }

    return {
        code: 200,
        data: { location },
    };
};
