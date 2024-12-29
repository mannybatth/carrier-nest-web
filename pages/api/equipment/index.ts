import type { NextApiRequest, NextApiResponse } from 'next';
import { ExpandedEquipment, JSONResponse } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ParsedUrlQuery } from 'querystring';
import { PaginationMetadata } from '../../../interfaces/table';
import { calcPaginationMetadata } from '../../../lib/pagination';

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
        const response = await getEquipments({ req, res, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _post() {
        const session = await getServerSession(req, res, authOptions);

        const equipmentData = req.body as ExpandedEquipment;

        const newEquipment = await prisma.equipment.create({
            data: {
                name: equipmentData.name,
                type: equipmentData.type,
                ...(equipmentData.drivers && {
                    drivers: {
                        connect: equipmentData.drivers.map((driver) => ({ id: driver.id })),
                    },
                }),
                carrierId: session.user.defaultCarrierId,
            },
        });

        return res.status(201).json({
            code: 201,
            data: { newEquipment },
        });
    }
}

const getEquipments = async ({
    req,
    res,
    query,
}: {
    req: NextApiRequest;
    res: NextApiResponse<JSONResponse<ExpandedEquipment[]>>;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ equipments: ExpandedEquipment[]; metadata: PaginationMetadata }>> => {
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

    const total = await prisma.equipment.count({
        where: {
            carrierId: session.user.defaultCarrierId,
        },
    });

    const metadata = calcPaginationMetadata({ total, limit, offset });

    const equipments = await prisma.equipment.findMany({
        where: {
            carrierId: session.user.defaultCarrierId,
        },
        ...(limit ? { take: limit } : { take: 10 }),
        ...(offset ? { skip: offset } : { skip: 0 }),
        orderBy: buildOrderBy(sortBy, sortDir) || {
            createdAt: 'desc',
        },
        include: { drivers: true },
    });

    return {
        code: 200,
        data: { metadata, equipments },
    };
};
