import { stripe } from 'lib/stripe';
import { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from 'next-auth';
import prisma from 'lib/prisma';
import { appUrl } from 'lib/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const session = await getServerSession(req, res, authOptions);
        const carrierId = session.user.defaultCarrierId;

        const carrier = await prisma.carrier.findUnique({
            where: {
                id: carrierId,
            },
            include: {
                subscription: true,
            },
        });

        if (!carrier?.subscription?.stripeCustomerId) {
            return res.status(404).json({
                code: 404,
                errors: [{ message: 'No payment method on file' }],
            });
        }

        const customerId = carrier.subscription.stripeCustomerId;

        try {
            const portalSession = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: `${appUrl}/billing`,
            });

            return res.status(200).json({
                code: 200,
                data: {
                    url: portalSession.url,
                },
            });
        } catch (error) {
            return res.status(500).json({
                code: 500,
                errors: [{ message: error.message || JSON.stringify(error) }],
            });
        }
    } else {
        res.setHeader('Allow', 'POST');
        res.status(405).end('Method Not Allowed');
    }
}
