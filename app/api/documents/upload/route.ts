import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Route segment config for handling large file uploads
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
});

async function uploadFileToGCS(
    fileBuffer: Buffer,
    originalFileName: string,
    bucketName: string,
    useOriginalName = false,
): Promise<{ gcsInputUri: string; uniqueFileName: string; originalFileName: string }> {
    try {
        const extension = path.extname(originalFileName).toLowerCase();

        // Use original filename if requested (for expense documents with custom naming)
        // Otherwise generate a unique filename
        const uniqueFileName = useOriginalName ? originalFileName : `${Date.now()}-${uuidv4()}${extension}`;

        const bucket = storage.bucket(bucketName);
        const blob = bucket.file(`documents/${uniqueFileName}`);

        await blob.save(fileBuffer, {
            resumable: false,
            metadata: {
                contentType: getMimeType(extension),
            },
        });

        await blob.makePublic();

        const gcsInputUri = `https://storage.googleapis.com/${bucketName}/documents/${uniqueFileName}`;

        return {
            gcsInputUri,
            uniqueFileName,
            originalFileName,
        };
    } catch (error) {
        console.error('GCS upload error:', error);
        throw new Error(`Failed to upload ${originalFileName} to cloud storage: ${error.message}`);
    }
}

function getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.txt': 'text/plain',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeTypes[extension] || 'application/octet-stream';
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        const uploadedDocuments = [];

        for (const file of files) {
            try {
                // Validate file
                if (file.size === 0) {
                    throw new Error('File is empty');
                }

                if (file.size > 50 * 1024 * 1024) {
                    // 50MB limit
                    throw new Error('File too large (max 50MB)');
                }

                // Convert file to buffer with error handling
                let fileBuffer: Buffer;
                try {
                    fileBuffer = Buffer.from(await file.arrayBuffer());
                } catch (bufferError) {
                    console.error('Error converting file to buffer:', bufferError);
                    throw new Error(`Failed to process file: ${file.name}`);
                }

                // Upload to Google Cloud Storage
                const bucketName = process.env.GCP_LOAD_DOCS_BUCKET_NAME || 'carrier-nest-documents';

                if (!process.env.GCP_PROJECT_ID || !process.env.GCP_CLIENT_EMAIL || !process.env.GCP_PRIVATE_KEY) {
                    throw new Error('Google Cloud Storage credentials not configured');
                }

                // Check if this is a renamed expense file (starts with "expense-")
                const useOriginalName = file.name.startsWith('expense-');

                const uploadResult = await uploadFileToGCS(fileBuffer, file.name, bucketName, useOriginalName);

                // Create document record with real storage URL
                const document = await prisma.document.create({
                    data: {
                        fileName: file.name,
                        mimeType: file.type || 'application/octet-stream',
                        sizeBytes: file.size,
                        storageUrl: uploadResult.gcsInputUri,
                        uploadedBy: session.user.id,
                    },
                });

                uploadedDocuments.push(document);
            } catch (fileError) {
                console.error(`Error processing file ${file.name}:`, fileError);

                // Create document record with placeholder URL if upload fails
                const document = await prisma.document.create({
                    data: {
                        fileName: file.name,
                        mimeType: file.type || 'application/octet-stream',
                        sizeBytes: file.size,
                        storageUrl: `placeholder://documents/${Date.now()}-${file.name}`,
                        uploadedBy: session.user.id,
                    },
                });

                uploadedDocuments.push(document);
            }
        }

        // Filter out documents with placeholder URLs for the response
        const successfulUploads = uploadedDocuments.filter((doc) => !doc.storageUrl.startsWith('placeholder://'));

        const failedUploads = uploadedDocuments.filter((doc) => doc.storageUrl.startsWith('placeholder://'));

        if (successfulUploads.length === 0) {
            return NextResponse.json(
                {
                    error: 'All document uploads failed',
                    failedFiles: failedUploads.map((doc) => doc.fileName),
                },
                { status: 500 },
            );
        }

        return NextResponse.json({
            documents: successfulUploads,
            documentIds: successfulUploads.map((doc) => doc.id),
            ...(failedUploads.length > 0 && {
                warnings: [`${failedUploads.length} file(s) failed to upload to cloud storage`],
                failedFiles: failedUploads.map((doc) => doc.fileName),
            }),
        });
    } catch (error) {
        console.error('Document upload error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
