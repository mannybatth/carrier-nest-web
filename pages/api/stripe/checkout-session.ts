import { stripe } from 'lib/stripe';
import { NextApiRequest, NextApiResponse } from 'next';
import { appUrl } from 'lib/constants';
import { SubscriptionPlan } from '@prisma/client';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from 'next-auth';
import prisma from 'lib/prisma';
import { ExpandedCarrier } from 'interfaces/models';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const session = await getServerSession(req, res, authOptions);

        // If carrierEmail is provided, then assume we just created a new carrier and session doesn't exist yet
        const { plan, carrierEmail, numDrivers } = req.body as {
            plan: SubscriptionPlan;
            carrierEmail?: string;
            numDrivers: number;
        };

        // If numDrivers is not provided or is less than 1, return 400
        if (!numDrivers || numDrivers < 1) {
            return res.status(400).json({ error: 'Number of drivers must be at least 1' });
        }

        let carrier: ExpandedCarrier | null = null;
        if (carrierEmail) {
            carrier = await prisma.carrier.findUnique({
                where: {
                    email: carrierEmail,
                },
                include: {
                    subscription: true,
                },
            });
        } else if (session?.user?.defaultCarrierId) {
            carrier = await prisma.carrier.findUnique({
                where: {
                    id: session.user.defaultCarrierId,
                },
                include: {
                    subscription: true,
                },
            });
        }

        // If carrier is null or is carrierEmail is not provided, return 400
        if (!carrier) {
            return res.status(400).json({ error: 'Carrier not found' });
        }

        // Handle downgrade to BASIC plan
        if (plan === SubscriptionPlan.BASIC && carrier) {
            try {
                // Cancel subscription at period end if on PRO plan
                if (carrier?.subscription?.stripeSubscriptionId) {
                    try {
                        await stripe.subscriptions.update(carrier.subscription.stripeSubscriptionId, {
                            cancel_at_period_end: true,
                        });
                    } catch (error) {
                        console.log('Error updating subscription:', error);

                        await prisma.subscription.update({
                            where: {
                                carrierId: carrier.id,
                            },
                            data: {
                                plan: SubscriptionPlan.BASIC,
                                status: 'active',
                                stripeSubscriptionId: null,
                            },
                        });
                    }
                } else {
                    // Update subscription plan to BASIC if no subscription ID
                    await prisma.subscription.update({
                        where: {
                            carrierId: carrier.id,
                        },
                        data: {
                            plan: SubscriptionPlan.BASIC,
                            status: 'active',
                        },
                    });
                }

                return res.status(200).json({
                    code: 200,
                    data: {
                        url: carrierEmail
                            ? `${appUrl}?refresh_session=true`
                            : `${appUrl}/billing?success=true&refresh_session=true`,
                    },
                });
            } catch (error) {
                return res.status(500).json({
                    code: 500,
                    errors: [{ message: error.message || JSON.stringify(error) }],
                });
            }
        }

        // Handle upgrade to PRO plan
        const priceId = process.env.STRIPE_PRO_PRICE_ID;

        if (!priceId) {
            return res.status(400).json({ error: 'No price ID found for PRO plan' });
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
                success_url: carrierEmail
                    ? `${appUrl}?refresh_session=true`
                    : `${appUrl}/billing?checkout_session_id={CHECKOUT_SESSION_ID}&refresh_session=true`,
                cancel_url: carrierEmail
                    ? `${appUrl}?refresh_session=true`
                    : `${appUrl}/billing?cancelled=true&refresh_session=true`,
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
        return res.status(405).json({ message: 'Method not allowed' });
    }
}
