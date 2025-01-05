import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, Session } from 'next-auth';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';
import { calcPaginationMetadata } from '../../../../../lib/pagination';

const buildOrderBy = (
    sortBy: string,
    sortDir: 'asc' | 'desc',
): Prisma.Enumerable<Prisma.AssignmentPaymentOrderByWithRelationInput> => {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({
            code: 401,
            errors: [{ message: 'Unauthorized' }],
        });
    }

    switch (req.method) {
        case 'GET':
            return _get(req, res, session);
        default:
            return res.status(405).json({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }
}

async function _get(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>, session: Session) {
    try {
        const { id: driverId } = req.query;

        if (!driverId || typeof driverId !== 'string') {
            return res.status(400).json({
                code: 400,
                errors: [{ message: 'Invalid or missing driver ID' }],
            });
        }

        const carrierId = session.user.defaultCarrierId;

        const sortBy = req.query.sortBy as string;
        const sortDir = (req.query.sortDir as 'asc' | 'desc') || 'asc';
        const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;
        const offset = req.query.offset !== undefined ? Number(req.query.offset) : undefined;

        if (!carrierId) {
            return res.status(400).json({
                code: 400,
                errors: [{ message: 'Carrier ID is required' }],
            });
        }

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

        const payments = await prisma.assignmentPayment.findMany({
            where: { driverId, carrierId },
            orderBy: buildOrderBy(sortBy, sortDir) || {
                createdAt: 'desc',
            },
            ...(limit ? { take: limit } : { take: 10 }),
            ...(offset ? { skip: offset } : { skip: 0 }),
            include: {
                load: true,
            },
        });

        const total = await prisma.assignmentPayment.count({
            where: { driverId, carrierId },
        });

        const metadata = calcPaginationMetadata({
            total,
            limit: limit ? Number(limit) : 20,
            offset: offset ? Number(offset) : 0,
        });

        return res.status(200).json({
            code: 200,
            data: {
                payments,
                metadata,
            },
        });
    } catch (error) {
        console.error('Error fetching assignment payments:', error);
        return res.status(500).json({
            code: 500,
            errors: [{ message: 'Internal server error' }],
        });
    }
}
