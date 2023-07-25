import { Load, PrismaPromise } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse, SearchResult } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';
import { authOptions } from '../auth/[...nextauth]';

export async function loadSearch(
    query: string,
    carrierId: string,
): Promise<SearchResult<{ id: string; refNum: string }>[]> {
    const [_, loads]: [unknown, SearchResult<{ id: string; refNum: string }>[]] = await prisma.$transaction([
        prisma.$queryRaw`SET pg_trgm.similarity_threshold = 0.2`,
        prisma.$queryRaw`SELECT id, "refNum", similarity("refNum", ${query}) as sim FROM "Load" WHERE "refNum" % ${query} AND "carrierId" = ${carrierId} ORDER BY sim desc LIMIT 5`,
    ]);
    return loads.filter((c) => c.sim > 0);
}

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
        const q = req.query.q as string;
        const loads = req.query.fullText ? await fullTextSearch(q) : await search(q);

        return res.status(200).json({
            code: 200,
            data: { loads },
        });
    }

    function fullTextSearch(query: string): PrismaPromise<Load[]> {
        return prisma.load.findMany({
            where: {
                refNum: {
                    search: query,
                },
            },
        });
    }

    async function search(query: string): Promise<SearchResult<{ id: string; refNum: string }>[]> {
        const session = await getServerSession(req, res, authOptions);
        return loadSearch(query, session.user.defaultCarrierId);
    }
}
