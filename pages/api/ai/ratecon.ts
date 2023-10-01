import { RetrievalQAChain } from 'langchain/chains';
import { OpenAI } from 'langchain/llms/openai';
import { ChainValues } from 'langchain/dist/schema';
import { Document } from 'langchain/document';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PromptTemplate } from 'langchain/prompts';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { NextRequest, NextResponse } from 'next/server';

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

export const config = {
    runtime: 'edge',
};

// Parses the JSON response from a single QA chain call
async function parseQAChainResponse(chainCall: Promise<ChainValues>) {
    const response = await chainCall;
    const responseText = response.text;
    try {
        // Parse the entire response text to a JSON object
        const parsedResponse = JSON.parse(responseText);
        // Return the parsed JSON object
        return parsedResponse;
    } catch (error) {
        console.error(`Failed to parse JSON response: ${responseText}`);
        return null;
    }
}

const blockBasedQuestions: string[] = [
    `Who is the logistics company and what is the load or order number or confirmation number? Usually the load number is labeled with "Load", "Order", "Load #", "Order #", etc. Remove hashtags from the load number. Handle OCR inconsistencies and adapt to document nuances. The label might be found after the load/order number so try your best to find the correct load number.
JSON scheme:
{
    "logistics_company": string or null,
    "load_number": string or null,
}`,

    `Extract all stops (both pickup (PU) and delivery (SO)) from the document in the exact order they appear. Remember, a pickup is synonymous with "shipper", and delivery is equivalent to "consignee" or "receiver". For each stop, retrieve the exact name and full address (street, city, state, zip, country). If you encounter abbreviations near the address or date, consider them as potential stop names. If you are having trouble finding the stop "name", scan text near the address and date and try your best to match with a business name (could be an abbreviation). Also, for each stop, retrieve the date and time. Convert the date to the format MM/DD/YYYY and the time to the 24-hour format HH:MM. The "time" for each stop should be the starting time of the window, formatted in 24-hour format (HH:MM). If a time range is provided (e.g., "07:00 to 08:00"), use the starting time of the range.
JSON scheme:
{
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
}`,

    `From the document, extract financial details pertinent to the rate of the shipment or load. Specifically, hone in on the total rate or payment, which could be proximate to terms like "Total", "Rate", "Amount", and "Total Carrier Payment". Be sure to secure the cumulative total, inclusive of all supplementary fees. Seek formats resembling "$USD 3,700.00" or similar numeric configurations. Return only the precise monetary figure associated with the rate or payment for the shipment. Do not include the currency symbol or any other text. If no rate or payment is provided, return null.
JSON Schema:
{
    "rate": "numerical value or null"
}`,

    `Which email(s) does the document instruct to send the invoice and supporting documents to? If multiple emails are provided, return all of them. If no emails are provided, return null.
JSON scheme:
{
    "invoice_emails": ["<invoice_email_1>", "<invoice_email_2>", ...] or null
}`,
];

