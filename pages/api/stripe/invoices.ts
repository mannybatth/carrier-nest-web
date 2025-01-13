import { stripe } from 'lib/stripe';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { customerId } = req.query;

    if (!customerId) {
        return res.status(400).json({ message: 'Customer ID is required' });
    }

    try {
        const invoices = await stripe.invoices.list({
            customer: customerId as string,
            limit: 50,
        });

        res.status(200).json(invoices.data);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ message: 'Error fetching invoices' });
    }
}
