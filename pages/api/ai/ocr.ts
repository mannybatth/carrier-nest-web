import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webAuthLibrary = require('web-auth-library');

interface ITextSegment {
    /** TextSegment startIndex */
    startIndex?: number | Long | string | null;

    /** TextSegment endIndex */
    endIndex?: number | Long | string | null;
}

interface ITextAnchor {
    /** TextAnchor textSegments */
    textSegments?: ITextSegment[] | null;

    /** TextAnchor content */
    content?: string | null;
}

export const config = {
    runtime: 'edge',
};

export default async function POST(req: NextRequest) {
    // Generate a short lived access token from the service account key credentials
    const accessToken = await webAuthLibrary.google.getAccessToken({
        credentials: {
            type: 'service_account',
            private_key: process.env.GCP_PRIVATE_KEY,
            client_email: process.env.GCP_CLIENT_EMAIL,
            client_id: process.env.GCP_CLIENT_ID,
            token_uri: 'https://oauth2.googleapis.com/token',
        } as any,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
    });

    if (req.method === 'POST') {
        try {
            const { file } = await req.json();
            const response = await fetchDocumentAI(file, accessToken);

            const { document } = response;
            const { text } = document; // Assuming the text is in the document object
            const pagesInBlocks = [];
            const pagesInLines = [];

            const getText = (textAnchor: ITextAnchor) => {
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
                if (!page.blocks) {
                    continue;
                }
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
                if (!page.lines) {
                    continue;
                }
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

            const pages = document.pages.map((page) => {
                return {
                    pageNumber: page.pageNumber,
                    tokens: page.tokens,
                    dimension: page.dimension,
                    layout: page.layout,
                };
            });
            return NextResponse.json({
                blocks: pagesInBlocks,
                lines: pagesInLines,
                pages,
            });
        } catch (error) {
            console.error('Error during the Document AI process:', error);
            return NextResponse.json({ error: 'Error during the Document AI process.' }, { status: 500 });
        }
    } else {
        return NextResponse.next();
    }
}

async function fetchDocumentAI(base64File, accessToken) {
    const url = `https://documentai.googleapis.com/v1/projects/${process.env.GCP_OCR_PROJECT_ID}/locations/${process.env.GCP_OCR_LOCATION}/processors/${process.env.GCP_OCR_PROCESSOR_ID}:process`;

    const request = {
        rawDocument: {
            content: base64File,
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

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error(`Document AI API responded with status: ${response.status}`);
    }

    return response.json();
}
