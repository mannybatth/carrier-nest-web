import { Customer } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { Session } from 'next-auth';
import { JSONResponse } from 'interfaces/models';

export const GET = auth(async (req: NextAuthRequest) => {
    const id = req.nextUrl.searchParams.get('id');
    const session = req.auth;

    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const response = await getCustomer({ session, id });
    return NextResponse.json(response, { status: response.code });
});

export const PUT = auth(async (req: NextAuthRequest) => {
    const id = req.nextUrl.searchParams.get('id');
    const session = req.auth;

    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const customer = await prisma.customer.findFirst({
        where: {
            id: String(id),
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!customer) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Customer not found' }] }, { status: 404 });
    }

    const customerData = await req.json();

    const updatedCustomer = await prisma.customer.update({
        where: { id: String(id) },
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

    return NextResponse.json({ code: 200, data: { updatedCustomer } }, { status: 200 });
});

export const DELETE = auth(async (req: NextAuthRequest) => {
    const id = req.nextUrl.searchParams.get('id');
    const session = req.auth;

    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const customer = await prisma.customer.findFirst({
        where: {
            id: String(id),
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!customer) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Customer not found' }] }, { status: 404 });
    }

    await prisma.customer.delete({
        where: { id: String(id) },
    });

    return NextResponse.json({ code: 200, data: { result: 'Customer deleted' } }, { status: 200 });
});

const getCustomer = async ({
    session,
    id,
}: {
    session?: Session;
    id: string | null;
}): Promise<JSONResponse<{ customer: Customer }>> => {
    const customer = await prisma.customer.findFirst({
        where: {
            id: String(id),
            carrierId: session.user.defaultCarrierId,
        },
    });

    return {
        code: 200,
        data: { customer },
    };
};
