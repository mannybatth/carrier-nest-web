import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Session, getServerSession } from 'next-auth';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedInvoice, JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';
import { authOptions } from '../../auth/[...nextauth]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'PUT':
            return _put();
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const session = await getServerSession(req, res, authOptions);
        const response = await getInvoice({ session, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _put() {
        const session = await getServerSession(req, res, authOptions);

        const invoice = await prisma.invoice.findFirst({
            where: {
                id: String(req.query.id),
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

        const invoiceData = req.body as ExpandedInvoice;

        console.log('invoice to update', invoiceData);

        const dueDate = new Date(invoiceData.invoicedAt);
        dueDate.setDate(dueDate.getDate() + invoiceData.dueNetDays);

        const paidAmount = invoice.payments.reduce((acc, payment) => acc.add(payment.amount), new Prisma.Decimal(0));
        let remainingAmount = invoice.totalAmount.sub(paidAmount);

        // No negative value allowed
        if (remainingAmount.isNegative()) {
            remainingAmount = new Prisma.Decimal(0);
        }

        const updatedInvoice = await prisma.invoice.update({
            where: {
                id: String(req.query.id),
            },
            data: {
                invoiceNum: invoiceData.invoiceNum,
                totalAmount: invoiceData.totalAmount || 0,
                remainingAmount: remainingAmount,
                paidAmount: paidAmount,
                invoicedAt: invoiceData.invoicedAt,
                dueDate,
                dueNetDays: invoiceData.dueNetDays || 0,
                carrier: {
                    connect: {
                        id: session.user.defaultCarrierId,
                    },
                },
                extraItems: {
                    deleteMany: {},
                    create: invoiceData.extraItems.map((extraItem) => ({
                        title: extraItem.title,
                        amount: extraItem.amount,
                    })),
                },
            },
        });

        return res.status(200).json({
            code: 200,
            data: { updatedInvoice },
        });
    }

    async function _delete() {
        const session = await getServerSession(req, res, authOptions);

        const invoice = await prisma.invoice.findFirst({
            where: {
                id: String(req.query.id),
                userId: session.user.id,
            },
        });

        if (!invoice) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Invoice not found' }],
            });
        }

        await prisma.invoice.delete({
            where: {
                id: String(req.query.id),
            },
        });

        return res.status(200).send({
            code: 200,
            data: { result: 'Invoice deleted' },
        });
    }
}

export const getInvoice = async ({
    session,
    query,
}: {
    session?: Session;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ invoice: ExpandedInvoice }>> => {
    const expand = query.expand as string;
    const expandLoad = expand?.includes('load');
    const expandExtraItems = expand?.includes('extraItems');
    const expandPayments = expand?.includes('payments');

    const invoice = await prisma.invoice.findFirst({
        where: {
            id: String(query.id),
            carrierId: session.user.defaultCarrierId,
        },
        include: {
            ...(expandLoad
                ? {
                      load: {
                          include: {
                              customer: true,
                              shipper: true,
                              receiver: true,
                              stops: true,
                          },
                      },
                  }
                : {}),
            ...(expandExtraItems
                ? {
                      extraItems: {
                          select: {
                              id: true,
                              title: true,
                              amount: true,
                          },
                      },
                  }
                : {}),
            ...(expandPayments
                ? {
                      payments: {
                          select: {
                              id: true,
                              amount: true,
                              paidAt: true,
                          },
                      },
                  }
                : {}),
        },
    });

    if (!invoice) {
        return {
            code: 404,
            errors: [{ message: 'Invoice not found' }],
        };
    }

    return {
        code: 200,
        data: { invoice },
    };
};
