import { GoogleVertexAI } from 'langchain/llms/googlevertexai';
import { PromptTemplate } from 'langchain/prompts';
import { NextApiRequest, NextApiResponse } from 'next';

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
            "date": string or null,
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

const expectedProperties = new Set([
    'logistics_company',
    'load_number',
    'stops',
    'name',
    'street',
    'city',
    'state',
    'zip',
    'date',
    'time',
    'po_numbers',
    'pickup_numbers',
    'reference_numbers',
    'rate',
    'invoice_emails',
]);

function updateProgress(foundProperties: Set<string>) {
    return foundProperties.size / (expectedProperties.size + 1);
}

// This function has been simplified to only check for the presence of a key
function checkForProperties(chunk: string, foundProperties: Set<string>) {
    expectedProperties.forEach((property) => {
        if (chunk.includes(`"${property}"`) && !foundProperties.has(property)) {
            foundProperties.add(property);
        }
    });

    return updateProgress(foundProperties);
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Transfer-Encoding': 'chunked',
    });

    try {
        const { documents } = await req.body;

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
        const prompt = await promptTemplate.format({
            question: question,
            context: JSON.stringify(context),
        });

        await runAI(prompt, res);
    } catch (error) {
        res.write(`${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
};

async function runAI(prompt: string, res: NextApiResponse): Promise<LogisticsData | null> {
    const foundProperties = new Set<string>();
    let progress = 0;
    const allChunks = [];

    const model = new GoogleVertexAI({
        model: 'text-bison-32k',
        maxOutputTokens: 1024,
        temperature: 0.1,
        verbose: process.env.NODE_ENV === 'development',
        authOptions: {
            projectId: process.env.GCP_PROJECT_ID,
            credentials: {
                type: 'service_account',
                private_key: process.env.GCP_PRIVATE_KEY,
                client_email: process.env.GCP_CLIENT_EMAIL,
                client_id: process.env.GCP_CLIENT_ID,
            },
        },
    });

    const stream = await model.stream(prompt);

    for await (const chunk of stream) {
        if (chunk) {
            progress = checkForProperties(chunk, foundProperties);
            allChunks.push(chunk);
            // Stream back the progress
            res.write(`${JSON.stringify({ progress: progress * 100 })}\n\n`);
        } else {
            // When no more chunks are coming in, progress is complete
            progress = 1;
            // Concatenate all the chunks into the final result
            const finalResult = allChunks.join('');
            // Parse the final result to return as JSON, assuming finalResult is JSON string
            const jsonResponse = JSON.parse(finalResult);
            res.write(`${JSON.stringify({ progress: 100, data: jsonResponse })}\n\n`);
            res.end();
            return jsonResponse;
        }
    }

    return null;
}