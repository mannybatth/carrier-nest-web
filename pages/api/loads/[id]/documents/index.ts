import { LoadDocument } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'POST':
            return _post();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _post() {
        const session = await getServerSession(req, res, authOptions);

        const load = await prisma.load.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
            },
        });

        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const docData = req.body as LoadDocument;

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
                fileKey: docData.fileKey,
                fileUrl: docData.fileUrl,
                fileName: docData.fileName,
                fileType: docData.fileType,
                fileSize: docData.fileSize,
            },
        });

        return res.status(200).json({
            code: 200,
            data: { loadDocument },
        });
    }
}
