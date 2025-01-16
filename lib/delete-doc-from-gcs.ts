import { Storage } from '@google-cloud/storage';
import { LoadDocument } from '@prisma/client';

export const deleteDocumentFromGCS = async (document: LoadDocument): Promise<void> => {
    const storage = new Storage({
        projectId: process.env.GCP_PROJECT_ID,
        credentials: {
            client_email: process.env.GCP_CLIENT_EMAIL,
            private_key: process.env.GCP_PRIVATE_KEY,
        },
    });

    const bucket = storage.bucket(process.env.GCP_LOAD_DOCS_BUCKET_NAME);
    const file = bucket.file(document.fileKey);

    await file.delete();
};