const generateLineBasedQuestions = (stopsCount: number) => {
    const questions = [];

    //     questions.push(`I'm the driver tasked with this delivery. In our rate confirmation, I've observed that each stop may have a PO number associated with it. These numbers are crucial for my documentation. Could you extract these for me? Note that a genuine PO number is typically a sequence of digits, and please ensure you're not capturing other order or reference numbers or placeholders like "N/A" as PO numbers. I expect the output to look something like this:
    // {
    //     "po_numbers": {
    //         "stop1": "PO number 1, PO number 2, ...",
    //         "stop2": "PO number 1, PO number 2, ...",
    //         ...
    //     }
    // }
    // Kindly be meticulous in ensuring you only capture the correct PO numbers and handle any line breaks or spacing seamlessly.
    // There will be ${stopsCount} stops in this context document.`);

    //     questions.push(`Hello! I'm gearing up for the pickups and want to ensure everything goes smoothly. To do that, I'll need the pickup numbers for each location from our rate confirmation. When extracting, please avoid including any placeholders like "N/A". Can you provide those numbers in this structure?
    // {
    //     "pickup_numbers": {
    //         "stop1": "Pickup number 1, Pickup number 2, ...",
    //         "stop2": "Pickup number 1, Pickup number 2, ...",
    //         ...
    //     }
    // }
    // Please ensure you capture only the genuine pickup numbers and exclude any non-relevant data or placeholders.
    // There will be ${stopsCount} stops in this context document.`);

    //     questions.push(`I'm analyzing a transportation rate confirmation document that contains details for various stops. Each stop has associated reference numbers. I need you to extract and organize these reference numbers for each stop if they exist. Please adhere to the following guidelines:
    // - Capture only genuine reference numbers explicitly mentioned with each stop or location. Reference numbers can be of varying lengths but are typically alphanumeric strings.
    // - Avoid capturing generic numbers, codes, or identifiers that are not explicitly mentioned as reference numbers.
    // - Only extract reference numbers that are explicitly labeled as reference numbers with a label such as "Reference Number", "Ref #", "Ref No", "Ref Num", "Ref", "Reference", "Reference #".
    // - For each stop, list the reference numbers as comma-separated values.

    // Return the output in JSON format as follows:
    // {
    //     "reference_numbers": {
    //         "stop1": "Reference number 1, Reference number 2, ...",
    //         "stop2": "Reference number 1, Reference number 2, ...",
    //         ...
    //     }
    // }

    // Stops or locations might be indicated by terms such as "SHIPPER", "RECEIVER", or any other similar terms.x
    // There will be ${stopsCount} stops in this context document.`);

    questions.push(`Using OCR data from a rate confirmation document:

1. PO Numbers:
- Capture sequences of digits immediately after labels such as "PO", "PO Number", "PO #", "PO No", "PO Num", and its immediate variants.
- If multiple number sequences are detected following the label, prioritize the one closest to the label.
- Exclude any sequences associated with terms like "Ref", "Reference", "Pickup", "Phone", "Tel", "Telephone", "Mobile", "Contact", "Truck", "TRK", and formats similar to phone numbers (e.g., (XXX) XXX-XXXX).
- If a stop lacks a clear PO Number label or sequence, consider it as null. If no appropriate label is found, consider it as null.
- Ignore any sequences or number that is a pickup number or phone number.

2. Pickup Numbers:
- Extract sequences of digits specifically linked to labels such as "Pickup", "Pickup Number", "Pickup #", "PU Number", "PU #", "PU Num", "PU".
- If no numbers are associated with pickup details, set the value to null.

3. Reference Numbers:
- Identify and capture sequences of alphanumeric characters after labels such as "Reference", "Reference Number", "Ref Numbers", "Ref #", "Ref No", "Ref Num". At least one number should be present in the sequence.
- For each detected reference, if multiple sequences are detected, consolidate them into a comma-separated series and include the labels inside the series.
- Ensure that sequences detected for a single stop are grouped appropriately.
- Ignore any sequences or number that is a po number, PU number, pickup number, or phone number.

Considering the document has ${stopsCount} stops, format the output in JSON as:
{
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
        "stop1": "Reference series or null",
        "stop2": "Reference series or null",
        ...
    }
}

Ensure high precision and accuracy in OCR data extraction, accounting for any inconsistencies and variations in the document structure.`);

    return questions;
};

export default async function POST(req: NextRequest) {
    try {
        const { documentsInBlocks, documentsInLines } = await req.json();

        if (!Array.isArray(documentsInBlocks) || !Array.isArray(documentsInLines)) {
            throw new Error('Invalid input. Expected arrays.');
        }

        if (documentsInBlocks.length === 0 || documentsInLines.length === 0) {
            throw new Error('Invalid input. Expected arrays with at least one item.');
        }

        const blockDocuments = documentsInBlocks.map((item) => {
            if (!isValidItem(item)) {
                throw new Error('Invalid item in the list.');
            }
            return new Document({
                pageContent: item.pageContent,
                metadata: item.metadata,
            });
        });

        const lineDocuments = documentsInLines.map((item) => {
            if (!isValidItem(item)) {
                throw new Error('Invalid item in the list.');
            }
            return new Document({
                pageContent: item.pageContent,
                metadata: item.metadata,
            });
        });

        let blockBasedResponses = await runAI(blockDocuments, blockBasedQuestions);

        // Use the executeRetryLogic function to potentially improve the extraction results for block-based questions
        blockBasedResponses = await executeRetryLogic(blockBasedResponses, lineDocuments);

        const stopsCount = blockBasedResponses[1]?.stops?.length;
        const dynamicLineBasedQuestions = generateLineBasedQuestions(stopsCount);
        const lineBasedResponses = await runAI(lineDocuments, dynamicLineBasedQuestions, {
            chunkSize: 4000,
            chunkOverlap: 700,
            numberOfChunks: 3,
            maxTokens: 750,
        });

        const load_number = blockBasedResponses[0]?.load_number || null;
        const po_numbers = lineBasedResponses[0]?.po_numbers || [];
        const pickup_numbers = lineBasedResponses[0]?.pickup_numbers || [];
        const reference_numbers = lineBasedResponses[0]?.reference_numbers || [];

        const result: LogisticsData = {
            logistics_company: blockBasedResponses[0]?.logistics_company,
            load_number,
            stops: blockBasedResponses[1]?.stops,
            rate: convertRateToNumber(blockBasedResponses[2]?.rate),
            invoice_emails: blockBasedResponses[3]?.invoice_emails,
            po_numbers: po_numbers,
            pickup_numbers: pickup_numbers,
            reference_numbers,
        };

        removeMatchingValues(result);

        return NextResponse.json(
            {
                code: 200,
                data: result,
            },
            { status: 200 },
        );
    } catch (error) {
        return NextResponse.json(
            {
                code: 400,
                error: error.message,
            },
            { status: 400 },
        );
    }
}

