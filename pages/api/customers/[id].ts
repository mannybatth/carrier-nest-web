import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ExpandedCustomer, JSONResponse } from '../../../interfaces/models';
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
        const expandLoads = expand?.includes('loads');

        const customer = await prisma.customer.findFirst({
            where: {
                id: Number(req.query.id),
                carrierId: session?.user?.carrierId,
            },
            ...(expand
                ? {
                      include: {
                          ...(expandLoads
                              ? {
                                    loads: {
                                        select: {
                                            id: true,
                                            customer: true,
                                            refNum: true,
                                            rate: true,
                                            status: true,
                                            distance: true,
                                            distanceUnit: true,
                                            shipper: true,
                                            receiver: true,
                                            stops: true,
                                        },
                                    },
                                }
                              : {}),
                      },
                  }
                : {}),
        });
        return res.status(200).json({
            data: customer,
        });
    }

    async function _put() {
        const session = await getSession({ req });

        const customer = await prisma.customer.findFirst({
            where: {
                id: Number(req.query.id),
                carrierId: session?.user?.carrierId,
            },
        });

        if (!customer) {
            return res.status(404).send({
                errors: [{ message: 'Customer not found' }],
            });
        }

        const customerData = req.body as ExpandedCustomer;

        console.log('customer to update', customerData);

        const updatedCustomer = await prisma.customer.update({
            where: {
                id: Number(req.query.id),
            },
            data: {
                name: customerData.name,
                contactEmail: customerData.contactEmail || '',
                billingEmail: customerData.billingEmail || '',
                paymentStatusEmail: customerData.paymentStatusEmail || '',
                street: customerData.street || '',
                city: customerData.city || '',
                state: customerData.state || '',
                zip: customerData.zip || '',
                country: customerData.country || '',
            },
        });

        return res.status(200).json({
            data: updatedCustomer,
        });
    }

    async function _delete() {
        const session = await getSession({ req });

        const customer = await prisma.customer.findFirst({
            where: {
                id: Number(req.query.id),
                carrierId: session?.user?.carrierId,
            },
        });

        if (!customer) {
            return res.status(404).send({
                errors: [{ message: 'Customer not found' }],
            });
        }

        await prisma.customer.delete({
            where: {
                id: Number(req.query.id),
            },
        });

        return res.status(200).send({
            data: 'Customer deleted',
        });
    }
}
