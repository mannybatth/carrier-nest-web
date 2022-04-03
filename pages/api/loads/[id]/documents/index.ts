import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { JSONResponse, SimpleLoadDocument } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'POST':
            return _post();
        default:
            return res.status(405).send({
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _post() {
        const session = await getSession({ req });

        const load = await prisma.load.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session.user.id,
            },
        });

        if (!load) {
            return res.status(404).send({
                errors: [{ message: 'Load not found' }],
            });
        }

        const docData = req.body as SimpleLoadDocument;

        console.log('docData to add', docData);

        const loadDocument = await prisma.loadDocument.create({
            data: {
                load: {
                    connect: {
                        id: load.id,
                    },
                },
                user: {
                    connect: {
                        id: session.user.id,
                    },
                },
                ...docData,
            },
        });

        return res.status(200).json({
            data: { loadDocument },
        });
    }
}
