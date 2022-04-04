import { Customer, PrismaPromise } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { JSONResponse, SearchResult } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';

export async function customerSearch(query: string): Promise<SearchResult<Customer>[]> {
    const [_, customers] = await prisma.$transaction([
        prisma.$queryRaw`SET pg_trgm.similarity_threshold = 0.2`,
        prisma.$queryRaw`SELECT id, name, similarity(name, ${query}) as sim FROM "Customer" WHERE name % ${query} ORDER BY sim desc LIMIT 5`,
    ]);
    return customers.filter((c) => c.sim > 0);
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
        const customers: Customer[] = req.query.fullText ? await fullTextSearch(q) : await search(q);

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

    async function search(query: string): Promise<Customer[]> {
        return customerSearch(query);
    }
}
