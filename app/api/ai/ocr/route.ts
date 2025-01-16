import { auth } from 'auth';
import { canImportRatecon } from 'lib/ratecon-import-check/ratecon-import-check-server';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const webAuthLibrary = require('web-auth-library');

interface ITextSegment {
    startIndex?: number | string | null;
    endIndex?: number | string | null;
}

interface ITextAnchor {
    textSegments?: ITextSegment[] | null;
    content?: string | null;
}

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const carrierId = req.auth.user.defaultCarrierId;

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

            const canImport = await canImportRatecon(carrierId);
            if (!canImport) {
                return NextResponse.json({ error: 'Ratecon import limit reached.' }, { status: 403 });
            }

            const response = await fetchDocumentAI(file, accessToken);

            const { document } = response;
            const { text } = document;
            const pagesInBlocks = [];
            const pagesInLines = [];

            const getText = (textAnchor: ITextAnchor) => {
                if (!textAnchor.textSegments || textAnchor.textSegments.length === 0) {
                    return '';
                }

                const startIndex = textAnchor.textSegments[0].startIndex || 0;
                const endIndex = textAnchor.textSegments[0].endIndex;

                return text.substring(startIndex as number, endIndex as number);
            };

            const pageProps = document.pages[0].dimension;

            const annotations = extractTextAnnotations(document, getText);

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

                    if (aBottomY < bTopY) {
                        return -1;
                    } else if (aTopY > bBottomY) {
                        return 1;
                    } else {
                        return aLeftX - bLeftX;
                    }
                });

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

                    if (aBottomY < bTopY) {
                        return -1;
                    } else if (aTopY > bBottomY) {
                        return 1;
                    } else {
                        return aLeftX - bLeftX;
                    }
                });

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
                annotations,
                pageProps,
            });
        } catch (error) {
            console.error('Error during the Document AI process:', error);
            return NextResponse.json({ error: 'Error during the Document AI process.' }, { status: 500 });
        }
    } else {
        return NextResponse.next();
    }
});

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

function extractTextAnnotations(document, getText) {
    const annotations = {
        blocks: [],
        lines: [],
    };

    for (const [index, page] of document.pages.entries()) {
        if (page.blocks) {
            const pageBlocks = page.blocks.map((block) => ({
                text: getText(block.layout.textAnchor),
                boundingPoly: {
                    vertices: block.layout.boundingPoly.vertices,
                    normalizedVertices: block.layout.boundingPoly.normalizedVertices,
                },
                pageNumber: index,
            }));
            annotations.blocks.push(...pageBlocks);
        }
    }

    for (const [index, page] of document.pages.entries()) {
        if (page.lines) {
            const pageLines = page.lines.map((line) => ({
                text: getText(line.layout.textAnchor),
                boundingPoly: {
                    vertices: line.layout.boundingPoly.vertices,
                    normalizedVertices: line.layout.boundingPoly.normalizedVertices,
                },
                pageNumber: index,
            }));
            annotations.lines.push(...pageLines);
        }
    }

    return annotations;
}
