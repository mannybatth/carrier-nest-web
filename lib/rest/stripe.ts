import { apiUrl } from '../constants';
import { JSONResponse } from '../../interfaces/models';

export const createCheckoutSession = async (plan: string) => {
    const response = await fetch(`${apiUrl}/stripe/checkout-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
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
