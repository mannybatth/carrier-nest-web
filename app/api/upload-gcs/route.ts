import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import prisma from 'lib/prisma';
import { isProPlan } from 'lib/subscription';

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
    const uniqueFileName = `${uuidv4()}${extension}`;

    await storage.bucket(bucketName).upload(localFilePath, {
        destination: uniqueFileName,
        resumable: false,
    });

    await storage.bucket(bucketName).file(uniqueFileName).makePublic();
    await fs.unlink(localFilePath);

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

    const maxStorage =
        isProPlan(carrier.subscription) && carrier.subscription?.numberOfDrivers
            ? parseInt(process.env.NEXT_PUBLIC_PRO_PLAN_MAX_STORAGE_GB_PER_DRIVER) *
              1024 *
              1024 *
              1024 *
              carrier.subscription.numberOfDrivers
            : parseInt(process.env.NEXT_PUBLIC_BASIC_PLAN_MAX_STORAGE_MB) * 1024 * 1024;

    return currentStorage + fileSize <= maxStorage;
}

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const carrierId = req.auth.user.defaultCarrierId;

    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bucketName = process.env.GCP_LOAD_DOCS_BUCKET_NAME;

        // Use the correct size property from the File object
        const fileSize = file.size || 0;
        const isWithinLimit = await checkStorageLimit(carrierId, fileSize);
        if (!isWithinLimit) {
            return NextResponse.json({ error: 'Storage limit exceeded' }, { status: 400 });
        }

        // Create a temporary file to store the uploaded content
        const tempPath = `/tmp/${Date.now()}-${file.name}`;
        const buffer = await file.arrayBuffer();
        await fs.writeFile(tempPath, Buffer.from(buffer));

        const { gcsInputUri, uniqueFileName, originalFileName } = await uploadFile(tempPath, file.name, bucketName);

        return NextResponse.json({ gcsInputUri, uniqueFileName, originalFileName });
    } catch (error) {
        console.error('Error during the Uploading to GCS:', error);
        return NextResponse.json({ error: 'Error during the Uploading to GCS.' }, { status: 500 });
    }
});

export const GET = (req: NextAuthRequest) => {
    return NextResponse.json({ message: `Method ${req.method} Not Allowed` }, { status: 405 });
};
