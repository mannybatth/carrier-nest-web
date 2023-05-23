import { Customer } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Session, getServerSession } from 'next-auth';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedCustomer, JSONResponse } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';
import { authOptions } from '../auth/[...nextauth]';

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
        const response = await getCustomer({ session, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _put() {
        const session = await getServerSession(req, res, authOptions);

        const customer = await prisma.customer.findFirst({
            where: {
                id: Number(req.query.id),
                carrierId: session.user.carrierId,
            },
        });

        if (!customer) {
            return res.status(404).send({
                code: 404,
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
            code: 200,
            data: { updatedCustomer },
        });
    }

    async function _delete() {
        const session = await getServerSession(req, res, authOptions);

        const customer = await prisma.customer.findFirst({
            where: {
                id: Number(req.query.id),
                carrierId: session.user.carrierId,
            },
        });

        if (!customer) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Customer not found' }],
            });
        }

        await prisma.customer.delete({
            where: {
                id: Number(req.query.id),
            },
        });

        return res.status(200).send({
            code: 200,
            data: { result: 'Customer deleted' },
        });
    }
}

export const getCustomer = async ({
    session,
    query,
}: {
    session?: Session;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ customer: Customer }>> => {
    const customer = await prisma.customer.findFirst({
        where: {
            id: Number(query.id),
            carrierId: session.user.carrierId,
        },
    });

    return {
        code: 200,
        data: { customer },
    };
};