async function executeRetryLogic(initialResponses: any[], lineDocuments: Document[]): Promise<any[]> {
    const retryIndices: number[] = [];
    const retryQuestions: string[] = [];

    // Check if we need to retry for the logistics company and load number
    if (!initialResponses[0]?.logistics_company || !initialResponses[0]?.load_number) {
        retryIndices.push(0);
        retryQuestions.push(blockBasedQuestions[0]);
    }

    // Check if we need to retry for the stops
    const stops = initialResponses[1]?.stops || [];
    const needRetryOnStops =
        stops.length === 0 ||
        stops.some((stop) => !stop?.name || !stop?.address?.street || !stop?.address?.city || !stop?.address?.state);
    if (needRetryOnStops) {
        retryIndices.push(1);
        retryQuestions.push(blockBasedQuestions[1]);
    }

    if (retryQuestions.length === 0) {
        return initialResponses; // No need to retry
    }

    const retryResponses = await runAI(lineDocuments, retryQuestions);

    for (let i = 0; i < retryIndices.length; i++) {
        initialResponses[retryIndices[i]] = retryResponses[i];
    }

    return initialResponses;
}

function isValidItem(item: Document): boolean {
    if (typeof item.pageContent !== 'string') {
        return false;
    }

    if (typeof item.metadata !== 'object') {
        return false;
    }

    return true;
}

function convertRateToNumber(rate: string | number): number {
    if (typeof rate === 'string') {
        // Remove commas and parse the string as a float
        const amount = rate.replace(/[^0-9.]/g, '');
        return parseFloat(amount);
    }
    return rate;
}

function removeMatchingValues(data: LogisticsData) {
    const { stops } = data;

    // Extract street numbers and names from the stops
    const streetNumbers = stops
        .map((stop) => (stop.address.street ? stop.address.street.split(' ')[0] : null))
        .filter(Boolean) as string[];
    const stopNames = stops.map((stop) => stop.name);

    // Function to check if a value matches street number, or stop name
    const isMatchingValue = (value: string | null): boolean => {
        if (!value) return false; // If it's already null, no need to check further
        return streetNumbers.includes(value) || stopNames.includes(value);
    };

    // Check and set to null if match found
    for (const key in data.po_numbers) {
        if (isMatchingValue(data.po_numbers[key])) {
            data.po_numbers[key] = null;
        }
    }

    for (const key in data.pickup_numbers) {
        if (isMatchingValue(data.pickup_numbers[key])) {
            data.pickup_numbers[key] = null;
        }
    }

    for (const key in data.reference_numbers) {
        if (isMatchingValue(data.reference_numbers[key])) {
            data.reference_numbers[key] = null;
        }
    }
}

async function runAI(
    documents: Document[],
    questionsToRun: string[],
    config: { chunkSize: number; chunkOverlap: number; numberOfChunks: number; maxTokens: number } = {
        chunkSize: 2000,
        chunkOverlap: 500,
        numberOfChunks: 6,
        maxTokens: -1,
    },
) {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap,
    });

    const splitDocuments = await splitter.splitDocuments(documents);
    const vectordb = await MemoryVectorStore.fromDocuments(splitDocuments, new OpenAIEmbeddings());

    const template = `Your job is to extract data from the given document context and return it in a JSON format. The document will always be a rate confirmation for a load. Return all answers in the JSON scheme that is provided in the question. Your answer should match the JSON scheme exactly.
We only want to search the context for details about the load so ignore any text related to terms and conditions or other legal text.

{context}

Human: {question}
Assistant:
`;

    const prompt = new PromptTemplate({
        template,
        inputVariables: ['question', 'context'],
    });

    const qaChain = RetrievalQAChain.fromLLM(
        new OpenAI({
            modelName: 'gpt-3.5-turbo-instruct',
            temperature: 0,
            verbose: process.env.NODE_ENV === 'development',
            openAIApiKey: process.env.OPENAI_API_KEY,
            maxTokens: config.maxTokens,
        }),
        vectordb.asRetriever(config.numberOfChunks),
        {
            prompt: prompt,
            returnSourceDocuments: false,
            verbose: process.env.NODE_ENV === 'development',
        },
    );

    const responses = await Promise.all(
        questionsToRun.map((question) => {
            return parseQAChainResponse(
                qaChain.call({
                    query: question,
                }),
            );
        }),
    );
    return responses;
}
