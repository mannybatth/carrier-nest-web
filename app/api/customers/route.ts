import { Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { calcPaginationMetadata } from 'lib/pagination';

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

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const sortBy = req.nextUrl.searchParams.get('sortBy') as string;
    const sortDir = (req.nextUrl.searchParams.get('sortDir') as string) || 'asc';
    const limit = req.nextUrl.searchParams.get('limit') ? Number(req.nextUrl.searchParams.get('limit')) : undefined;
    const offset = req.nextUrl.searchParams.get('offset') ? Number(req.nextUrl.searchParams.get('offset')) : undefined;

    if ((limit != null || offset != null) && (limit == null || offset == null)) {
        return NextResponse.json({ code: 400, errors: [{ message: 'Limit and Offset must be set together' }] });
    }

    if ((limit != null && isNaN(limit)) || (offset != null && isNaN(offset))) {
        return NextResponse.json({ code: 400, errors: [{ message: 'Invalid limit or offset' }] });
    }

    const total = await prisma.customer.count({
        where: {
            carrierId: req.auth.user.defaultCarrierId,
        },
    });

    const metadata = calcPaginationMetadata({ total, limit, offset });

    const customers = await prisma.customer.findMany({
        where: {
            carrierId: req.auth.user.defaultCarrierId,
        },
        ...(limit ? { take: limit } : { take: 10 }),
        ...(offset ? { skip: offset } : { skip: 0 }),
        orderBy: buildOrderBy(sortBy, sortDir) || {
            createdAt: 'desc',
        },
    });

    return NextResponse.json({
        code: 200,
        data: { metadata, customers },
    });
});

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const customerData = (await req.json()) as Prisma.CustomerCreateInput;

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
                        id: req.auth.user.defaultCarrierId,
                    },
                },
            },
        });

        return NextResponse.json({
            code: 200,
            data: { customer },
        });
    } catch (error) {
        console.error('customer post error', error);
        return NextResponse.json({
            code: 400,
            errors: [{ message: error.message || JSON.stringify(error) }],
        });
    }
});
