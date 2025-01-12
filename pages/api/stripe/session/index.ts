import { stripe } from 'lib/stripe';
import { NextApiRequest, NextApiResponse } from 'next';
import { appUrl } from 'lib/constants';
import { SubscriptionPlan } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { plan } = req.body as { plan: SubscriptionPlan };

        const priceId =
            plan === SubscriptionPlan.BASIC ? process.env.STRIPE_BASIC_PRICE_ID : process.env.STRIPE_PRO_PRICE_ID;

        try {
            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                success_url: `${appUrl}/billing?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${appUrl}/billing?cancelled=true`,
            });

            res.status(200).json({ url: session.url });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.setHeader('Allow', 'POST');
        res.status(405).end('Method Not Allowed');
    }
}
