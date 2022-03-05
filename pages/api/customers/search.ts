import { Customer, PrismaPromise } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { SimpleCustomer } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case 'GET':
            return _get();
        default:
            return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    async function _get() {
        const q = req.query.q as string;
        const customers: (Customer | SimpleCustomer)[] = req.query.fullText ? await fullTextSearch(q) : await search(q);

        return res.status(200).json({
            data: customers,
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

    async function search(query: string): Promise<SimpleCustomer[]> {
        type SearchResult = {
            sim: number;
        } & SimpleCustomer;
        const customers: SearchResult[] =
            await prisma.$queryRaw`SELECT id, name, similarity(name, ${query}) as sim FROM "Customer" ORDER BY sim desc LIMIT 10`;
        return customers.filter((c) => c.sim > 0);
    }
}
