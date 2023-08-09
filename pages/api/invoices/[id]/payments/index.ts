import { InvoicePayment, InvoiceStatus, Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';

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
        const session = await getServerSession(req, res, authOptions);

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
                },
            },
        });

        if (!invoice) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Invoice not found' }],
            });
        }

        const paymentData = req.body as InvoicePayment;

        console.log('payment to add', paymentData);

        const paidAmount = invoice.payments.reduce((acc, payment) => acc.add(payment.amount), new Prisma.Decimal(0));
        const newPaidAmount = paidAmount.add(paymentData.amount);
        let remainingAmount = invoice.totalAmount.sub(newPaidAmount);

        // No negative value allowed
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
            where: {
                id: String(req.query.id),
            },
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
                            user: {
                                connect: {
                                    id: session.user.id,
                                },
                            },
                            carrierId: session.user.defaultCarrierId,
                        },
                    ],
                },
            },
        });

        return res.status(200).json({
            code: 200,
            data: { updatedInvoice },
        });
    }
}
