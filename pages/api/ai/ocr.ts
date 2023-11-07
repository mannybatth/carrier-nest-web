import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import { DocumentProcessorServiceClient, protos } from '@google-cloud/documentai';
import { promises as fs } from 'fs';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
    const client = new DocumentProcessorServiceClient({
        projectId: process.env.GCP_PROJECT_ID,
        credentials: {
            type: 'service_account',
            private_key: process.env.GCP_PRIVATE_KEY,
            client_email: process.env.GCP_CLIENT_EMAIL,
            client_id: process.env.GCP_CLIENT_ID,
            universe_domain: 'googleapis.com',
        },
    });

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

            const parent = `projects/${process.env.GCP_OCR_PROJECT_ID}/locations/${process.env.GCP_OCR_LOCATION}/processors/${process.env.GCP_OCR_PROCESSOR_ID}`;

            const request: protos.google.cloud.documentai.v1.IProcessRequest = {
                name: parent,
                rawDocument: {
                    content: Buffer.from(fileBuffer).toString('base64'),
                    mimeType: 'application/pdf',
                },
                fieldMask: {
                    paths: [
                        'text',
                        'pages.blocks',
                        'pages.lines',
                        'pages.pageNumber',
                        'pages.tokens',
                        'pages.dimension',
                        'pages.layout',
                    ],
                },
            };

            const [result] = await client.processDocument(request);
            // console.log('result:', JSON.stringify(result, null, 1));
            const { document } = result;
            const { text } = document; // Assuming the text is in the document object
            const pagesInBlocks = [];
            const pagesInLines = [];

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
                const blocks = [...page.blocks];

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
                pagesInBlocks.push(pageText);
            }

            for (const page of document.pages) {
                const lines = [...page.lines];

                lines.sort((a, b) => {
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

                // Create text for each page by joining all lines
                const pageText = lines.map((block) => getText(block.layout.textAnchor)).join(' ');
                pagesInLines.push(pageText);
            }

            await fs.unlink(localFilePath); // delete the local file

            const pages = document.pages.map((page) => {
                return {
                    pageNumber: page.pageNumber,
                    tokens: page.tokens,
                    dimension: page.dimension,
                    layout: page.layout,
                };
            });
            return res.status(200).json({
                blocks: pagesInBlocks,
                lines: pagesInLines,
                pages,
            });
        } catch (error) {
            console.error('Error during the Document AI process:', error);
            return res.status(500).json({ error: 'Error during the Document AI process.' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
