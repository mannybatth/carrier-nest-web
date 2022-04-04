import { LoadDocument } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import aws from 'aws-sdk';

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
        const session = await getSession({ req });

        const load = await prisma.load.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session.user.id,
            },
        });

        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const documentId = Number(req.query.did);

        const document = await prisma.loadDocument.findFirst({
            where: {
                id: documentId,
                loadId: load.id,
                userId: session.user.id,
            },
        });

        if (!document) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Document not found' }],
            });
        }

        deleteDocumentFromS3(document);

        await prisma.loadDocument.delete({
            where: {
                id: documentId,
            },
        });

        return res.status(200).send({
            code: 200,
            data: { result: 'Document deleted' },
        });
    }
}

const deleteDocumentFromS3 = async (document: LoadDocument): Promise<void> => {
    return new Promise((resolve, reject) => {
        const s3 = new aws.S3({
            accessKeyId: process.env.S3_UPLOAD_KEY,
            secretAccessKey: process.env.S3_UPLOAD_SECRET,
            region: process.env.S3_UPLOAD_REGION,
        });

        const params = {
            Bucket: process.env.S3_UPLOAD_BUCKET,
            Key: document.fileKey,
        };

        s3.deleteObject(params, function (err, data) {
            resolve();
        });
    });
};
