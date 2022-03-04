import { Customer } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../lib/prisma';

export default handler;

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
        const customers = await prisma.customer.findMany({});
        return res.status(200).json({
            data: customers,
        });
    }

    async function _post() {
        try {
            const session = await getSession({ req });
            console.log('session', session);

            const customerData = req.body as Customer;
            customerData.carrierId = session.user.carrierId;
            const customer = await prisma.customer.create({
                data: customerData,
            });
            return res.status(200).json({
                data: customer,
            });
        } catch (error) {
            return res.status(400).json({ message: error });
        }
    }

    function _delete() {
        return res.status(200).json({});
    }
}
