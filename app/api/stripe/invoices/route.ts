import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import { stripe } from 'lib/stripe';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const customerId = req.nextUrl.searchParams.get('customerId');

    if (!customerId) {
        return NextResponse.json({ message: 'Customer ID is required' }, { status: 400 });
    }

    try {
        const invoices = await stripe.invoices.list({
            customer: customerId,
            limit: 50,
        });

        return NextResponse.json(invoices.data, { status: 200 });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        return NextResponse.json({ message: 'Error fetching invoices' }, { status: 500 });
    }
});
