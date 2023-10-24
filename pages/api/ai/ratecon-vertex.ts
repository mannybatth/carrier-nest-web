import { GoogleVertexAI } from 'langchain/llms/googlevertexai';
import { PromptTemplate } from 'langchain/prompts';
import { NextApiRequest, NextApiResponse } from 'next';
import { parse, format } from 'date-fns';

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

// export default async function POST(req: NextRequest) {
export default async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        // const { documentsInBlocks, documentsInLines } = await req.json();
        const { documentsInBlocks, documentsInLines } = await req.body;

        if (!Array.isArray(documentsInBlocks) || !Array.isArray(documentsInLines)) {
            throw new Error('Invalid input. Expected arrays.');
        }

        if (documentsInBlocks.length === 0 || documentsInLines.length === 0) {
            throw new Error('Invalid input. Expected arrays with at least one item.');
        }

        const blockDocuments = documentsInBlocks.map((item) => {
            return item.pageContent as string;
        });

        const lineDocuments = documentsInLines.map((item) => {
            return item.pageContent as string;
        });

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
2. Logistics Company: This isn't the carrier. Look for any clear indications of a logistics company's name.
3. Load Number: Identify as "Load", "Order", "Load #", "Order #", etc. Remove '#' from the result.
4. Stops:
    - Types: Pickup is "PU" or "shipper"; delivery is "SO", "consignee", or "receiver".
    - Details: Extract name, full address, date (MM/DD/YYYY), and time (24-hour format). If a time range is provided, use its start.
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

        const promptTemplate = new PromptTemplate({
            template,
            inputVariables: ['question', 'context'],
        });
        const prompt = await promptTemplate.format({
            question: question,
            context: JSON.stringify(blockDocuments),
        });

        const response = await runAI(prompt);

        if (response.rate) {
            response.rate = convertRateToNumber(response.rate);
        }

        if (response.stops) {
            response.stops.forEach((stop) => {
                if (stop.time) {
                    stop.time = addColonToTimeString(stop.time);
                }
            });
        }

        console.log('response', response);

        return res.status(200).json({
            code: 200,
            data: response,
        });
    } catch (error) {
        return res.status(400).json({
            code: 400,
            error: error.message,
        });
    }
};

async function runAI(prompt: string): Promise<LogisticsData> {
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
    const res = await model.call(prompt);
    try {
        return extractFirstJsonObject<LogisticsData>(res);
    } catch (error) {
        console.error(`Failed to parse JSON response: ${res}`);
        return null;
    }
}

function extractFirstJsonObject<T>(input: string): T | null {
    const startIndex = input.indexOf('{');
    let endIndex = -1;
    let openBraces = 0;

    // Start from the first open brace found
    for (let i = startIndex; i < input.length; i++) {
        if (input[i] === '{') {
            openBraces++;
        } else if (input[i] === '}') {
            openBraces--;

            // This means we found the end of the first JSON object
            if (openBraces === 0) {
                endIndex = i;
                break;
            }
        }
    }

    if (startIndex === -1 || endIndex === -1) {
        return null;
    }

    const jsonObjectStr = input.substring(startIndex, endIndex + 1);

    try {
        return JSON.parse(jsonObjectStr) as T;
    } catch (e) {
        return null;
    }
}

function convertRateToNumber(rate: string | number): number {
    if (typeof rate === 'string') {
        // Remove commas and parse the string as a float
        const amount = rate.replace(/[^0-9.]/g, '');
        return parseFloat(amount);
    }
    return rate;
}

function addColonToTimeString(time: string): string {
    // If the string already contains a colon, return it as is
    if (time.includes(':')) {
        return time;
    }

    try {
        // Parse the string into a Date object
        const parsedDate = parse(time, 'HHmm', new Date());

        // Format the Date object back into a string with the desired format
        return format(parsedDate, 'HH:mm');
    } catch (error) {
        console.log(`Failed to parse time string: ${time}`);
        return time;
    }
}
