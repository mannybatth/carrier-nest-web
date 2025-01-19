import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import prisma from 'lib/prisma';
import { isProPlan } from 'lib/subscription';
import 'polyfills';

const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY,
    },
});

async function uploadFile(
    fileBuffer: Buffer,
    originalFileName: string,
    bucketName: string,
): Promise<{ gcsInputUri: string; uniqueFileName: string; originalFileName: string }> {
    const extension = path.extname(originalFileName).toLowerCase();
    const uniqueFileName = `${uuidv4()}${extension}`;

    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(uniqueFileName);

    await blob.save(fileBuffer, {
        resumable: false,
    });

    await blob.makePublic();

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

    const currentStorage = documents.reduce((acc, doc) => acc + BigInt(doc.fileSize), BigInt(0));

    const maxStorage =
        isProPlan(carrier.subscription) && carrier.subscription?.numberOfDrivers
            ? parseInt(process.env.NEXT_PUBLIC_PRO_PLAN_MAX_STORAGE_GB_PER_DRIVER) *
              1024 *
              1024 *
              1024 *
              carrier.subscription.numberOfDrivers
            : parseInt(process.env.NEXT_PUBLIC_BASIC_PLAN_MAX_STORAGE_MB) * 1024 * 1024;

    return currentStorage + BigInt(fileSize) <= BigInt(maxStorage);
}

export const POST = auth(async (req: NextAuthRequest) => {
    const assignmentId = req.nextUrl.searchParams.get('aid');
    const driverId = req.nextUrl.searchParams.get('did');

    // FIX: Needs to be allowed for driver page that doesn't have a login
    if (!req.auth && !(assignmentId && driverId)) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let carrierId = req.auth?.user?.defaultCarrierId;

    if (assignmentId && driverId) {
        const driver = await prisma.driver.findUnique({
            where: {
                id: driverId,
                assignments: {
                    some: {
                        id: assignmentId,
                    },
                },
            },
        });

        if (!driver) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }

        carrierId = driver.carrierId;
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as unknown as {
            arrayBuffer: () => Promise<ArrayBuffer>;
            name: string;
            size: number;
        };

        if (!file || !file.arrayBuffer) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bucketName = process.env.GCP_LOAD_DOCS_BUCKET_NAME;
        const isWithinLimit = await checkStorageLimit(carrierId, file.size);

        if (!isWithinLimit) {
            return NextResponse.json({ error: 'Storage limit exceeded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const { gcsInputUri, uniqueFileName, originalFileName } = await uploadFile(buffer, file.name, bucketName);

        return NextResponse.json({ gcsInputUri, uniqueFileName, originalFileName });
    } catch (error) {
        console.error('Error during the Uploading to GCS:', error);
        return NextResponse.json({ error: 'Error during the Uploading to GCS.' }, { status: 500 });
    }
});

export const GET = (req: NextAuthRequest) => {
    return NextResponse.json({ message: `Method ${req.method} Not Allowed` }, { status: 405 });
};
