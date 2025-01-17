import { BytesOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatVertexAI } from '@langchain/google-vertexai-web';
import { StreamingTextResponse } from 'ai';
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
}

const template = `{context}

{question}`;

const question = `Objective: Extract sequences from a rate confirmation document using OCR and structure the extracted data.

Output Format:
{
    "logistics_company": string or null,
    "load_number": string or null,
    "stops": [
        {
            "type": "PU" or "SO",
            "name": string or null,
            "address": {
                "street": string or null,
                "city": string or null,
                "state": string or null,
                "zip": string or null,
                "country": string or null
            },
            "date": string or null (use MM/DD/YYYY format, replace - with / if necessary),
            "time": string or null,
            "po_numbers": ["<po_number_1>", "<po_number_2>", ...] or null,
            "pickup_numbers": ["<pickup_number_1>", "<pickup_number_2>", ...] or null,
            "reference_numbers": ["<reference_number_1>", "<reference_number_2>", ...] or null
        },
        ... (repeat this structure for each stop regardless if it appears multiple times)
    ],
    "rate": number or null,
    "invoice_emails": ["<invoice_email_1>", "<invoice_email_2>", ...] or null
}

Extraction Guidelines:
1. General: Context is crucial due to OCR inaccuracies. Default to 'null' in ambiguous situations.
2. Logistics Company/Broker: Distinct from the carrier. Prioritize names with suffixes like "LLC", "Inc", "Corp". Exclude slogans.
3. Load Number: Identify as "Load", "Order", "Load #", "Order #", etc. Remove '#' from the result.
4. Stops:
    - Types: Classify as "PU" for indications of "shipper" or "pickup"; use "SO" for terms like "consignee", "receiver", or "delivery".
    - Details:
        - Name & Address: Capture the entity's name along with its complete address.
        - Date: Extract the date ensuring it follows the MM/DD/YYYY format. Be on the lookout for nearby contextual clues (like "Date:") to accurately identify it.
        - Time: The shipping/receiving hours for the shipment. The extracted time should strictly be in the 24-hour format. If a range is provided, it should appear in the format "HH:mm - HH:mm", for instance, "05:00 - 20:00". If the time is accompanied by a date within the range (like "2023-06-01 05:00 - 2023-07-08 20:00"), only the time portion should be extracted, omitting the date.
5. Rate: Look for "Total", "Rate", "Amount". Extract the complete amount including any additional fees. Represent the value numerically.
6. Invoice Emails: Extract all emails where invoices should be sent. If none are found, use 'null'.

Advanced Extraction Details:
1. PO Numbers:
    - Extract from labels "PO", "PO Number", "PO #".
    - Avoid numbers far from labels or near "Ref Numbers:", "BOL#", "ORDER:", "Pro".
2. Pickup Numbers:
    - Start with labels like "Pickup", "PU", "Pickup #", "Delivery", etc.
    - Be cautious about sequences near "Load Number", "Order Number", "Ref", "Reference", or resembling phone numbers.
3. Reference Numbers:
    - This is vital. Capture the entire sequence of label-value pairs immediately following mentions of "Reference", "Ref Numbers", or "Shipper ID". These pairs are typically separated by commas.
    - Concatenate all the captured label-value pairs from a single stop using commas but without line breaks.
    - Stay vigilant for any continuation on the next page and strictly avoid usual address patterns or mentions like "Phone", "Tel", or "Contact".

Example:
Document snippet:

LOGISTICS DETAILS
-----------------

Contracted By:     C.H. Robinson

LOAD CONFIRMATION
-----------------
Load #:            426973549

SHIPMENT STOPS
---------------
Shipper:

Gorilla Glue Company
2125 E Kemper Rd, Cincinnati, OH 45241
Stop Type:         Pickup (PU)
Date:              2/23/2023
Time:              12:00
Reference: SI#: 90, CFM: Y, QN: 90, ZN: 768327, SWT: 33282.0, SPC: 1493.0

Receiver:

CHR Metro Air Logistics Center
4241 Plainfield Rd, Plainfield, IN 46231
Stop Type:         Dropoff (SO)
Date:              2/23/2023
Time:              19:00
Reference Numbers: 1RPRL2-01, 1RPRF9-01

RATE INFORMATION
----------------
Total Rate:        $800.00

INVOICE DETAILS
---------------
Please submit freight bills to the following emails:
- LoadDocs@CHRobinson.com

Page 1 of 1

Extraction output:
{
    "logistics_company": "C.H. Robinson",
    "load_number": "426973549",
    "stops": [
        {
            "type": "PU",
            "name": "Gorilla Glue Company",
            "address": {
                "street": "2125 E Kemper Rd",
                "city": "Cincinnati",
                "state": "OH",
                "zip": "45241",
                "country": null
            },
            "date": "2/23/2023",
            "time": "12:00",
            "po_numbers": null,
            "pickup_numbers": null,
            "reference_numbers": ["SI#: 90", "CFM: Y", "QN: 90", "ZN: 768327", "SWT: 33282.0", "SPC: 1493.0"]
        },
        {
            "type": "SO",
            "name": "CHR Metro Air Logistics Center",
            "address": {
                "street": "4241 Plainfield Rd",
                "city": "Plainfield",
                "state": "IN",
                "zip": "46231",
                "country": null
            },
            "date": "2/23/2023",
            "time": "19:00",
            "po_numbers": null,
            "pickup_numbers": null,
            "reference_numbers": ["1RPRL2-01", "1RPRF9-01"]
        }
    ],
    "rate": 800.00,
    "invoice_emails": ["LoadDocs@CHRobinson.com"]
}`;

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
        const { documents } = await req.json();

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

        const outputParser = new BytesOutputParser();

        if (!Array.isArray(documents)) {
            throw new Error('Invalid input. Expected arrays.');
        }

        if (documents.length === 0) {
            throw new Error('Invalid input. Expected arrays with at least one item.');
        }

        const context = documents.map((item) => {
            return item.pageContent as string;
        });

        const promptTemplate = new PromptTemplate({
            template,
            inputVariables: ['question', 'context'],
        });

        const model = new ChatVertexAI({
            model: 'gemini-1.5-pro-001',
            maxOutputTokens: 2048,
            temperature: 0,
            verbose: process.env.NODE_ENV === 'development',
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
            authOptions: {
                credentials: {
                    type: 'service_account',
                    private_key: process.env.GCP_PRIVATE_KEY,
                    client_email: process.env.GCP_CLIENT_EMAIL,
                    client_id: process.env.GCP_CLIENT_ID,
                    project_id: process.env.GCP_PROJECT_ID,
                    token_uri: 'https://oauth2.googleapis.com/token',
                },
            },
        });

        const chain = promptTemplate.pipe(model).pipe(outputParser);

        const stream = await chain.stream({
            question: question,
            context: JSON.stringify(context),
        });

        return new StreamingTextResponse(stream);
    } catch (error) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
