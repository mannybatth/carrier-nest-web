import { Customer } from '@prisma/client';
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
        console.log(req.query);
        const customers: Customer[] =
            await prisma.$queryRaw`SELECT id, name, similarity(name, '${req.query.name}') FROM "Customer" WHERE name % '${req.query.name}'`;

        return res.status(200).json({
            data: customers,
        });
    }
}
