import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

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
const bucketName = process.env.GCP_TMP_BUCKET_NAME; // Replace with your GCP bucket name

async function uploadFile(localFilePath: string): Promise<{ gcsInputUri: string; uniqueFileName: string }> {
    const uniqueFileName = uuidv4(); // Generates a unique file name using UUID

    await storage.bucket(bucketName).upload(localFilePath, {
        destination: uniqueFileName,
        resumable: false,
    });

    return {
        gcsInputUri: `gs://${bucketName}/${uniqueFileName}`,
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

            const localFilePath = data.files.file[0].filepath;
            const fileBuffer = await fs.readFile(localFilePath);

            const { gcsInputUri, uniqueFileName } = await uploadFile(localFilePath);

            await fs.unlink(localFilePath); // delete the local file

            return res.status(200).json({ pages });
        } catch (error) {
            console.error('Error during the Document AI process:', error);
            return res.status(500).json({ error: 'Error during the Document AI process.' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
