import { createVertex } from '@ai-sdk/google-vertex';
import { streamText } from 'ai';
import { auth } from 'auth';
import { canImportRatecon } from 'lib/ratecon-import-check/ratecon-import-check-server';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

interface LogisticsData {
    logistics_company: string;
    load_number: string;
    stops: {
        type: string;
        name: string;
        address: {
            street: string;
            city: string;
            state: string;
            zip: string;
            country: string;
        };
        date: string;
        time: string;
        po_numbers?: string[];
        pickup_numbers?: string[];
        reference_numbers?: string[];
    }[];
    rate: number;
    invoice_emails: string[];
    customer_details?: {
        name: string;
        contact_email?: string;
        billing_email?: string;
        payment_status_email?: string;
        address?: {
            street: string;
            city: string;
            state: string;
            zip: string;
            country: string;
        };
    };
}

const system = `Objective: Extract logistics information from provided text content (bypassing OCR) and structure the extracted data.

Output Format:
{
    "logistics_company": string or null,
    "load_number": string or null,
    "stops": [
        {
            "type": string, // "PU" for pickup/shipper, "SO" for delivery/consignee
            "name": string or null,
            "address": {
                "street": string or null,
                "city": string or null,
                "state": string or null,
                "zip": string or null,
                "country": string or null
            } or null,
            "date": string or null, // MM/DD/YYYY format
            "time": string or null, // 24-hour format or range "HH:mm - HH:mm"
            "po_numbers": [string] or null,
            "pickup_numbers": [string] or null,
            "reference_numbers": [string] or null
        }
    ],
    "rate": number or null,
    "invoice_emails": [string] or null,
    "customer_details": {
        "name": string or null,
        "contact_email": string or null,
        "billing_email": string or null,
        "payment_status_email": string or null,
        "address": {
            "street": string or null,
            "city": string or null,
            "state": string or null,
            "zip": string or null,
            "country": string or null
        } or null
    } or null
}

Extraction Guidelines:
1. General: Extract information directly from the provided text content. Default to 'null' in ambiguous situations.
2. Logistics Company/Broker: Distinct from the carrier. Prioritize names with suffixes like "LLC", "Inc", "Corp". Exclude slogans.
3. Load Number: Identify as "Load", "Order", "Load #", "Order #", etc. Remove '#' from the result.
4. Stops:
    - Types: Classify as "PU" for indications of "shipper" or "pickup"; use "SO" for terms like "consignee", "receiver", or "delivery".
    - Details:
        - Name & Address: Capture the entity's name along with its complete address.
        - Date: Extract the date ensuring it follows the MM/DD/YYYY format. Look for nearby contextual clues (like "Date:") to accurately identify it.
        - Time: The shipping/receiving hours for the shipment. The extracted time should strictly be in the 24-hour format. If a range is provided, it should appear in the format "HH:mm - HH:mm", for instance, "05:00 - 20:00". If the time is accompanied by a date within the range (like "2023-06-01 05:00 - 2023-07-08 20:00"), only the time portion should be extracted, omitting the date.
5. Rate: Look for "Total", "Rate", "Amount". Extract the complete amount including any additional fees. Represent the value numerically.
6. Invoice Emails: Extract all emails where invoices should be sent. If none are found, use 'null'.
7. Customer Details: Extract comprehensive broker information as customer details (since you invoice the broker who generated this rate confirmation):
    - Name: The broker/logistics company name. This is the entity that contracted the load and will be invoiced. Look for "Broker", "Logistics Company", "Contracted By", "Bill To", or the main company header on the rate confirmation.
    - Contact Email: Broker's primary contact email, often labeled as "Contact", "Email", "Broker Email", "Coordinator Email"
    - Billing Email: Email where the broker expects BOL/POD paperwork to be sent for processing invoices. Look for "Submit Documents", "Send BOL", "Send POD", "Document Submission", "Paperwork Email", "Invoice Documents", or similar instructions.
    - Payment Status Email: Email for payment status communications, often labeled as "Accounts Payable", "AP", "Payment", "Finance"
    - Address: Complete broker address when available

Critical Notes:
- This endpoint processes direct text input and bypasses OCR completely
- Extract information exactly as provided in the text without assuming OCR errors
- Maintain consistency with the existing AI endpoint output format for seamless integration
- Ensure all extracted data is properly validated and formatted according to guidelines
- Response must be valid JSON only - no markdown code blocks, no additional text or explanation
- Return ONLY the JSON object with extracted data

IMPORTANT: Your response must be valid JSON that can be parsed directly. Do not wrap it in markdown code blocks or add any explanatory text.`;

export const maxDuration = 30;
export const POST = auth(async (req: NextAuthRequest) => {
    if (req.method !== 'POST') {
        return new NextResponse(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const session = req.auth;
    if (!session || !session.user || !session.user.defaultCarrierId) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const carrierId = session.user.defaultCarrierId;

    try {
        const { text } = await req.json();

        if (!text || typeof text !== 'string') {
            return new NextResponse(JSON.stringify({ error: 'Invalid input. Expected text string.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (text.trim().length === 0) {
            return new NextResponse(JSON.stringify({ error: 'Invalid input. Text cannot be empty.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (text.length > 15000) {
            return new NextResponse(
                JSON.stringify({ error: 'Text is too long. Maximum length is 15,000 characters.' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        // Check if user can import ratecon (rate limiting)
        const canImport = await canImportRatecon({
            carrierId,
            shouldIncrement: true,
        });
        if (!canImport) {
            return new NextResponse(JSON.stringify({ error: 'Ratecon import limit reached.' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 403,
            });
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

        const result = streamText({
            model: vertex('gemini-2.0-flash-001', {
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_ONLY_HIGH',
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_ONLY_HIGH',
                    },
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_ONLY_HIGH',
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_ONLY_HIGH',
                    },
                ],
            }),
            maxTokens: 2048,
            temperature: 0,
            system: system,
            prompt: text,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('AI Text Processing Error:', error);

        let errorMessage = 'An error occurred while processing the text';
        let statusCode = 500;

        if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
            errorMessage = 'Rate limit exceeded. Please try again later.';
            statusCode = 429;
        } else if (error.message?.includes('timeout')) {
            errorMessage = 'Request timeout. Please try again with shorter text.';
            statusCode = 408;
        } else if (error.message?.includes('Invalid input')) {
            errorMessage = error.message;
            statusCode = 400;
        } else if (error.message) {
            errorMessage = error.message;
        }

        return new NextResponse(JSON.stringify({ error: errorMessage }), {
            status: statusCode,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
