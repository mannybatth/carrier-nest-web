import { RetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { Document } from 'langchain/document';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { similarity } from 'ml-distance';
// import { NextRequest, NextResponse } from 'next/server';
import { PromptTemplate } from 'langchain/prompts';
import { ChainValues } from 'langchain/dist/schema';
import { NextApiRequest, NextApiResponse } from 'next';
import { FaissStore } from 'langchain/vectorstores/faiss';
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf';
import { HNSWLib } from 'langchain/vectorstores/hnswlib';

// export const config = {
//     runtime: 'edge',
// };

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
    `Who is the logistics company and what is the load number? The load number is a unique identifier for the load or shipment that is assigned by the logistics company. Make your best guess if you cannot find the exact answer.
json scheme:
{
    "logistics_company": string or null,
    "load_number": string or null,
}`,

    `Extract all pickup (PU) stops from the document. Pickup is the same as "shipper". Return the stops in the order they appear in the document. For each stop, retrieve the exact name and full address (street, city, state, zip, country). Also for each stop, retrieve date and time. Convert the date to the format MM/DD/YYYY and the time to the 24-hour format HH:MM. The "time" for each stop should be the starting time of the pickup window, formatted in 24-hour format (HH:MM). If a time range is provided (e.g., "07:00 to 08:00"), use the starting time of the range.
Do not return any stops that are not pickup stops. For example, if a stop is a delivery stop (SO), do not return it.
json scheme:
{
    "pickup_stops": [
        {
            "type": "<PU>",
            "name": string or null,
            "address": {
                "street": string or null,
                "city": string or null,
                "state": string or null,
                "zip": number or null,
                "country": string or null
            },
            "date": string or null,
            "time": string or null
        },
        ... (repeat this structure for each stop regardless if it appears multiple times)
    ],
}`,

    `Extract all delivery (SO) stops from the document. Delivery is the same as "consignee" and "receiver". Return the stops in the order they appear in the document. For each stop, retrieve the exact name and full address (street, city, state, zip, country). Also for each stop, retrieve date and time. Convert the date to the format MM/DD/YYYY and the time to the 24-hour format HH:MM. The "time" for each stop should be the starting time of the delivery window, formatted in 24-hour format (HH:MM). If a time range is provided (e.g., "07:00 to 08:00"), use the starting time of the range.
Do not return any stops that are not delivery stops. For example, if a stop is a pickup stop (PU), do not return it.
json scheme:
{
    "delivery_stops": [
        {
            "type": "<SO>",
            "name": string or null,
            "address": {
                "street": string or null,
                "city": string or null,
                "state": string or null,
                "zip": number or null,
                "country": string or null
            },
            "date": string or null,
            "time": string or null
        },
        ... (repeat this structure for each stop regardless if it appears multiple times)
    ],
}`,

    `What is the total carrier pay for the load or shipment? Include only the numeric value and not the currency.
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

// export default async function POST(req: NextRequest) {.
export default async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        // const list = await req.json();
        const list = req.body as Document[];

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

        // const modelName = 'sentence-transformers/all-MiniLM-L6-v2';
        // const hfEmbeddings = new HuggingFaceInferenceEmbeddings({
        //     model: modelName,
        //     apiKey: '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',
        // });

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1800,
            chunkOverlap: 500,
        });

        const splitDocuments = await splitter.splitDocuments(documents);
        const vectordb = await MemoryVectorStore.fromDocuments(splitDocuments, new OpenAIEmbeddings());
        // const vectordb = await FaissStore.fromDocuments(splitDocuments, hfEmbeddings);
        // const vectordb = await HNSWLib.fromDocuments(splitDocuments, new OpenAIEmbeddings());

        const template = `Your job is to extract data from the given document context and return it in a JSON format. The document will always be a rate confirmation for a load that the carrier signs to accept the rate. Return all answers in the JSON scheme that is provided in the question. Your answer should match the JSON scheme exactly. If you cannot find an answer, return null for that field in the JSON object.

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
            vectordb.asRetriever(4),
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
            pickup_stops: responses[1]?.pickup_stops || null,
            delivery_stops: responses[2]?.delivery_stops || null,
            rate: responses[3]?.rate || null,
            invoice_emails: responses[4]?.invoice_emails || null,
        };

        console.log(result);

        // return NextResponse.json(
        //     {
        //         code: 200,
        //         data: result,
        //     },
        //     { status: 200 },
        // );
        res.status(200).json({
            code: 200,
            data: result,
        });
    } catch (error) {
        // return NextResponse.json(
        //     {
        //         code: 400,
        //         error: error.message,
        //     },
        //     { status: 400 },
        // );
        res.status(400).json({
            code: 400,
            error: error.message,
        });
    }
};

function isValidItem(item: Document): boolean {
    if (typeof item.pageContent !== 'string') {
        return false;
    }

    if (typeof item.metadata !== 'object') {
        return false;
    }

    return true;
}
