import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _delete() {
        const session = await getServerSession(req, res, authOptions);

        const payment = await prisma.assignmentPayment.findFirst({
            where: {
                id: String(req.query.pid),
                driverAssignment: {
                    id: String(req.query.id),
                    carrierId: session.user.defaultCarrierId,
                },
            },
        });

        if (!payment) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Assignment payment not found' }],
            });
        }

        await prisma.assignmentPayment.delete({
            where: {
                id: String(req.query.pid),
            },
        });

        return res.status(200).send({
            code: 200,
            data: { result: 'Assignment payment deleted' },
        });
    }
}
