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

        const documents: Document[] = list.map((item) => {
            if (!isValidItem(item)) {
                throw new Error('Invalid item in the list.');
            }

            return new Document({
                pageContent: item.pageContent,
                metadata: item.metadata,
            });
        });

        const splitter = new CharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const splitDocuments = await splitter.splitDocuments(documents);
        const vectordb = await MemoryVectorStore.fromDocuments(splitDocuments, new OpenAIEmbeddings());

        const qaChain = RetrievalQAChain.fromLLM(new ChatOpenAI(), vectordb.asRetriever(7), {
            returnSourceDocuments: false,
        });

        const prompt = `For the given text of a Carrier Rate and Load Confirmation pdf, provide a JSON representation of the document. All values should be present in the document, do not make any assumptions about the values.
The JSON representation should include the following fields:
- "logistics_company": The name of the logistics company
- "load_number": The load/reference number for the shipment
- "shipper": The name of the shipper
- "shipper_address": The address of the shipper. Return a object with the following fields: "street", "city", "state", "zip", "country"
- "pickup_date": The date of pickup
- "pickup_time": The time of pickup. Give time in 24 hour format
- "consignee": The name of the consignee
- "consignee_address": The address of the consignee. Return a object with the following fields: "street", "city", "state", "zip", "country"
- "delivery_date": The date of delivery
- "delivery_time": The time of delivery. Give time in 24 hour format
- "rate": The rate for the shipment. Only include the number, not the currency
- "invoice_email": The email address where to send proof of delivery (POD/BOL) and invoice after delivery. If there is no email address, return "null"
`;

        const result = await qaChain.call({
            query: prompt,
        });

        if (typeof result.text === 'string') {
            const jsonStr = result.text?.replace(/`/g, '');

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
