import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, PersistentFile } from 'formidable';
import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import prisma from '../../lib/prisma';
import { isProPlan } from '../../lib/subscription';

export const config = {
    api: {
        bodyParser: false,
    },
};

const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY,
    },
});

async function uploadFile(
    localFilePath: string,
    originalFileName: string,
    bucketName: string,
): Promise<{ gcsInputUri: string; uniqueFileName: string; originalFileName: string }> {
    const extension = path.extname(originalFileName).toLowerCase();
    const uniqueFileName = `${uuidv4()}${extension}`; // Default to original file extension

    await storage.bucket(bucketName).upload(localFilePath, {
        destination: uniqueFileName,
        resumable: false,
    });

    // Make file public
    await storage.bucket(bucketName).file(uniqueFileName).makePublic();

    await fs.unlink(localFilePath); // Delete the converted or original file after upload

    return {
        gcsInputUri: `https://storage.googleapis.com/${bucketName}/${uniqueFileName}`,
        uniqueFileName,
        originalFileName,
    };
}

async function checkStorageLimit(carrierId: string, fileSize: number): Promise<boolean> {
    const carrier = await prisma.carrier.findUnique({
        where: { id: carrierId },
        include: { subscription: true },
    });

    if (!carrier) {
        throw new Error('Carrier not found');
    }

    const documents = await prisma.loadDocument.findMany({
        where: { carrierId },
    });

    if (!documents || documents.length === 0) {
        return true;
    }

    const currentStorage = documents.reduce((acc, doc) => acc + doc.fileSize, 0);

    // Determine the maximum storage limit based on the subscription plan
    const maxStorage =
        isProPlan(carrier.subscription) && carrier.subscription?.numberOfDrivers
            ? parseInt(process.env.NEXT_PUBLIC_PRO_PLAN_MAX_STORAGE_GB_PER_DRIVER) *
              1024 *
              1024 *
              1024 * // Convert GB to bytes
              carrier.subscription.numberOfDrivers
            : parseInt(process.env.NEXT_PUBLIC_BASIC_PLAN_MAX_STORAGE_MB) * 1024 * 1024; // Convert MB to bytes;

    // Check if the current storage plus the new file size exceeds the maximum storage limit
    return currentStorage + fileSize <= maxStorage;
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        try {
            const data = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
                const form = new IncomingForm();
                form.parse(req, (err, fields, files) => {
                    if (err) reject(err);
                    resolve({ fields, files });
                });
            });

            const file: PersistentFile = data.files.file[0];
            const localFilePath = file.filepath;
            const bucketName = process.env.GCP_LOAD_DOCS_BUCKET_NAME;
            const carrierId = data.fields.carrierId;

            const isWithinLimit = await checkStorageLimit(carrierId, file.size);
            if (!isWithinLimit) {
                return res.status(400).json({ error: 'Storage limit exceeded' });
            }

            const { gcsInputUri, uniqueFileName, originalFileName } = await uploadFile(
                localFilePath,
                file.originalFilename,
                bucketName,
            );

            return res.status(200).json({ gcsInputUri, uniqueFileName, originalFileName });
        } catch (error) {
            console.error('Error during the Uploading to GCS:', error);
            return res.status(500).json({ error: 'Error during the Uploading to GCS.' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
