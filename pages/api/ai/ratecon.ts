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
    `Who is the logistics company and what is the load or order number or confirmation number? Usually the load number is labeled with "Load", "Order", "Load #", "Order #", etc,
json scheme:
{
    "logistics_company": string or null,
    "load_number": string or null,
}`,

    `Extract all stops (both pickup (PU) and delivery (SO)) from the document in the exact order they appear. Pickup is the same as "shipper" and delivery is the same as "consignee" or "receiver". For each stop, retrieve the exact name and full address (street, city, state, zip, country). Also for each stop, retrieve the date and time. Convert the date to the format MM/DD/YYYY and the time to the 24-hour format HH:MM. The "time" for each stop should be the starting time of the window, formatted in 24-hour format (HH:MM). If a time range is provided (e.g., "07:00 to 08:00"), use the starting time of the range.
json scheme:
{
    "stops": [
        {
            "type": "<PU>" or "<SO>",
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

    `What is the total pay for the load or shipment? It will be some dollar amount. Looks for labels similar to "total", "total cost". Include only the numeric value and not the currency.
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
        const list = await req.json();
        // const list = req.body as Document[];

        if (!Array.isArray(list)) {
            throw new Error('Invalid input. Expected an array.');
        }

        if (list.length === 0) {
            throw new Error('Invalid input. Expected an array with at least one item.');
        }

        const documents: Document[] = list.map((item) => {
            if (!isValidItem(item)) {
                throw new Error('Invalid item in the list.');
            }

            return new Document({
                pageContent: item.pageContent,
                metadata: item.metadata,
            });
        });

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

        const responses = await Promise.all(
            questions.map((question) => {
                return parseQAChainResponse(
                    qaChain.call({
                        query: question,
                    }),
                );
            }),
        );

        const result = {
            logistics_company: responses[0]?.logistics_company || null,
            load_number: responses[0]?.load_number || null,
            stops: responses[1]?.stops || null,
            rate: responses[2]?.rate || null,
            invoice_emails: responses[3]?.invoice_emails || null,
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
