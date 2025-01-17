import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import { stripe } from 'lib/stripe';

export const GET = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const subscriptionId = context.params.id;
    if (!subscriptionId) {
        return NextResponse.json({ message: 'Subscription ID is required' }, { status: 400 });
    }

    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        return NextResponse.json({ code: 200, data: subscription });
    } catch (error) {
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: error.message || JSON.stringify(error) }],
            },
            { status: 500 },
        );
    }
});
