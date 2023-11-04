import type { NextApiRequest, NextApiResponse } from 'next';
import { JSONResponse } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const { carrierCode } = req.query;
        let isUnique = true;

        const carrier = await prisma.carrier.findUnique({
            where: {
                carrierCode: String(carrierCode),
            },
        });

        if (carrier) {
            isUnique = false;
        }

        return res.status(200).json({
            code: 200,
            data: {
                isUnique,
            },
        });
    }
}
