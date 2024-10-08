import { InvoiceStatus, Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _delete() {
        const session = await getServerSession(req, res, authOptions);

        const payment = await prisma.invoicePayment.findFirst({
            where: {
                id: String(req.query.pid),
                invoice: {
                    id: String(req.query.id),
                    carrierId: session.user.defaultCarrierId,
                },
            },
        });

        if (!payment) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Invoice payment not found' }],
            });
        }

        await prisma.invoicePayment.delete({
            where: {
                id: String(req.query.pid),
            },
        });

        const invoice = await prisma.invoice.findFirst({
            where: {
                id: String(req.query.id),
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

        // No negative value allowed
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
                id: String(req.query.id),
            },
            data: {
                paidAmount,
                remainingAmount,
                status: newStatus,
                lastPaymentAt: lastPaidDate,
            },
        });

        return res.status(200).send({
            code: 200,
            data: { result: 'Invoice payment deleted' },
        });
    }
}
