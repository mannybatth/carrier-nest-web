import { Customer, PrismaPromise } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
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
        const q = req.query.query as string;
        const customers: Customer[] = req.query.fullText ? await fullTextSearch(q) : await search(q);

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

    function search(query: string): PrismaPromise<Customer[]> {
        return prisma.$queryRaw`SELECT id, name, similarity(name, '${query}') FROM "Customer" WHERE name % '${query}'`;
    }
}
