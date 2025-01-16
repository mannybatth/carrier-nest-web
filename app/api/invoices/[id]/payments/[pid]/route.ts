import { InvoiceStatus, Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const DELETE = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const pid = req.nextUrl.searchParams.get('pid');
    const id = req.nextUrl.searchParams.get('id');

    const payment = await prisma.invoicePayment.findFirst({
        where: {
            id: String(pid),
            invoice: {
                id: String(id),
                carrierId: session.user.defaultCarrierId,
            },
        },
    });

    if (!payment) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Invoice payment not found' }] }, { status: 404 });
    }

    await prisma.invoicePayment.delete({
        where: {
            id: String(pid),
        },
    });

    const invoice = await prisma.invoice.findFirst({
        where: {
            id: String(id),
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
            id: String(id),
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
