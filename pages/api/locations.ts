import { Location } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { ParsedUrlQuery } from 'querystring';
import { JSONResponse } from '../../interfaces/models';
import { PaginationMetadata } from '../../interfaces/table';
import { calcPaginationMetadata } from '../../lib/pagination';
import prisma from '../../lib/prisma';
import { authOptions } from './auth/[...nextauth]';

const buildOrderBy = (sortBy: string, sortDir: string) => {
    if (sortBy && sortDir) {
        if (sortBy.includes('.')) {
            const split = sortBy.split('.');
            return {
                [split[0]]: {
                    [split[1]]: sortDir,
                },
            };
        }
        return { [sortBy]: sortDir };
    }
    return undefined;
};

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'POST':
            return _post();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const response = await getLocations({ req, res, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _post() {
        try {
            const session = await getServerSession(req, res, authOptions);
            const locationData = req.body as Location;

            // Check if a location with the same name and carrierId already exists
            const existingLocation = await prisma.location.findFirst({
                where: {
                    name: locationData.name,
                    carrierId: session.user.defaultCarrierId,
                },
            });

            // If the location exists, return an error response
            if (existingLocation) {
                return res.status(409).json({
                    code: 409,
                    errors: [{ message: 'A location with the given name already exists.' }],
                });
            }

            const location = await prisma.location.create({
                data: {
                    name: locationData.name,
                    street: locationData.street,
                    city: locationData.city,
                    state: locationData.state,
                    zip: locationData.zip,
                    country: locationData.country,
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    carrier: {
                        connect: {
                            id: session.user.defaultCarrierId,
                        },
                    },
                },
            });
            return res.status(200).json({
                code: 200,
                data: { location },
            });
        } catch (error) {
            console.log('location post error', error);
            return res.status(400).json({
                code: 400,
                errors: [{ message: error.message || JSON.stringify(error) }],
            });
        }
    }
}

export const getLocations = async ({
    req,
    res,
    query,
}: {
    req: NextApiRequest;
    res: NextApiResponse<JSONResponse<Location[]>>;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ locations: Location[]; metadata: PaginationMetadata }>> => {
    const session = await getServerSession(req, res, authOptions);

    const sortBy = query.sortBy as string;
    const sortDir = (query.sortDir as string) || 'asc';

    const limit = query.limit !== undefined ? Number(query.limit) : undefined;
    const offset = query.offset !== undefined ? Number(query.offset) : undefined;

    if (limit != null || offset != null) {
        if (limit == null || offset == null) {
            return {
                code: 400,
                errors: [{ message: 'Limit and Offset must be set together' }],
            };
        }

        if (isNaN(limit) || isNaN(offset)) {
            return {
                code: 400,
                errors: [{ message: 'Invalid limit or offset' }],
            };
        }
    }

    const total = await prisma.location.count({
        where: {
            carrierId: session.user.defaultCarrierId,
        },
    });

    const metadata = calcPaginationMetadata({ total, limit, offset });

    const locations = await prisma.location.findMany({
        where: {
            carrierId: session.user.defaultCarrierId,
        },
        ...(limit ? { take: limit } : { take: 10 }),
        ...(offset ? { skip: offset } : { skip: 0 }),
        orderBy: buildOrderBy(sortBy, sortDir) || {
            createdAt: 'desc',
        },
    });
    return {
        code: 200,
        data: { metadata, locations },
    };
};