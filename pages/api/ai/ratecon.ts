import { ChatOpenAI } from 'langchain-edge-fix/chat_models/openai';
import { CharacterTextSplitter } from 'langchain-edge-fix/text_splitter';
import { MemoryVectorStore } from 'langchain-edge-fix/vectorstores/memory';
import { OpenAIEmbeddings } from 'langchain-edge-fix/embeddings/openai';
import { RetrievalQAChain } from 'langchain-edge-fix/chains';
import { PDFLoader } from 'langchain-edge-fix/document_loaders/fs/pdf';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
    runtime: 'edge', // for Edge API Routes only
    unstable_allowDynamic: [
        '/node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js',
        '/node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js',
    ],
};

export default async function POST(req: NextRequest) {
    // get the file from req.formData
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
        return NextResponse.json(
            {
                code: 400,
                errors: [{ message: 'No file provided' }],
            },
            { status: 400 },
        );
    }

    // load the file into a PDFLoader
    const pdfLoader = new PDFLoader(file, {
        pdfjs: () => import('./pdfjs-dist/build/pdf'),
    });
    let documents = await pdfLoader.load();
    // Split text into characters
    const splitter = new CharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    documents = await splitter.splitDocuments(documents);
    const vectordb = await MemoryVectorStore.fromDocuments(documents, new OpenAIEmbeddings());
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
        const json = JSON.parse(jsonStr);

        return NextResponse.json(
            {
                code: 200,
                data: json,
            },
            { status: 200 },
        );
    } else {
        return NextResponse.json(
            {
                code: 200,
                data: result.text,
            },
            { status: 200 },
        );
    }
}
