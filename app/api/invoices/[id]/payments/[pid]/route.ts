import { InvoiceStatus, Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const DELETE = auth(async (req: NextAuthRequest, context: { params: { id: string; pid: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;

    const invoiceId = context.params.id;
    const paymentId = context.params.pid;

    const payment = await prisma.invoicePayment.findFirst({
        where: {
            id: paymentId,
            invoice: {
                id: invoiceId,
                carrierId: session.user.defaultCarrierId,
            },
        },
    });

    if (!payment) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Invoice payment not found' }] }, { status: 404 });
    }

    await prisma.invoicePayment.delete({
        where: {
            id: paymentId,
        },
    });

    const invoice = await prisma.invoice.findFirst({
        where: {
            id: invoiceId,
            carrierId: session.user.defaultCarrierId,
        },
        include: {
            payments: {
                select: {
                    id: true,
                    amount: true,
                    paidAt: true,
                },
                orderBy: {
                    paidAt: 'desc',
                },
            },
        },
    });

    const lastPaidDate = invoice.payments.length > 0 ? invoice.payments[0].paidAt : null;
    const paidAmount = invoice.payments.reduce((acc, payment) => acc.add(payment.amount), new Prisma.Decimal(0));
    let remainingAmount = invoice.totalAmount.sub(paidAmount);

    if (remainingAmount.isNegative()) {
        remainingAmount = new Prisma.Decimal(0);
    }

    const newStatus = ((): InvoiceStatus => {
        if (paidAmount.isZero()) {
            return InvoiceStatus.NOT_PAID;
        }
        if (paidAmount.lessThan(invoice.totalAmount)) {
            return InvoiceStatus.PARTIALLY_PAID;
        }
        return InvoiceStatus.PAID;
    })();

    await prisma.invoice.update({
        where: {
            id: invoiceId,
        },
        data: {
            paidAmount,
            remainingAmount,
            status: newStatus,
            lastPaymentAt: lastPaidDate,
        },
    });

    return NextResponse.json({ code: 200, data: { result: 'Invoice payment deleted' } }, { status: 200 });
});
