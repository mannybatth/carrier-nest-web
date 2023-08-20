import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../interfaces/models';
import { calcPaginationMetadata } from '../../../../lib/pagination';
import prisma from '../../../../lib/prisma';
import { authOptions } from '../../auth/[...nextauth]';

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

    // Get list of activity for a load
    async function _get() {
        const session = await getServerSession(req, res, authOptions);

        const { id } = req.query;

        const limit = req.query.limit !== undefined ? Number(req.query.limit) : 10;
        const offset = req.query.offset !== undefined ? Number(req.query.offset) : 0;

        const total = await prisma.loadActivity.count({
            where: {
                loadId: id as string,
                carrierId: session.user.defaultCarrierId,
            },
        });

        const metadata = calcPaginationMetadata({ total, limit, offset });

        const activity = await prisma.loadActivity.findMany({
            where: {
                loadId: id as string,
                carrierId: session.user.defaultCarrierId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            skip: offset,
            include: {
                actorUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                actorDriver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                actionDocument: {
                    select: {
                        id: true,
                        fileKey: true,
                        fileUrl: true,
                        fileName: true,
                        fileType: true,
                    },
                },
                actionDriver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return res.status(200).json({
            code: 200,
            data: {
                metadata,
                activity,
            },
        });
    }
}
