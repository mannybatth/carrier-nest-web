import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const DELETE = auth(async (req: NextAuthRequest, context: { params: { id: string; pid: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;

    const driverId = context.params.id;
    const paymentId = context.params.pid;

    const payment = await prisma.driverPayment.findFirst({
        where: {
            id: String(paymentId),
            driverId: String(driverId),
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!payment) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Driver payment not found' }] }, { status: 404 });
    }

    await prisma.driverPayment.delete({
        where: {
            id: String(paymentId),
        },
    });

    return NextResponse.json({ code: 200, data: { result: 'Driver payment deleted' } }, { status: 200 });
});
