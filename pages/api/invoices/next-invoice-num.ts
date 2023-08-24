import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import prisma from '../../../lib/prisma';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    const session = await getServerSession(req, res, authOptions);

    if (req.method === 'GET') {
        const nextInvoiceNum = await getNextInvoiceNum(session.user.defaultCarrierId);
        res.status(200).json({
            success: true,
            data: {
                nextInvoiceNum,
            },
        });
    } else {
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
}

async function getNextInvoiceNum(carrierId: string): Promise<number> {
    const lastInvoice = await prisma.invoice.findFirst({
        where: {
            carrierId,
        },
        orderBy: {
            invoiceNum: 'desc',
        },
    });

    if (!lastInvoice) {
        return 1000;
    }

    return lastInvoice.invoiceNum + 1;
}
