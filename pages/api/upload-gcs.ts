import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, PersistentFile } from 'formidable';
import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

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
): Promise<{ gcsInputUri: string; uniqueFileName: string }> {
    const extension = path.extname(originalFileName); // Extract the file extension
    const uniqueFileName = `${uuidv4()}${extension}`; // Append the extension to the unique file name

    await storage.bucket(bucketName).upload(localFilePath, {
        destination: uniqueFileName,
        resumable: false,
    });

    // Make file public
    await storage.bucket(bucketName).file(uniqueFileName).makePublic();

    return {
        gcsInputUri: `https://storage.googleapis.com/${bucketName}/${uniqueFileName}`,
        uniqueFileName,
    };
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

            const { gcsInputUri, uniqueFileName } = await uploadFile(localFilePath, file.originalFilename, bucketName);

            await fs.unlink(localFilePath); // delete the local file

            return res.status(200).json({ gcsInputUri, uniqueFileName });
        } catch (error) {
            console.error('Error during the Document AI process:', error);
            return res.status(500).json({ error: 'Error during the Document AI process.' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
