import { InvoiceStatus, Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Invoice ID is required' }, { status: 400 });
    }

    try {
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: String(id),
                carrierId: req.auth.user.defaultCarrierId,
            },
            include: {
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        paidAt: true,
                    },
                },
            },
        });

        if (!invoice) {
            return NextResponse.json({ code: 404, errors: [{ message: 'Invoice not found' }] }, { status: 404 });
        }

        const paymentData = (await req.json()) as Prisma.InvoicePaymentCreateInput;

        const paidAmount = invoice.payments.reduce((acc, payment) => acc.add(payment.amount), new Prisma.Decimal(0));
        const newPaidAmount = paidAmount.add(paymentData.amount as Prisma.Decimal.Value);
        let remainingAmount = invoice.totalAmount.sub(newPaidAmount);

        if (remainingAmount.isNegative()) {
            remainingAmount = new Prisma.Decimal(0);
        }

        const newStatus = ((): InvoiceStatus => {
            if (newPaidAmount.isZero()) {
                return InvoiceStatus.NOT_PAID;
            }
            if (newPaidAmount.lessThan(invoice.totalAmount)) {
                return InvoiceStatus.PARTIALLY_PAID;
            }
            return InvoiceStatus.PAID;
        })();

        const updatedInvoice = await prisma.invoice.update({
            where: { id: String(id) },
            data: {
                status: newStatus,
                paidAmount: newPaidAmount,
                remainingAmount: remainingAmount,
                lastPaymentAt: new Date(),
                payments: {
                    create: [
                        {
                            amount: paymentData.amount,
                            paidAt: paymentData.paidAt,
                            user: { connect: { id: req.auth.user.id } },
                            carrierId: req.auth.user.defaultCarrierId,
                        },
                    ],
                },
            },
        });

        return NextResponse.json({ code: 200, data: { updatedInvoice } }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
});
