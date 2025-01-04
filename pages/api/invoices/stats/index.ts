import { InvoiceStatus } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';
import { authOptions } from '../../auth/[...nextauth]';

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
        const response = await getInvoiceStats({ req, res });
        return res.status(response.code).json(response);
    }
}

export const getInvoiceStats = async ({
    req,
    res,
}: {
    req: NextApiRequest;
    res: NextApiResponse<JSONResponse<any>>;
}): Promise<JSONResponse<{ stats: { totalPaid: number; totalUnpaid: number; totalOverdue: number } }>> => {
    const session = await getServerSession(req, res, authOptions);

    const now = new Date();
    const totalAmountPaidThisMonth = await prisma.invoicePayment.groupBy({
        by: ['carrierId'],
        where: {
            carrierId: session.user.defaultCarrierId,
            paidAt: {
                gte: new Date(now.getFullYear(), now.getMonth(), 1),
            },
        },
        _sum: {
            amount: true,
        },
    });

    const totalAmountUnpaid = await prisma.invoice.groupBy({
        by: ['carrierId'],
        where: {
            carrierId: session.user.defaultCarrierId,
            status: {
                in: [InvoiceStatus.NOT_PAID, InvoiceStatus.PARTIALLY_PAID],
            },
        },
        _sum: {
            remainingAmount: true,
        },
    });

    const totalAmountOverdue = await prisma.invoice.groupBy({
        by: ['carrierId'],
        where: {
            carrierId: session.user.defaultCarrierId,
            dueDate: {
                lt: new Date(),
            },
            status: {
                in: [InvoiceStatus.NOT_PAID, InvoiceStatus.PARTIALLY_PAID],
            },
            dueNetDays: {
                gt: 0,
            },
        },
        _sum: {
            remainingAmount: true,
        },
    });

    const totalPaid = totalAmountPaidThisMonth.find((status) => status.carrierId === session.user.defaultCarrierId)
        ?._sum.amount;
    const totalUnpaid = totalAmountUnpaid.find((status) => status.carrierId === session.user.defaultCarrierId)?._sum
        .remainingAmount;
    const totalOverdue = totalAmountOverdue.find((status) => status.carrierId === session.user.defaultCarrierId)?._sum
        .remainingAmount;

    return {
        code: 200,
        data: {
            stats: {
                totalPaid: totalPaid?.toNumber() || 0,
                totalUnpaid: totalUnpaid?.toNumber() || 0,
                totalOverdue: totalOverdue?.toNumber() || 0,
            },
        },
    };
};
