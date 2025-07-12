import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
});

export const getStripeSubscriptionPlan = async (subscriptionId: string) => {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
};
