import { LoadStatus } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedLoad, JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'PATCH':
            return _patch();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _patch() {
        // Patch to upload status of a load
        const { id } = req.query as ParsedUrlQuery;
        const { status } = req.body as { status: LoadStatus };

        const load = await prisma.load.findUnique({
            where: { id: id as string },
        });

        if (!load) {
            return res.status(404).json({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const updatedLoad = await prisma.load.update({
            where: { id: id as string },
            data: { status },
        });

        return res.status(200).json({
            code: 200,
            data: { load: updatedLoad as ExpandedLoad },
        });
    }
}
