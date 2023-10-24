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
    }[];
    rate: number;
    invoice_emails: string[];
    po_numbers: { [key: string]: string | null };
    pickup_numbers: { [key: string]: string | null };
    reference_numbers: { [key: string]: string | null };
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
        const question = `Objective: Extract specific sequences from a rate confirmation document using OCR.

For each stop in the given document, present the extracted data in the structured JSON format below:
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
            "time": string or null
        },
        ... (repeat this structure for each stop regardless if it appears multiple times)
    ],
    "rate": number or null,
    "invoice_emails": ["<invoice_email_1>", "<invoice_email_2>", ...] or null
    "po_numbers": {
        "stop1": "PO number or null",
        "stop2": "PO number or null",
        ...
    },
    "pickup_numbers": {
        "stop1": "Pickup number or null",
        "stop2": "Pickup number or null",
        ...
    },
    "reference_numbers": {
        "stop1": "Single or multiple reference numbers with their labels or null",
        "stop2": "Single or multiple reference numbers with their labels or null",
        ...
    }
}

Guidelines:

1. OCR Handling: Accommodate OCR errors by emphasizing context during extraction.

2. Who is the logistics company and what is the load or order number or confirmation number? Usually the load number is labeled with "Load", "Order", "Load #", "Order #", etc. Remove hashtags from the load number.

3. Extract all stops (both pickup (PU) and delivery (SO)) from the document in the exact order they appear. Remember, a pickup is synonymous with "shipper", and delivery is equivalent to "consignee" or "receiver". For each stop, retrieve the exact name and full address (street, city, state, zip, country). If you encounter abbreviations near the address or date, consider them as potential stop names. If you are having trouble finding the stop "name", scan text near the address and date and try your best to match with a business name (could be an abbreviation). Also, for each stop, retrieve the date and time. Convert the date to the format MM/DD/YYYY and the time to the 24-hour format HH:MM. The "time" for each stop should be the starting time of the window, formatted in 24-hour format (HH:MM). If a time range is provided (e.g., "07:00 to 08:00"), use the starting time of the range.

4. Extract the financial details from the document context related to the rate or total cost of the shipment or load. The information is likely located near terms like "Total", "Rate", or "Amount". Make sure to extract the total amount with additional payments included. Search specifically for a format that might resemble "$USD 3,700.00" or any similar numerical representation. Return the exact numeric value related to the rate or payment for the load. Ensure this information is returned in the provided JSON format.

5. Which email(s) does the document instruct to send the invoice and supporting documents to? If multiple emails are provided, return all of them. If no emails are provided, return null.

6. PO Numbers:
    - Primary Extraction: Locate and extract numbers immediately succeeding labels such as "PO", "PO Number", or "PO #".
    - Exclusion Criteria:
        - Disregard numbers far removed from their labels.
        - Exclude sequences near or linked with terms like "Ref Numbers:", "BOL#", "ORDER:", or "Pro".
    - Fallback: If an extraction is uncertain, default to 'null'.

7. Pickup Numbers:
    - Primary Search: Target numbers after labels like "Pickup", "Delivery", "PU", "Pickup #", "PU #", "Delivery #", "PU/Del #", or "PU/Del".
    - Secondary Search: If primary labels yield no results, look for numbers adjacent to "Pro".
    - Cautions:
        - Favor numbers closely tied to their labels.
        - Avoid capturing sequences near "Load Number", "Order Number", "Ref", "Reference", or resembling phone formats.
    - Default Action: If ambiguous, set as 'null'.

8. Reference Numbers:
    - Initiation: Capture sequences only if they follow labels like "Reference", "Ref Numbers", or "Shipper ID". Bypass addresses or sequences not initiated by these labels.
    - Extraction Details: On label detection, extract characters, numbers, colons, and commas until a clear separation (e.g., newline or unrelated label) is met.
    - Aggregation: For multiple references at a stop, concatenate them using commas. Commas shouldn't denote line breaks.
    - Continuation: Be aware that reference numbers might span onto subsequent pages.
    - Filter Out: Sidestep sequences hinting at address details or patterns like "PO", "PU", "pickup", or typical phone numbers. Particularly, avoid labels like "Phone", "Tel", or "Contact".

Precision Strategy: Prioritize context and positioning. In ambiguous cases, default to 'null'.`;

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
