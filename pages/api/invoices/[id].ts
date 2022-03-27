import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ExpandedInvoice, JSONResponse } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';

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
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const session = await getSession({ req });

        const expand = req.query.expand as string;
        const expandLoad = expand?.includes('load');
        const expandExtraItems = expand?.includes('extraItems');

        const invoice = await prisma.invoice.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session?.user?.id,
            },
            include: {
                ...(expandLoad
                    ? {
                          load: {
                              select: {
                                  id: true,
                                  refNum: true,
                                  rate: true,
                                  distance: true,
                                  distanceUnit: true,
                                  customer: true,
                                  shipper: true,
                                  receiver: true,
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
            },
        });
        return res.status(200).json({
            data: { invoice },
        });
    }

    async function _put() {
        const session = await getSession({ req });

        const invoice = await prisma.invoice.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session?.user?.id,
            },
        });

        if (!invoice) {
            return res.status(404).send({
                errors: [{ message: 'Invoice not found' }],
            });
        }

        const invoiceData = req.body as ExpandedInvoice;

        console.log('invoice to update', invoiceData);

        const updatedInvoice = await prisma.invoice.update({
            where: {
                id: Number(req.query.id),
            },
            data: {
                invoicedAt: invoiceData.invoicedAt,
                totalAmount: invoiceData.totalAmount || 0,
                dueNetDays: invoiceData.dueNetDays || 0,
                carrier: {
                    connect: {
                        id: session.user.carrierId,
                    },
                },
                extraItems: {
                    deleteMany: {},
                    create: invoiceData.extraItems.map((extraItem) => ({
                        ...extraItem,
                    })),
                },
            },
        });

        return res.status(200).json({
            data: { updatedInvoice },
        });
    }

    async function _delete() {
        const session = await getSession({ req });

        const invoice = await prisma.invoice.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session?.user?.id,
            },
        });

        if (!invoice) {
            return res.status(404).send({
                errors: [{ message: 'Invoice not found' }],
            });
        }

        await prisma.invoice.delete({
            where: {
                id: Number(req.query.id),
            },
        });

        return res.status(200).send({
            data: { result: 'Invoice deleted' },
        });
    }
}
