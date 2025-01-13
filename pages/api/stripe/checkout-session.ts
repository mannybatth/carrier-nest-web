import { stripe } from 'lib/stripe';
import { NextApiRequest, NextApiResponse } from 'next';
import { appUrl } from 'lib/constants';
import { SubscriptionPlan } from '@prisma/client';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from 'next-auth';
import prisma from 'lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const session = await getServerSession(req, res, authOptions);
        const { plan } = req.body as { plan: SubscriptionPlan };

        const priceId =
            plan === SubscriptionPlan.BASIC ? process.env.STRIPE_BASIC_PRICE_ID : process.env.STRIPE_PRO_PRICE_ID;

        if (!priceId) {
            return res.status(400).json({ error: 'No price ID found for this plan' });
        }

        const carrier = await prisma.carrier.findUnique({
            where: {
                id: session.user.defaultCarrierId,
            },
            include: {
                subscription: true,
            },
        });

        console.log('subscription', carrier.subscription);

        try {
            const stripeSession = await stripe.checkout.sessions.create({
                mode: 'subscription',
                ...(carrier.subscription?.stripeCustomerId && { customer: carrier.subscription.stripeCustomerId }),
                ...(!carrier.subscription?.stripeCustomerId && { customer_email: session.user.email }),
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                success_url: `${appUrl}/billing?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${appUrl}/billing?cancelled=true`,
            });

            return res.status(200).json({
                code: 200,
                data: {
                    url: stripeSession.url,
                },
            });
        } catch (error) {
            return res.status(500).json({
                code: 500,
                errors: [{ message: error.message || JSON.stringify(error) }],
            });
        }
    } else {
        res.setHeader('Allow', 'POST');
        res.status(405).end('Method Not Allowed');
    }
}
