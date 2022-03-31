import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).send({
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _delete() {
        const session = await getSession({ req });

        const load = await prisma.load.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session?.user?.id,
            },
        });

        if (!load) {
            return res.status(404).send({
                errors: [{ message: 'Load not found' }],
            });
        }

        const documentId = Number(req.query.did);

        const document = await prisma.loadDocument.findFirst({
            where: {
                id: documentId,
                loadId: load.id,
                userId: session?.user?.id,
            },
        });

        if (!document) {
            return res.status(404).send({
                errors: [{ message: 'Document not found' }],
            });
        }

        // Delete document on aws s3

        await prisma.loadDocument.delete({
            where: {
                id: documentId,
            },
        });

        return res.status(200).send({
            data: { result: 'Document deleted' },
        });
    }
}
