import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { stripe } from 'lib/stripe';
import { appUrl } from 'lib/constants';

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const carrierId = req.auth.user.defaultCarrierId;

    const carrier = await prisma.carrier.findUnique({
        where: {
            id: carrierId,
        },
        include: {
            subscription: true,
        },
    });

    if (!carrier?.subscription?.stripeCustomerId) {
        return NextResponse.json(
            {
                code: 404,
                errors: [{ message: 'No payment method on file' }],
            },
            { status: 404 },
        );
    }

    const customerId = carrier.subscription.stripeCustomerId;

    try {
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${appUrl}/billing`,
        });

        return NextResponse.json(
            {
                code: 200,
                data: {
                    url: portalSession.url,
                },
            },
            { status: 200 },
        );
    } catch (error) {
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: error.message || JSON.stringify(error) }],
            },
            { status: 500 },
        );
    }
});
