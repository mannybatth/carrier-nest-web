import { InvoiceStatus } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const now = new Date();

    try {
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
        const totalOverdue = totalAmountOverdue.find((status) => status.carrierId === session.user.defaultCarrierId)
            ?._sum.remainingAmount;

        return NextResponse.json({
            code: 200,
            data: {
                stats: {
                    totalPaid: totalPaid?.toNumber() || 0,
                    totalUnpaid: totalUnpaid?.toNumber() || 0,
                    totalOverdue: totalOverdue?.toNumber() || 0,
                },
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
