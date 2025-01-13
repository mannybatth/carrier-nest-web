import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { stripe } from 'lib/stripe';
import getRawBody from 'raw-body';
import prisma from 'lib/prisma';
import { SubscriptionPlan } from '@prisma/client';

// Disable body parsing, need the raw body for signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

const getPlanFromPriceId = (priceId: string): SubscriptionPlan => {
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        return SubscriptionPlan.PRO;
    }
    return SubscriptionPlan.BASIC;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const rawBody = await getRawBody(req);

    let event: Stripe.Event;

    try {
        if (!signature || !webhookSecret) {
            throw new Error('Missing stripe signature or webhook secret');
        }

        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).json({ message: err.message });
    }

    try {
        switch (event.type) {
            case 'customer.created': {
                const customer = event.data.object as Stripe.Customer;
                if (!customer.email) break;

                await prisma.subscription.updateMany({
                    where: {
                        carrier: {
                            email: customer.email,
                        },
                    },
                    data: {
                        stripeCustomerId: customer.id,
                    },
                });
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customer = subscription.customer as string;
                const priceId = subscription.items.data[0]?.price.id;

                await prisma.subscription.updateMany({
                    where: {
                        stripeCustomerId: customer,
                    },
                    data: {
                        stripeSubscriptionId: subscription.id,
                        status: subscription.status,
                        ...(subscription.status === 'active' && {
                            plan: getPlanFromPriceId(priceId),
                        }),
                    },
                });
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customer = subscription.customer as string;

                await prisma.subscription.updateMany({
                    where: {
                        stripeCustomerId: customer,
                    },
                    data: {
                        status: 'canceled',
                        plan: SubscriptionPlan.BASIC,
                    },
                });
                break;
            }

            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (!session.customer || !session.subscription) break;

                await prisma.subscription.updateMany({
                    where: {
                        carrier: {
                            email: session.customer_email ?? '',
                        },
                    },
                    data: {
                        stripeCustomerId: session.customer as string,
                        stripeSubscriptionId: session.subscription as string,
                        status: 'active',
                    },
                });
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as Stripe.Invoice;
                if (!invoice.subscription || !invoice.customer) break;
                const priceId = invoice.lines.data[0]?.price?.id;

                await prisma.subscription.updateMany({
                    where: {
                        stripeCustomerId: invoice.customer as string,
                    },
                    data: {
                        status: 'active',
                        ...(priceId && {
                            plan: getPlanFromPriceId(priceId),
                        }),
                    },
                });
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                if (!invoice.subscription || !invoice.customer) break;

                await prisma.subscription.updateMany({
                    where: {
                        stripeCustomerId: invoice.customer as string,
                    },
                    data: {
                        status: 'past_due',
                    },
                });
                break;
            }

            case 'customer.subscription.paused': {
                const subscription = event.data.object as Stripe.Subscription;
                const customer = subscription.customer as string;

                await prisma.subscription.updateMany({
                    where: {
                        stripeCustomerId: customer,
                    },
                    data: {
                        status: 'paused',
                    },
                });
                break;
            }

            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge;
                if (!charge.customer) break;

                await prisma.subscription.updateMany({
                    where: {
                        stripeCustomerId: charge.customer as string,
                    },
                    data: {
                        status: 'incomplete',
                    },
                });
                break;
            }

            case 'charge.dispute.created': {
                const dispute = event.data.object as Stripe.Dispute;
                const charge = await stripe.charges.retrieve(dispute.charge as string);
                if (!charge.customer) break;

                await prisma.subscription.updateMany({
                    where: {
                        stripeCustomerId: charge.customer as string,
                    },
                    data: {
                        status: 'disputed',
                    },
                });
                break;
            }

            default: {
                console.log(`Unhandled event type: ${event.type}`);
            }
        }

        return res.json({ received: true });
    } catch (err) {
        console.error(`Error processing webhook: ${err.message}`);
        return res.status(500).json({ message: 'Webhook handler failed' });
    }
}
