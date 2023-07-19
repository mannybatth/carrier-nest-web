import { ChatOpenAI } from 'langchain/chat_models/openai';
import { CharacterTextSplitter } from 'langchain/text_splitter';
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

        console.log('Documents:');
        console.log(documents);

        const splitter = new CharacterTextSplitter({
            separator: '\n',
            chunkSize: 2000,
            chunkOverlap: 500,
        });

        const splitDocuments = await splitter.splitDocuments(documents);

        console.log('-----');
        console.log('Split Documents:');
        console.log(splitDocuments);
        const vectordb = await MemoryVectorStore.fromDocuments(splitDocuments, new OpenAIEmbeddings());

        const scheme = `\`\`\`json scheme

load: { // Load Details
    logistics_company: string // The name of the logistics company
    load_number: string // The load number for the load
    shipper: string // The name of the shipper/pickup location
    shipper_address: { // The address of the shipper/pickup location
        street: string // Street address of the shipper/pickup location
        city: string // City of the shipper/pickup location
        state: string // State of the shipper/pickup location
        zip: string // Zip code of the shipper/pickup location
        country: string // Country of the shipper/pickup location
    }
    pickup_date: string // The date of pickup
    pickup_time: string // The time of pickup
    consignee: string // The name of the consignee/receiver/delivery location
    consignee_address: { // The address of the consignee/receiver/delivery location
        street: string // Street address of the consignee/receiver/delivery location
        city: string // City of the consignee/receiver/delivery location
        state: string // State of the consignee/receiver/delivery location
        zip: string // Zip code of the consignee/receiver/delivery location
        country: string // Country of the consignee/receiver/delivery location
    }
    delivery_date: string // The date of delivery
    delivery_time: string // The time of delivery
    rate: number // The flat rate for the line haul or the cost of the load. Total pay for load. Only include the number, not the currency.
    invoice_email: string // Email address to submit delivery documents/POD/invoice for standard pay.
}
\`\`\``;

        const query = `
Your goal is to read the rate confirmation document given in the context and extract structured information that matches the json scheme provided. When extracting information please make sure it matches the type information exactly. Do not add any attributes that do not appear in the schema.
Output the extracted information in JSON format. Do not output anything except for the extracted information. Do not add any clarifying information. Do not add any fields that are not in the schema. If the text contains attributes that do not appear in the schema, please ignore them. All output must be in JSON format and follow the schema provided below.

${scheme}

Follow these guidelines to help you extract the information. Strictly follow the guidelines below. If you do not follow the guidelines below, you will not be able to extract the information correctly.
1. The logistics company is the creator of this document and will most of the time be located at top of the document. The logistics company name is not the carrier that booked the load and should not be located under carrier contact information.
2. load_number will most likely be found on the first page. load_number should be in front of labels "Load #", "load number", "Load", "Reference", "Order", "Pro" or "Waybill" (prioritize in that order). Its important you look for these labels when extracting the load_number. Prioritize numbers that show up in the beginning of the document. The load_number will appear more than once in the context so prioritize the number that appears the most on the document.
3. Convert all dates found in context to the format MM/DD/YYYY
4. Convert all times found in context to the format HH:MM
5. The shipper name should be next to the shipper address. The shipper name and address should be next to the pickup date and time.
6. The consignee name should be next to the consignee address. The consignee name and address should be next to the delivery date and time.
7. The invoice email where the carrier submits delivery documents once the load is completed for standard pay. The invoice email is usually found close to labels "POD", "proof of delivery", "BOL", "bill of lading", "invoice", "submit documents", "upload documents", "email invoice". The invoice email most of the time will contain the domain of the logistics company.
8. Return null for any fields that are not found in the context.

Output: `;

        const qaChain = RetrievalQAChain.fromLLM(
            new ChatOpenAI({
                temperature: 0,
                verbose: process.env.NODE_ENV === 'development',
            }),
            vectordb.asRetriever(7),
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
                        data: json,
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
