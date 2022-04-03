import { InvoiceStatus, Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { JSONResponse } from '../../../../../interfaces/models';
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
                    userId: session.user.id,
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
                    orderBy: {
                        paidAt: 'desc',
                    },
                },
            },
        });

        const paidAmount = invoice.payments.reduce((acc, payment) => acc.add(payment.amount), new Prisma.Decimal(0));
        const lastPaidDate = invoice.payments.length > 0 ? invoice.payments[0].paidAt : null;

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
                id: Number(req.query.id),
            },
            data: {
                paidAmount,
                status: newStatus,
                lastPaymentAt: lastPaidDate,
            },
        });

        return res.status(200).send({
            data: { result: 'Invoice payment deleted' },
        });
    }
}
