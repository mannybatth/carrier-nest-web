import { RetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChainValues } from 'langchain/dist/schema';
import { Document } from 'langchain/document';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PromptTemplate } from 'langchain/prompts';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { NextRequest, NextResponse } from 'next/server';

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

const questions: string[] = [
    `Who is the logistics company and what is the load or order number or confirmation number? Usually the load number is labeled with "Load", "Order", "Load #", "Order #", etc. Remove hashtags from the load number.
json scheme:
{
    "logistics_company": string or null,
    "load_number": string or null,
}`,

    `Extract all stops (both pickup (PU) and delivery (SO)) from the document in the exact order they appear. Remember, a pickup is synonymous with "shipper", and delivery is equivalent to "consignee" or "receiver". For each stop, retrieve the exact name and full address (street, city, state, zip, country). If you encounter abbreviations near the address or date, consider them as potential stop names. If you are having trouble finding the stop "name", scan text near the address and date and try your best to match with a business name (could be an abbreviation). Also, for each stop, retrieve the date and time. Convert the date to the format MM/DD/YYYY and the time to the 24-hour format HH:MM. The "time" for each stop should be the starting time of the window, formatted in 24-hour format (HH:MM). If a time range is provided (e.g., "07:00 to 08:00"), use the starting time of the range.
json scheme:
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

    `Extract the financial details from the document context related to the rate or total cost of the shipment or load. The information is likely located near terms like "Total", "Rate", or "Amount". Make sure to extract the total amount with additional payments included. Search specifically for a format that might resemble "$USD 3,700.00" or any similar numerical representation. Return the exact numeric value related to the rate or payment for the load. Ensure this information is returned in the provided JSON format.
json scheme:
{
    "rate": number or null,
}`,

    `Which email(s) does the document instruct to send the invoice and supporting documents to? If multiple emails are provided, return all of them. If no emails are provided, return null.
json scheme:
{
    "invoice_emails": ["<invoice_email_1>", "<invoice_email_2>", ...] or null
}`,
];

export default async function POST(req: NextRequest) {
    try {
        const {
            documentsInBlocks,
            documentsInLines,
        }: {
            documentsInBlocks: Document[];
            documentsInLines: Document[];
        } = await req.json();
        // const list = req.body as Document[];

        if (!Array.isArray(documentsInBlocks)) {
            throw new Error('Invalid input. Expected an array.');
        }

        if (documentsInBlocks.length === 0) {
            throw new Error('Invalid input. Expected an array with at least one item.');
        }

        const blockDocuments: Document[] = documentsInBlocks.map((item) => {
            if (!isValidItem(item)) {
                throw new Error('Invalid item in the list.');
            }

            return new Document({
                pageContent: item.pageContent,
                metadata: item.metadata,
            });
        });
        const lineDocuments: Document[] = documentsInLines.map((item) => {
            if (!isValidItem(item)) {
                throw new Error('Invalid item in the list.');
            }

            return new Document({
                pageContent: item.pageContent,
                metadata: item.metadata,
            });
        });

        const responses = await runAI(blockDocuments);

        const logistics_company = responses[0]?.logistics_company || null;
        let load_number = responses[0]?.load_number || null;
        let stops = responses[1]?.stops || null;
        const rate = responses[2]?.rate || null;
        const invoice_emails = responses[3]?.invoice_emails || null;

        // If the AI fails to find the stops, try again with the line documents
        const needRetryOnStops =
            !stops ||
            stops?.length === 0 ||
            stops?.some((stop) => {
                return !stop?.name || !stop?.address?.street || !stop?.address?.city || !stop?.address?.state;
            });
        const needRetryOnLoadNumber = !load_number;

        if (needRetryOnStops || needRetryOnLoadNumber) {
            const questionsList = [];
            if (needRetryOnLoadNumber) {
                questionsList.push(questions[0]);
            }
            if (needRetryOnStops) {
                questionsList.push(questions[1]);
            }
            const responses = await runAI(lineDocuments, questionsList);

            if (needRetryOnStops && needRetryOnLoadNumber) {
                load_number = responses[0]?.load_number || null;
                stops = responses[1]?.stops || null;
            } else if (needRetryOnStops) {
                stops = responses[0]?.stops || null;
            } else if (needRetryOnLoadNumber) {
                load_number = responses[0]?.load_number || null;
            }
        }

        const result = {
            logistics_company,
            load_number,
            stops,
            rate,
            invoice_emails,
        };

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

function isValidItem(item: Document): boolean {
    if (typeof item.pageContent !== 'string') {
        return false;
    }

    if (typeof item.metadata !== 'object') {
        return false;
    }

    return true;
}

async function runAI(documents: Document[], onlyQuestions: string[] = null) {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1800,
        chunkOverlap: 500,
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
        new ChatOpenAI({
            temperature: 0,
            verbose: process.env.NODE_ENV === 'development',
            openAIApiKey: process.env.OPENAI_API_KEY,
            maxTokens: -1,
        }),
        vectordb.asRetriever(5),
        {
            prompt: prompt,
            returnSourceDocuments: false,
            verbose: process.env.NODE_ENV === 'development',
        },
    );

    const listOfQuestions = onlyQuestions || questions;
    const responses = await Promise.all(
        listOfQuestions.map((question) => {
            return parseQAChainResponse(
                qaChain.call({
                    query: question,
                }),
            );
        }),
    );
    return responses;
}
