import { ChatOpenAI } from 'langchain/chat_models/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { Document } from 'langchain/document';
import { NextRequest, NextResponse } from 'next/server';
import { similarity } from 'ml-distance';
import { FaissStore } from 'langchain/vectorstores/faiss';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
    runtime: 'edge',
};

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
            chunkSize: 2000,
            chunkOverlap: 300,
        });

        const splitDocuments = await splitter.splitDocuments(documents);
        const vectordb = await MemoryVectorStore.fromDocuments(splitDocuments, new OpenAIEmbeddings(), {
            similarity: similarity.cosine,
        });
        // const vectordb = await FaissStore.fromDocuments(splitDocuments, new OpenAIEmbeddings());

        const query = `
Please parse the given OCR-extracted text from a rate confirmation document and structure it in a JSON format. Your focus should be on accurately identifying and categorizing the "PU" and "SO" locations, where "PU" refers to the pickup location or the shipper's location, and "SO" represents the delivery location, consignee's location, or receiver location.

A single location might act as both a "PU" (shipper) and "SO" (consignee) at different points in time within a single shipment. Such occurrences should be recognized and treated as separate stops with their respective dates, times, and types ("PU" or "SO").
You also need to accurately distinguish the base rate from the total carrier pay. The "rate" field should represent the total carrier pay and not the base rate. If there is any confusion between the two, assume the highest numeric value represents the total carrier pay.

The following details need to be extracted:

1. The name of the logistics company.
2. The load confirmation number for the load or shipment.
3. All the "PU" (pick-up locations or shippers), excluding the carrier's address. For each "PU", retrieve the exact name and full address (street, city, state, zip, country).
4. The pick-up date and time for each "PU". Convert the date to the format MM/DD/YYYY and the time to the 24-hour format HH:MM.
5. All the "SO" (delivery locations or consignees), excluding the carrier's address. For each "SO", retrieve the exact name and full address (street, city, state, zip, country).
6. The delivery date and time for each "SO". Convert the date to the format MM/DD/YYYY and the time to the 24-hour format HH:MM.
7. The total carrier pay for the load or shipment. Include only the numeric value and not the currency.
8. "invoice_emails": All email addresses where the carrier needs to send invoice, proof of delivery (POD) or other delivery documents. Return emails for "standard pay" first. Also select the ones with keywords such as "billing", "invoice", "ab", "ap", or "accounting". If none of the email addresses meet these criteria, select the ones that appear most relevant to invoicing or payment purposes. Return all such email addresses as a list.

If any of these details cannot be found in the text, return null for that field in the JSON object.

The structure of the parsed information should be as follows:

{
    "logistics_company": "<logistics_company>" or null,
    "load_number": "<load_number>" or null,
    "stops": [
        {
            "type": "<PU or SO>",
            "name": "<name>" or null,
            "address": {
                "street": "<street>" or null,
                "city": "<city>" or null,
                "state": "<state>" or null,
                "zip": "<zip>" or null,
                "country": "<country>" or null
            },
            "date": "<date>" or null,
            "time": "<time>" or null
        },
        ... (repeat this structure for each stop regardless if it appears multiple times)
    ],
    "rate": <total carrier pay> or null,
    "invoice_emails": ["<invoice_email_1>", "<invoice_email_2>", ...] or null
}

The "stops" field is an array of objects, where each object represents a stop (either a "PU" or "SO") with its respective appointment details. Maintain the sequence of the stops as they appear in the original document. The type for each stop should correspond to its role as a "PU" or "SO" at that specific point in time within the shipment sequence. Thank you.`;

        const qaChain = RetrievalQAChain.fromLLM(
            new ChatOpenAI({
                temperature: 0,
                verbose: process.env.NODE_ENV === 'development',
                openAIApiKey: process.env.OPENAI_API_KEY,
                maxTokens: -1,
            }),
            vectordb.asRetriever(5),
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
                // res.status(200).json({
                //     code: 200,
                //     data: {
                //         load: json,
                //     },
                // });
            } catch (error) {
                return NextResponse.json(
                    {
                        code: 200,
                        error: jsonStr,
                    },
                    { status: 200 },
                );
                // res.status(200).json({
                //     code: 200,
                //     error: jsonStr,
                // });
            }
        } else {
            return NextResponse.json(
                {
                    code: 200,
                    data: result.text,
                },
                { status: 200 },
            );
            // res.status(200).json({
            //     code: 200,
            //     data: result.text,
            // });
        }
    } catch (error) {
        // return NextResponse.json(
            {
                code: 400,
                error: error.message,
            },
            { status: 400 },
        );
        // res.status(400).json({
        //     code: 400,
        //     error: error.message,
        // });
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
