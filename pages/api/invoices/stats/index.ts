import { InvoiceStatus, Prisma } from '@prisma/client';
import { IncomingMessage } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ParsedUrlQuery } from 'querystring';
import { JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';

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
        const response = await getInvoiceStats({ req });
        return res.status(response.code).json(response);
    }
}

export const getInvoiceStats = async ({
    req,
}: {
    req: IncomingMessage;
}): Promise<JSONResponse<{ stats: { totalPaid: number; totalUnpaid: number; totalOverdue: number } }>> => {
    const session = await getSession({ req });

    const now = new Date();
    const totalAmountPaidThisMonth = await prisma.invoice.groupBy({
        by: ['userId'],
        where: {
            userId: session.user.id,
            status: InvoiceStatus.PAID,
            invoicedAt: {
                gte: new Date(now.getFullYear(), now.getMonth(), 1),
            },
        },
        _sum: {
            totalAmount: true,
        },
    });

    const totalAmountUnpaid = await prisma.invoice.groupBy({
        by: ['userId'],
        where: {
            userId: session.user.id,
            status: {
                notIn: [InvoiceStatus.PAID],
            },
        },
        _sum: {
            totalAmount: true,
        },
    });

    const totalAmountOverdue = await prisma.invoice.groupBy({
        by: ['userId'],
        where: {
            userId: session.user.id,
            dueDate: {
                lt: new Date(),
            },
            status: {
                in: [InvoiceStatus.NOT_PAID, InvoiceStatus.PARTIALLY_PAID],
            },
        },
        _sum: {
            totalAmount: true,
        },
    });

    console.log('totalAmountPaidThisMonth', totalAmountPaidThisMonth);
    console.log('totalAmountUnpaid', totalAmountUnpaid);
    console.log('totalAmountOverdue', totalAmountOverdue);

    const totalPaid = totalAmountPaidThisMonth.find((status) => status.userId === session.user.id)?._sum.totalAmount;
    const totalUnpaid = totalAmountUnpaid.find((status) => status.userId === session.user.id)?._sum.totalAmount;
    const totalOverdue = totalAmountOverdue.find((status) => status.userId === session.user.id)?._sum.totalAmount;

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
