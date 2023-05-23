import { Customer } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { JSONResponse } from '../../interfaces/models';
import { PaginationMetadata } from '../../interfaces/table';
import { calcPaginationMetadata } from '../../lib/pagination';
import prisma from '../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';

const buildOrderBy = (sortBy: string, sortDir: string) => {
    if (sortBy && sortDir) {
        if (sortBy.includes('.')) {
            const split = sortBy.split('.');
            return {
                [split[0]]: {
                    [split[1]]: sortDir,
                },
            };
        }
        return { [sortBy]: sortDir };
    }
    return undefined;
};

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'POST':
            return _post();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const response = await getCustomers({ req, res, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _post() {
        try {
            const session = await getServerSession(req, res, authOptions);

            const customerData = req.body as Customer;

            const customer = await prisma.customer.create({
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
                    carrier: {
                        connect: {
                            id: session.user.carrierId,
                        },
                    },
                },
            });
            return res.status(200).json({
                code: 200,
                data: { customer },
            });
        } catch (error) {
            console.log('customer post error', error);
            return res.status(400).json({
                code: 400,
                errors: [{ message: error.message || JSON.stringify(error) }],
            });
        }
    }
}

export const getCustomers = async ({
    req,
    res,
    query,
}: {
    req: NextApiRequest;
    res: NextApiResponse<JSONResponse<any>>;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ customers: Customer[]; metadata: PaginationMetadata }>> => {
    const session = await getServerSession(req, res, authOptions);

    const sortBy = query.sortBy as string;
    const sortDir = (query.sortDir as string) || 'asc';

    const limit = query.limit !== undefined ? Number(query.limit) : undefined;
    const offset = query.offset !== undefined ? Number(query.offset) : undefined;

    if (limit != null || offset != null) {
        if (limit == null || offset == null) {
            return {
                code: 400,
                errors: [{ message: 'Limit and Offset must be set together' }],
            };
        }

        if (isNaN(limit) || isNaN(offset)) {
            return {
                code: 400,
                errors: [{ message: 'Invalid limit or offset' }],
            };
        }
    }

    const total = await prisma.customer.count({
        where: {
            carrierId: session.user.carrierId,
        },
    });

    const metadata = calcPaginationMetadata({ total, limit, offset });

    const customers = await prisma.customer.findMany({
        where: {
            carrierId: session.user.carrierId,
        },
        ...(limit ? { take: limit } : { take: 10 }),
        ...(offset ? { skip: offset } : { skip: 0 }),
        orderBy: buildOrderBy(sortBy, sortDir) || {
            createdAt: 'desc',
        },
    });
    return {
        code: 200,
        data: { metadata, customers },
    };
};
