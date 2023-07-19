import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import { DocumentProcessorServiceClient, protos } from '@google-cloud/documentai';
// import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
// import { v4 as uuidv4 } from 'uuid';

export const config = {
    api: {
        bodyParser: false,
    },
};

// const storage = new Storage();
// const bucketName = process.env.GCP_TMP_BUCKET_NAME; // Replace with your GCP bucket name

// async function uploadFile(localFilePath: string): Promise<{ gcsInputUri: string; uniqueFileName: string }> {
//     const uniqueFileName = uuidv4(); // Generates a unique file name using UUID

//     await storage.bucket(bucketName).upload(localFilePath, {
//         destination: uniqueFileName,
//         resumable: false,
//     });

//     return {
//         gcsInputUri: `gs://${bucketName}/${uniqueFileName}`,
//         uniqueFileName,
//     };
// }

export default async (req: NextApiRequest, res: NextApiResponse) => {
    const client = new DocumentProcessorServiceClient();

    if (req.method === 'POST') {
        const form = new IncomingForm();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                return res.status(500).json({ error: 'Error parsing the uploaded file.' });
            }

            try {
                const localFilePath = files.file[0].filepath;
                const fileBuffer = await fs.readFile(localFilePath);

                // const { gcsInputUri, uniqueFileName } = await uploadFile(localFilePath);

                const parent = `projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.GCP_LOCATION}/processors/${process.env.GCP_PROCESSOR_ID}`;

                const request: protos.google.cloud.documentai.v1.IProcessRequest = {
                    name: parent,
                    rawDocument: {
                        content: fileBuffer,
                        mimeType: 'application/pdf',
                    },
                };

                const [result] = await client.processDocument(request);
                const { document } = result;
                const { text } = document; // Assuming the text is in the document object
                const pages = [];

                const getText = (textAnchor: protos.google.cloud.documentai.v1.Document.ITextAnchor) => {
                    if (!textAnchor.textSegments || textAnchor.textSegments.length === 0) {
                        return '';
                    }

                    // First shard in document doesn't have startIndex property
                    const startIndex = textAnchor.textSegments[0].startIndex || 0;
                    const endIndex = textAnchor.textSegments[0].endIndex;

                    return text.substring(startIndex as number, endIndex as number);
                };

                const getTopY = (block) => block.layout.boundingPoly.normalizedVertices[0].y;
                const getLeftX = (block) => block.layout.boundingPoly.normalizedVertices[0].x;
                const getBottomY = (block) => block.layout.boundingPoly.normalizedVertices[2].y;

                for (const page of document.pages) {
                    const blocks = [...page.lines];

                    blocks.sort((a, b) => {
                        const aTopY = getTopY(a);
                        const aBottomY = getBottomY(a);
                        const bTopY = getTopY(b);
                        const bBottomY = getBottomY(b);
                        const aLeftX = getLeftX(a);
                        const bLeftX = getLeftX(b);

                        // if the bottom of A is above the top of B, A is above B
                        if (aBottomY < bTopY) {
                            return -1;
                        }
                        // if the top of A is below the bottom of B, A is below B
                        else if (aTopY > bBottomY) {
                            return 1;
                        }
                        // A and B are on the same line, sort by x-coordinate
                        else {
                            return aLeftX - bLeftX;
                        }
                    });

                    // Create text for each page by joining all blocks
                    const pageText = blocks.map((block) => getText(block.layout.textAnchor)).join(' ');
                    pages.push(pageText);
                }

                await fs.unlink(localFilePath); // delete the local file
                // await storage.bucket(bucketName).file(uniqueFileName).delete(); // delete the file from GCS

                return res.status(200).json({ pages });
            } catch (error) {
                console.error('Error during the Document AI process:', error);
                return res.status(500).json({ error: 'Error during the Document AI process.' });
            }
        });
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
