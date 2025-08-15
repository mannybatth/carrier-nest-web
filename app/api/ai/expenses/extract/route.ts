import { createVertex } from '@ai-sdk/google-vertex';
import { generateObject } from 'ai';
import { auth } from 'auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from 'lib/prisma';

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

const vertex = createVertex({
    location: 'us-central1',
    project: process.env.GCP_PROJECT_ID,
    googleAuthOptions: {
        credentials: {
            type: 'service_account',
            private_key: process.env.GCP_PRIVATE_KEY,
            client_email: process.env.GCP_CLIENT_EMAIL,
            client_id: process.env.GCP_CLIENT_ID,
            project_id: process.env.GCP_PROJECT_ID,
        },
    },
});

const expenseDataSchema = z.object({
    amount: z.number().describe('The total amount of the expense'),
    description: z.string().optional().describe('Description of the expense'),
    receiptDate: z.string().optional().describe('Date of the receipt in YYYY-MM-DD format'),
    categoryName: z
        .string()
        .optional()
        .describe('EXACT category name from the provided list that best matches this expense type'),
    vendorName: z.string().optional().describe('Name of the merchant/vendor/business'),
    location: z
        .object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().optional(),
        })
        .optional()
        .describe('Location where the expense occurred'),
    currencyCode: z.string().optional().describe('Currency code (USD, CAD, etc.)'),
    confidence: z.number().min(0).max(1).describe('Confidence level of the extraction (0-1)'),
});

async function fetchDocumentAI(base64File: string, accessToken: string, mimeType: string) {
    const url = `https://documentai.googleapis.com/v1/projects/${process.env.GCP_OCR_PROJECT_ID}/locations/${process.env.GCP_OCR_LOCATION}/processors/${process.env.GCP_OCR_PROCESSOR_ID}:process`;

    const request = {
        rawDocument: {
            content: base64File,
            mimeType: mimeType,
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

function extractTextFromDocument(document: any): string {
    const getText = (textAnchor: ITextAnchor) => {
        if (!textAnchor.textSegments || textAnchor.textSegments.length === 0) {
            return '';
        }

        const startIndex = textAnchor.textSegments[0].startIndex || 0;
        const endIndex = textAnchor.textSegments[0].endIndex;

        return document.text.substring(startIndex as number, endIndex as number);
    };

    const pagesText: string[] = [];

    for (const page of document.pages) {
        if (!page.blocks) {
            continue;
        }

        const pageText = page.blocks.map((block: any) => getText(block.layout.textAnchor)).join(' ');
        pagesText.push(pageText);
    }

    return pagesText.join('\n\n');
}

export async function POST(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.defaultCarrierId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let text: string;
        let documentType: string | undefined;

        // Get access token for Document AI
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

        // Check if the request contains a file or text
        const contentType = request.headers.get('content-type');

        if (contentType?.includes('multipart/form-data')) {
            // Handle file upload
            const formData = await request.formData();
            const file = formData.get('file') as File;

            if (!file) {
                return NextResponse.json(
                    {
                        error: 'File is required for extraction',
                    },
                    { status: 400 },
                );
            }

            // Convert file to base64 for Document AI processing
            const arrayBuffer = await file.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');

            // Determine file type and process accordingly
            if (file.type.includes('text') || file.name.toLowerCase().endsWith('.txt')) {
                text = await file.text();
                documentType = 'text';
            } else if (
                file.type.includes('image') ||
                file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
            ) {
                // Use Document AI for image OCR
                const response = await fetchDocumentAI(base64, accessToken, file.type);
                text = extractTextFromDocument(response.document);
                documentType = 'image';
            } else if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
                // Use Document AI for PDF OCR
                const response = await fetchDocumentAI(base64, accessToken, 'application/pdf');
                text = extractTextFromDocument(response.document);
                documentType = 'pdf';
            } else {
                return NextResponse.json(
                    {
                        error: `File type ${file.type} not supported. Please upload text, image (JPG, PNG), or PDF files.`,
                    },
                    { status: 400 },
                );
            }
        } else {
            // Handle JSON request with text
            const body = await request.json();
            text = body.text;
            documentType = body.documentType;
        }

        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                {
                    error: 'Text content is required for extraction',
                },
                { status: 400 },
            );
        }

        // Get available expense categories to help with classification
        const categories = await prisma.expenseCategory.findMany({
            where: { isActive: true },
            select: { id: true, name: true, group: true },
            orderBy: [{ group: 'asc' }, { name: 'asc' }],
        });

        const categoryNames = categories.map((cat) => cat.name);

        const systemPrompt = `You are an AI assistant specialized in extracting expense information from receipts, invoices, and expense documents for a trucking/logistics company.

Available expense categories (choose the most appropriate one):
${categoryNames.join(', ')}

Extract expense information from the provided text content and classify it into one of the available categories. Focus on:
1. Total amount (look for final totals, not subtotals)
2. Date of the transaction
3. Merchant/vendor name
4. Location information
5. Description of goods/services
6. Currency (if not USD)
7. Category classification - IMPORTANT: Choose the EXACT category name from the list above that best matches the expense type

For categoryName, you MUST select one of these exact category names:
${categoryNames.join(', ')}

Examples of category selection:
- If it's a gas station receipt → "Diesel Fuel" or "Gasoline"
- If it's a hotel bill → "Lodging / Hotel"
- If it's a restaurant receipt → "Meals"
- If it's a tire repair → "Tires & Tire Repair"
- If it's a toll receipt → "Toll Fees"
- If it's a parking receipt → "Parking Fees"

Be conservative with confidence scores. Use lower confidence if the information is unclear or if you're making assumptions.`;

        const result = await generateObject({
            model: vertex('gemini-2.0-flash-001'),
            system: systemPrompt,
            prompt: `Extract expense information from this ${documentType || 'document'} content:\n\n${text}`,
            schema: expenseDataSchema,
        });

        // Try to find matching category ID and group
        let categoryId = null;
        let groupName = null;
        if (result.object.categoryName) {
            const matchingCategory = categories.find(
                (cat) => cat.name.toLowerCase() === result.object.categoryName!.toLowerCase(),
            );
            if (matchingCategory) {
                categoryId = matchingCategory.id;
                groupName = matchingCategory.group;
            }
        }

        const extractedData = {
            ...result.object,
            categoryId,
            categoryIds: categoryId ? [categoryId] : [],
            groupName,
            extractedAt: new Date().toISOString(),
            extractionSource: 'ai',
        };

        return NextResponse.json({
            success: true,
            data: extractedData,
            availableCategories: categories,
        });
    } catch (error) {
        console.error('Error in AI expense extraction:', error);

        // Return a structured error response
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to extract expense data',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}
