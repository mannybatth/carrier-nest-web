import { apiUrl } from '../constants';
import { JSONResponse } from '../../interfaces/models';
import Stripe from 'stripe';

export const createCheckoutSession = async (plan: string, carrierEmail?: string) => {
    const response = await fetch(`${apiUrl}/stripe/checkout-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan, carrierEmail }),
    });

    const { data, errors }: JSONResponse<{ url: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }

    return data.url;
};

export const createBillingPortalSession = async () => {
    const response = await fetch(`${apiUrl}/stripe/billing-portal-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const { data, errors }: JSONResponse<{ url: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }

    return data.url;
};

export const getStripeSubscription = async (id: string) => {
    const response = await fetch(`${apiUrl}/stripe/subscription/${id}`);

    const { data, errors }: JSONResponse<Stripe.Response<Stripe.Subscription>> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }

    return data;
};

export const getStripeInvoices = async (customerId: string): Promise<Stripe.Invoice[]> => {
    const response = await fetch(`/api/stripe/invoices?customerId=${customerId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch invoices');
    }

    return response.json();
};
