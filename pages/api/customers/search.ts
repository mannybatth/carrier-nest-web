import { Customer, PrismaPromise } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse, SearchResult } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';
import { authOptions } from '../auth/[...nextauth]';

export async function customerSearch(
    query: string,
    carrierId: string,
): Promise<SearchResult<{ id: string; name: string }>[]> {
    const [_, customers]: [unknown, SearchResult<{ id: string; name: string }>[]] = await prisma.$transaction([
        prisma.$queryRaw`SET pg_trgm.similarity_threshold = 0.2`,
        prisma.$queryRaw`SELECT id, name, similarity(name, ${query}) as sim FROM "Customer" WHERE name % ${query} AND "carrierId" = ${carrierId} ORDER BY sim DESC LIMIT 5`,
    ]);
    return customers.filter((c) => c.sim > 0).sort((a, b) => b.sim - a.sim);
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
        const customers = req.query.fullText ? await fullTextSearch(q) : await search(q);

        return res.status(200).json({
            code: 200,
            data: { customers },
        });
    }

    function fullTextSearch(query: string): PrismaPromise<Customer[]> {
        return prisma.customer.findMany({
            where: {
                name: {
                    search: query,
                },
            },
        });
    }

    async function search(query: string): Promise<SearchResult<{ id: string; name: string }>[]> {
        const session = await getServerSession(req, res, authOptions);
        return customerSearch(query, session.user.defaultCarrierId);
    }
}
