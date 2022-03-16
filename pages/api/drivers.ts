import { Driver } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { JSONResponse } from '../../interfaces/models';
import { calcPaginationMetadata } from '../../lib/pagination';
import prisma from '../../lib/prisma';

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
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const session = await getSession({ req });

        const sortBy = req.query.sortBy as string;
        const sortDir = (req.query.sortDir as string) || 'asc';

        const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;
        const offset = req.query.offset !== undefined ? Number(req.query.offset) : undefined;

        if (limit != null || offset != null) {
            if (limit == null || offset == null) {
                return res.status(400).send({
                    errors: [{ message: 'Limit and Offset must be set together' }],
                });
            }

            if (isNaN(limit) || isNaN(offset)) {
                return res.status(400).send({
                    errors: [{ message: 'Invalid limit or offset' }],
                });
            }
        }

        const total = await prisma.driver.count({
            where: {
                carrierId: session?.user?.carrierId,
            },
        });

        const metadata = calcPaginationMetadata({ total, limit, offset });

        const drivers = await prisma.driver.findMany({
            where: {
                carrierId: session?.user?.carrierId,
            },
            ...(limit ? { take: limit } : { take: 10 }),
            ...(offset ? { skip: offset } : { skip: 0 }),
            orderBy: buildOrderBy(sortBy, sortDir) || {
                createdAt: 'desc',
            },
        });
        return res.status(200).json({
            data: { metadata, drivers },
        });
    }

    async function _post() {
        try {
            const session = await getSession({ req });
            const driverData = req.body as Driver;

            const driver = await prisma.driver.create({
                data: {
                    name: driverData.name,
                    email: driverData.email || '',
                    phone: driverData.phone || '',
                    carrier: {
                        connect: {
                            id: session.user.carrierId,
                        },
                    },
                },
            });
            return res.status(200).json({
                data: { driver },
            });
        } catch (error) {
            console.log('driver post error', error);
            return res.status(400).json({
                errors: [{ message: error }],
            });
        }
    }
}
