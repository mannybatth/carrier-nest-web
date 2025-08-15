import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Initialize Google Cloud Storage
const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
});

export interface UploadResult {
    gcsInputUri: string;
    uniqueFileName: string;
    originalFileName: string;
}

export interface DocumentUploadResult {
    uploadResult?: UploadResult;
    success: boolean;
    error?: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
}

/**
 * Upload a file buffer to Google Cloud Storage
 */
export async function uploadFileToGCS(
    fileBuffer: Buffer,
    originalFileName: string,
    bucketName: string,
    folderPath = 'documents',
): Promise<UploadResult> {
    try {
        const extension = path.extname(originalFileName).toLowerCase();
        const uniqueFileName = `${Date.now()}-${uuidv4()}${extension}`;

        const bucket = storage.bucket(bucketName);
        const blob = bucket.file(`${folderPath}/${uniqueFileName}`);

        await blob.save(fileBuffer, {
            resumable: false,
            metadata: {
                contentType: getMimeType(extension),
            },
        });

        await blob.makePublic();

        const gcsInputUri = `https://storage.googleapis.com/${bucketName}/${folderPath}/${uniqueFileName}`;

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

/**
 * Upload multiple files to Google Cloud Storage only
 * Returns upload results without creating database records
 * The API calling this function should handle database operations
 */
export async function uploadFilesToGCS(
    files: File[],
    bucketName?: string,
    folderPath?: string,
): Promise<DocumentUploadResult[]> {
    const defaultBucketName = bucketName || process.env.GCP_LOAD_DOCS_BUCKET_NAME || 'carrier-nest-documents';
    const defaultFolderPath = folderPath || 'documents';

    // Validate GCS credentials
    if (!process.env.GCP_PROJECT_ID || !process.env.GCP_CLIENT_EMAIL || !process.env.GCP_PRIVATE_KEY) {
        throw new Error('Google Cloud Storage credentials not configured');
    }

    const results: DocumentUploadResult[] = [];

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

            // Convert file to buffer
            const fileBuffer = Buffer.from(await file.arrayBuffer());

            // Upload to Google Cloud Storage
            const uploadResult = await uploadFileToGCS(fileBuffer, file.name, defaultBucketName, defaultFolderPath);

            results.push({
                uploadResult,
                success: true,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type || 'application/octet-stream',
            });
        } catch (fileError) {
            console.error(`Error processing file ${file.name}:`, fileError);
            results.push({
                success: false,
                error: fileError instanceof Error ? fileError.message : 'Unknown error',
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type || 'application/octet-stream',
            });
        }
    }

    return results;
}

/**
 * Get MIME type from file extension
 */
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
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Extract successful uploads from results
 */
export function getSuccessfulUploads(results: DocumentUploadResult[]) {
    return results.filter((result) => result.success && result.uploadResult);
}

/**
 * Extract failed uploads from results
 */
export function getFailedUploads(results: DocumentUploadResult[]) {
    return results.filter((result) => !result.success);
}
