import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from 'lib/stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from 'pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const session = await getServerSession(req, res, authOptions);
        if (!session) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const subscriptionId = req.query.id as string;
        if (!subscriptionId) {
            return res.status(400).json({ message: 'Subscription ID is required' });
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        return res.status(200).json({
            code: 200,
            data: subscription,
        });
    } catch (error) {
        return res.status(500).json({
            code: 500,
            errors: [{ message: error.message || JSON.stringify(error) }],
        });
    }
}
