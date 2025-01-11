import { NextApiResponse } from 'next';
import Stripe from 'stripe';
import { stripe } from 'lib/stripe';
import { NextRequest } from 'next/server';

// Disable body parsing, need the raw body for signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const body = await req.text();

    let event: Stripe.Event;

    try {
        if (!signature || !webhookSecret) {
            throw new Error('Missing stripe signature or webhook secret');
        }

        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).json({ message: err.message });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                // Handle successful checkout
                // Save customer info, provision subscription etc.
                console.log('Checkout completed:', session);
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as Stripe.Invoice;
                // Handle successful payment
                // Update subscription status etc.
                console.log('Invoice paid:', invoice);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                // Handle failed payment
                // Notify customer, update subscription status etc.
                console.log('Payment failed:', invoice);
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
