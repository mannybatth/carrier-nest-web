import { SubscriptionPlan } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { stripe } from 'lib/stripe';
import { appUrl } from 'lib/constants';

export const POST = auth(async (req: NextAuthRequest) => {
    if (req.method !== 'POST') {
        return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
    }

    const session = req.auth;

    const { plan, carrierEmail, numDrivers } = (await req.json()) as {
        plan: SubscriptionPlan;
        carrierEmail?: string;
        numDrivers: number;
    };

    if (!numDrivers || numDrivers < 1) {
        return NextResponse.json({ error: 'Number of drivers must be at least 1' }, { status: 400 });
    }

    let carrier = null;
    if (carrierEmail) {
        carrier = await prisma.carrier.findUnique({
            where: { email: carrierEmail },
            include: { subscription: true },
        });
    } else if (session?.user?.defaultCarrierId) {
        carrier = await prisma.carrier.findUnique({
            where: { id: session.user.defaultCarrierId },
            include: { subscription: true },
        });
    }

    if (!carrier) {
        return NextResponse.json({ error: 'Carrier not found' }, { status: 400 });
    }

    if (plan === SubscriptionPlan.BASIC && carrier) {
        try {
            if (carrier?.subscription?.stripeSubscriptionId) {
                try {
                    await stripe.subscriptions.update(carrier.subscription.stripeSubscriptionId, {
                        cancel_at_period_end: true,
                    });
                } catch (error) {
                    console.log('Error updating subscription:', error);

                    await prisma.subscription.update({
                        where: { carrierId: carrier.id },
                        data: {
                            plan: SubscriptionPlan.BASIC,
                            status: 'active',
                            stripeSubscriptionId: null,
                        },
                    });
                }
            } else {
                await prisma.subscription.update({
                    where: { carrierId: carrier.id },
                    data: {
                        plan: SubscriptionPlan.BASIC,
                        status: 'active',
                    },
                });
            }

            return NextResponse.json({
                code: 200,
                data: {
                    url: carrierEmail
                        ? `${appUrl}?refresh_session=true`
                        : `${appUrl}/billing?success=true&refresh_session=true`,
                },
            });
        } catch (error) {
            return NextResponse.json(
                {
                    code: 500,
                    errors: [{ message: error.message || JSON.stringify(error) }],
                },
                { status: 500 },
            );
        }
    }

    const priceId = process.env.STRIPE_PRO_PRICE_ID;

    if (!priceId) {
        return NextResponse.json({ error: 'No price ID found for PRO plan' }, { status: 400 });
    }

    try {
        const stripeSession = await stripe.checkout.sessions.create({
            mode: 'subscription',
            ...(carrier.subscription?.stripeCustomerId && { customer: carrier.subscription.stripeCustomerId }),
            ...(!carrier.subscription?.stripeCustomerId && { customer_email: carrier.email }),
            line_items: [
                {
                    price: priceId,
                    quantity: numDrivers || 1,
                },
            ],
            allow_promotion_codes: true,
            success_url: carrierEmail
                ? `${appUrl}?refresh_session=true`
                : `${appUrl}/billing?checkout_session_id={CHECKOUT_SESSION_ID}&refresh_session=true`,
            cancel_url: carrierEmail
                ? `${appUrl}?refresh_session=true`
                : `${appUrl}/billing?cancelled=true&refresh_session=true`,
        });

        return NextResponse.json({
            code: 200,
            data: {
                url: stripeSession.url,
            },
        });
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
