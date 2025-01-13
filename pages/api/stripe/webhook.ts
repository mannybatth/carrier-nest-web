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

async function findAndAttachCarrier(stripeCustomerId: string, email?: string) {
    // Try to find orphaned subscription
    const orphanedSub = await prisma.subscription.findFirst({
        where: {
            stripeCustomerId,
            carrierId: null,
        },
    });

    if (!orphanedSub) return;

    // Try to find carrier by email if provided
    if (email) {
        const carrier = await prisma.carrier.findUnique({
            where: { email },
        });

        if (carrier) {
            await prisma.subscription.update({
                where: { id: orphanedSub.id },
                data: { carrierId: carrier.id },
            });
            return;
        }
    }

    // If no email or carrier not found by email, try finding by customer ID
    const carrier = await prisma.carrier.findFirst({
        where: {
            subscription: {
                stripeCustomerId,
            },
        },
    });

    if (carrier) {
        await prisma.subscription.update({
            where: { id: orphanedSub.id },
            data: { carrierId: carrier.id },
        });
    }
}

function getFirstPriceId(subscription: Stripe.Subscription) {
    const firstItem = subscription.items.data[0];
    return firstItem?.price?.id;
}

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

    console.log(`Received event: ${event.type}`);

    try {
        switch (event.type) {
            case 'customer.created': {
                const customer = event.data.object as Stripe.Customer;
                if (!customer.email) break;

                // Try to attach any orphaned subscription first
                await findAndAttachCarrier(customer.id, customer.email);

                const carrier = await prisma.carrier.findUnique({
                    where: { email: customer.email },
                    include: { subscription: true },
                });

                if (!carrier) break;

                if (!carrier.subscription) {
                    await prisma.subscription.create({
                        data: {
                            carrierId: carrier.id,
                            stripeCustomerId: customer.id,
                            status: 'active',
                            plan: SubscriptionPlan.BASIC,
                        },
                    });
                } else {
                    await prisma.subscription.update({
                        where: { id: carrier.subscription.id },
                        data: {
                            stripeCustomerId: customer.id,
                        },
                    });
                }
                break;
            }

            case 'customer.deleted': {
                const customer = event.data.object as Stripe.Customer;
                if (!customer.id) break;

                await prisma.subscription.deleteMany({
                    where: {
                        stripeCustomerId: customer.id,
                    },
                });
                break;
            }

            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (!session.customer || !session.subscription || !session.customer_email) break;

                // Try to attach any orphaned subscription first
                await findAndAttachCarrier(session.customer as string, session.customer_email);

                const carrier = await prisma.carrier.findUnique({
                    where: { email: session.customer_email },
                    include: { subscription: true },
                });

                if (!carrier) break;

                const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

                if (!carrier.subscription) {
                    await prisma.subscription.create({
                        data: {
                            carrierId: carrier.id,
                            stripeCustomerId: session.customer as string,
                            stripeSubscriptionId: session.subscription as string,
                            status: subscription.status,
                            plan: getPlanFromPriceId(getFirstPriceId(subscription)),
                        },
                    });
                } else {
                    await prisma.subscription.update({
                        where: { id: carrier.subscription.id },
                        data: {
                            stripeCustomerId: session.customer as string,
                            stripeSubscriptionId: session.subscription as string,
                            status: subscription.status,
                            plan: getPlanFromPriceId(getFirstPriceId(subscription)),
                        },
                    });
                }
                break;
            }

            case 'customer.subscription.created': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const priceId = getFirstPriceId(subscription);

                // Try to find carrier by metadata or customer email
                const customerObj = await stripe.customers.retrieve(customerId);
                if ('email' in customerObj) {
                    await findAndAttachCarrier(customerId, customerObj.email);
                }

                const existingSubscription = await prisma.subscription.findFirst({
                    where: { stripeCustomerId: customerId },
                });

                if (!existingSubscription) {
                    await prisma.subscription.create({
                        data: {
                            carrierId: null,
                            stripeCustomerId: customerId,
                            stripeSubscriptionId: subscription.id,
                            status: subscription.status,
                            ...(subscription.status === 'active' && {
                                plan: getPlanFromPriceId(priceId),
                            }),
                        },
                    });
                } else {
                    await prisma.subscription.update({
                        where: { id: existingSubscription.id },
                        data: {
                            stripeSubscriptionId: subscription.id,
                            status: subscription.status,
                            ...(subscription.status === 'active' && {
                                plan: getPlanFromPriceId(priceId),
                            }),
                        },
                    });
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customer = subscription.customer as string;
                const priceId = getFirstPriceId(subscription);

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

                await prisma.subscription.updateMany({
                    where: {
                        stripeSubscriptionId: subscription.id,
                    },
                    data: {
                        status: 'canceled',
                        stripeSubscriptionId: null,
                    },
                });
                break;
            }

            case 'customer.subscription.paused': {
                const subscription = event.data.object as Stripe.Subscription;

                await prisma.subscription.updateMany({
                    where: {
                        stripeSubscriptionId: subscription.id,
                    },
                    data: {
                        status: 'paused',
                    },
                });
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as Stripe.Invoice;
                if (!invoice.subscription || !invoice.customer) break;

                const activeSubscriptions = await stripe.subscriptions.list({
                    customer: invoice.customer as string,
                    status: 'active',
                    limit: 1,
                });
                const activeSub = activeSubscriptions.data[0];
                if (!activeSub) break;

                const priceId = getFirstPriceId(activeSub);

                await prisma.subscription.updateMany({
                    where: { stripeCustomerId: invoice.customer as string },
                    data: {
                        status: activeSub.status,
                        ...(priceId && { plan: getPlanFromPriceId(priceId) }),
                    },
                });
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                if (!invoice.subscription || !invoice.customer) break;

                await prisma.subscription.updateMany({
                    where: { stripeCustomerId: invoice.customer as string },
                    data: { status: 'past_due' },
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
