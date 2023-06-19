import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { Document } from 'langchain/document';
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';
import { apiUrl } from '../../constants';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface AILoad {
    logistics_company: string;
    load_number: string;
    shipper: string;
    shipper_address: AIAddress;
    pickup_date: string;
    pickup_time: string;
    consignee: string;
    consignee_address: AIAddress;
    delivery_date: string;
    delivery_time: string;
    rate: string;
    invoice_email: string;
}

export interface AIAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export const parsePdf = async (byteArray: Uint8Array, file: File): Promise<AILoad> => {
    const pdf = await pdfjsLib.getDocument({
        data: byteArray,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
    }).promise;
    const meta = await pdf.getMetadata().catch(() => null);

    const documents: Document[] = [];

    for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        if (content.items.length === 0) {
            continue;
        }

        const text = content.items.map((item) => (item as any).str).join('\n');

        documents.push(
            new Document({
                pageContent: text,
                metadata: {
                    source: 'blob',
                    blobType: file.type,
                    pdf: {
                        info: meta?.info,
                        metadata: meta?.metadata,
                        totalPages: pdf.numPages,
                    },
                    loc: {
                        pageNumber: i,
                    },
                },
            }),
        );
    }

    const response = await fetch(apiUrl + '/ai/ratecon', {
        method: 'POST',
        body: JSON.stringify(documents),
    });

    const { code, data }: { code: number; data: { load: AILoad } } = await response.json();
    return data.load;
};
