import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'PUT':
            return _put();
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    async function _get() {
        const customers = await prisma.customer.findMany({});
        return res.status(200).json({
            data: customers,
        });
    }

    function _put() {
        try {
            return res.status(200).json({});
        } catch (error) {
            return res.status(400).json({ message: error });
        }
    }

    function _delete() {
        return res.status(200).json({});
    }
}
