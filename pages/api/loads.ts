import { Load } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../lib/prisma';

export default handler;

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

function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'POST':
            return _post();
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    async function _get() {
        const session = await getSession({ req });

        const expand = req.query.expand as string;
        const expandCustomer = expand?.includes('customer');

        const sortBy = req.query.sortBy as string;
        const sortDir = (req.query.sortDir as string) || 'asc';

        const loads = await prisma.load.findMany({
            where: {
                userId: session?.user?.id,
            },
            orderBy: buildOrderBy(sortBy, sortDir) || {
                createdAt: 'desc',
            },
            include: expandCustomer ? { customer: { select: { name: true } } } : undefined,
        });
        return res.status(200).json({
            data: loads,
        });
    }

    async function _post() {
        try {
            const session = await getSession({ req });
            const loadData = req.body as Load;

            const load = await prisma.load.create({
                data: {
                    ...loadData,
                    userId: session.user.id,
                    carrierId: session.user.carrierId,
                },
            });
            return res.status(200).json({
                data: load,
            });
        } catch (error) {
            console.log('load post error', error);
            return res.status(400).json({ message: error });
        }
    }

    function _delete() {
        return res.status(200).json({});
    }
}
