import { ChatOpenAI } from 'langchain/chat_models/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { Document } from 'langchain/document';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
    runtime: 'edge',
};

export default async function POST(req: NextRequest) {
    try {
        const list = await req.json();

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
            chunkSize: 2000,
            chunkOverlap: 300,
        });

        const splitDocuments = await splitter.splitDocuments(documents);
        const vectordb = await MemoryVectorStore.fromDocuments(splitDocuments, new OpenAIEmbeddings());

        const query = `
I have a logistics rate confirmation document with details about a specific load. The text has been extracted using OCR. I need your help to accurately parse this information and structure it in a JSON format. Please be particularly attentive to the designations "PU" and "SO". "PU" refers to the pickup location, also known as the shipper's location, and "SO" refers to the delivery location, also known as the consignee's location. Ensure not to confuse these with the carrier's address.

Here are the details you need to extract:

1. The name of the logistics company.
2. The load number for the load or shipment.
3. The exact name and full address (street, city, state, zip, country) of the "PU" (pick-up location or shipper), not the carrier's address.
4. The pick-up date and time. Please convert the date to the format MM/DD/YYYY and the time to the 24-hour format HH:MM.
5. The exact name and full address (street, city, state, zip, country) of the "SO" (delivery location or consignee), not the carrier's address.
6. The delivery date and time. Please convert the date to the format MM/DD/YYYY and the time to the 24-hour format HH:MM.
7. The flat rate for the line haul or the cost of the load. Include only the numeric value and not the currency.
8. The email address to submit delivery documents, proof of delivery (POD), or invoice for standard pay.

If any of these details cannot be found in the text, return null for that field in the JSON object.

Please structure the parsed information as follows:

{
    "logistics_company": "<logistics_company>" or null,
    "load_number": "<load_number>" or null,
    "shipper": "<shipper>" or null,
    "shipper_address": {
        "street": "<street>" or null,
        "city": "<city>" or null,
        "state": "<state>" or null,
        "zip": "<zip>" or null,
        "country": "<country>" or null
    },
    "pickup_date": "<pickup_date>" or null,
    "pickup_time": "<pickup_time>" or null,
    "consignee": "<consignee>" or null,
    "consignee_address": {
        "street": "<street>" or null,
        "city": "<city>" or null,
        "state": "<state>" or null,
        "zip": "<zip>" or null,
        "country": "<country>" or null
    },
    "delivery_date": "<delivery_date>" or null,
    "delivery_time": "<delivery_time>" or null,
    "rate": <rate> or null,
    "invoice_email": "<invoice_email>" or null
}

Ensure to maintain the structure and the order of the keys in the JSON object. Thank you.`;

        const qaChain = RetrievalQAChain.fromLLM(
            new ChatOpenAI({
                temperature: 0,
                verbose: process.env.NODE_ENV === 'development',
            }),
            vectordb.asRetriever(6),
            {
                returnSourceDocuments: false,
                verbose: process.env.NODE_ENV === 'development',
            },
        );

        const result = await qaChain.call({
            query: query,
        });

        if (typeof result.text === 'string') {
            let jsonStr = result.text?.replace(/`/g, '');

            // Remove the Output: prefix if it exists
            if (jsonStr.startsWith('Output:')) {
                jsonStr = jsonStr.slice('Output:'.length);
            }

            try {
                const json = JSON.parse(jsonStr);
                return NextResponse.json(
                    {
                        code: 200,
                        data: {
                            load: json,
                        },
                    },
                    { status: 200 },
                );
            } catch (error) {
                return NextResponse.json(
                    {
                        code: 200,
                        error: jsonStr,
                    },
                    { status: 200 },
                );
            }
        } else {
            return NextResponse.json(
                {
                    code: 200,
                    data: result.text,
                },
                { status: 200 },
            );
        }
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
