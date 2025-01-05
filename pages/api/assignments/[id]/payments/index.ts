import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({
            code: 401,
            errors: [{ message: 'Unauthorized' }],
        });
    }

    switch (req.method) {
        case 'POST':
            return _post(req, res, session);
        default:
            return res.status(405).json({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }
}

async function _post(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>, session: any) {
    const { amount, paymentDate } = req.body;
    const { id: driverAssignmentId } = req.query;

    if (!amount || !paymentDate || !driverAssignmentId) {
        return res.status(400).json({
            code: 400,
            errors: [{ message: 'Missing required fields' }],
        });
    }

    try {
        const driverAssignment = await prisma.driverAssignment.findUnique({
            where: { id: driverAssignmentId as string, carrierId: session.user.defaultCarrierId },
            include: { load: true, driver: true },
        });

        if (!driverAssignment) {
            return res.status(404).json({
                code: 404,
                errors: [{ message: 'Driver assignment not found' }],
            });
        }

        const payment = await prisma.assignmentPayment.create({
            data: {
                amount,
                paymentDate: new Date(paymentDate),
                carrierId: session.user.defaultCarrierId,
                loadId: driverAssignment.loadId,
                driverId: driverAssignment.driverId,
                driverAssignmentId: driverAssignmentId as string,
            },
        });

        return res.status(201).json({
            code: 201,
            data: { payment },
        });
    } catch (error) {
        console.error('Error creating assignment payment:', error);
        return res.status(500).json({
            code: 500,
            errors: [{ message: 'Internal server error' }],
        });
    }
}
