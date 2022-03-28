import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ExpandedInvoice, JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).send({
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _delete() {
        const session = await getSession({ req });

        const payment = await prisma.invoicePayment.findFirst({
            where: {
                id: Number(req.query.pid),
                invoice: {
                    id: Number(req.query.id),
                    userId: session?.user?.id,
                },
            },
        });

        if (!payment) {
            return res.status(404).send({
                errors: [{ message: 'Invoice payment not found' }],
            });
        }

        await prisma.invoicePayment.delete({
            where: {
                id: Number(req.query.pid),
            },
        });

        return res.status(200).send({
            data: { result: 'Invoice payment deleted' },
        });
    }
}
