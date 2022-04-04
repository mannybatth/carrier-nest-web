import { InvoiceStatus, Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { JSONResponse, SimpleInvoicePayment } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'POST':
            return _post();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _post() {
        const session = await getSession({ req });

        const invoice = await prisma.invoice.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session.user.id,
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
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Invoice not found' }],
            });
        }

        const paymentData = req.body as SimpleInvoicePayment;

        console.log('payment to add', paymentData);

        const paidAmount = invoice.payments.reduce((acc, payment) => acc.add(payment.amount), new Prisma.Decimal(0));
        const newPaidAmount = paidAmount.add(paymentData.amount);

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
            where: {
                id: Number(req.query.id),
            },
            data: {
                status: newStatus,
                paidAmount: newPaidAmount,
                lastPaymentAt: new Date(),
                payments: {
                    create: [paymentData],
                },
            },
        });

        return res.status(200).json({
            code: 200,
            data: { updatedInvoice },
        });
    }
}
