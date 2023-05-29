import { LoadDocument } from '@prisma/client';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

        const load = await prisma.load.findFirst({
            where: {
                id: String(req.query.id),
                userId: session.user.id,
            },
        });

        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const documentId = String(req.query.did);

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

export const deleteDocumentFromS3 = async (document: LoadDocument): Promise<void> => {
    return new Promise((resolve, reject) => {
        const client = new S3Client({
            region: process.env.S3_UPLOAD_REGION,
            credentials: {
                accessKeyId: process.env.S3_UPLOAD_KEY,
                secretAccessKey: process.env.S3_UPLOAD_SECRET,
            },
        });

        const input = {
            Bucket: process.env.S3_UPLOAD_BUCKET,
            Key: document.fileKey,
        };

        const command = new DeleteObjectCommand(input);
        client.send(command, function (err, data) {
            resolve();
        });
    });
};
