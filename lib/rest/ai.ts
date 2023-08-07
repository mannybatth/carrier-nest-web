import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { Document } from 'langchain/document';
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';
import { apiUrl } from '../../constants';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface AILoad {
    logistics_company: string;
    load_number: string;
    stops: AIStop[];
    rate: string;
    invoice_emails: string[];
}

export interface AIStop {
    type: 'PU' | 'SO';
    name: string;
    address: AIAddress;
    date: string;
    time: string;
}

export interface AIAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export const calcPdfPageCount = async (
    byteArray: Uint8Array,
): Promise<{
    totalPages: number;
    metadata: pdfjsLib.Metadata;
}> => {
    const pdf = await pdfjsLib.getDocument({
        data: byteArray,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
    }).promise;

    return {
        totalPages: pdf.numPages,
        metadata: await pdf.getMetadata(),
    };
};

export const parsePdf = async (byteArray: Uint8Array, file: File): Promise<AILoad> => {
    const pdf = await pdfjsLib.getDocument({
        data: byteArray,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
    }).promise;
    const meta = await pdf.getMetadata().catch(() => null);

    // Max 10 pages allowed
    if (pdf.numPages > 10) {
        throw new Error('Maximum 10 pages allowed.');
    }

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

    // Validate the documents
    documents.forEach((doc) => {
        if (!doc.pageContent) {
            throw new Error('Invalid input. Expected pageContent to be a string.');
        }
        if (!doc.metadata) {
            throw new Error('Invalid input. Expected metadata to be an object.');
        }

        // Check for escape sequences in the content
        if (/%u[0-9A-F]{4}|\\./i.test(doc.pageContent)) {
            throw new Error('Invalid input. Expected pageContent to be a string.');
        }
    });

    const response = await fetch(apiUrl + '/ai/ratecon', {
        method: 'POST',
        body: JSON.stringify(documents),
    });

    const { code, data }: { code: number; data: { load: AILoad } } = await response.json();

    if (code !== 200) {
        throw new Error('Failed to parse the document.');
    }

    // normalize date and time
    data.load.stops.forEach((stop) => {
        stop.date = normalizeDateStr(stop.date);
        stop.time = normalizeTimeStr(stop.time);
    });

    return data?.load;
};

const normalizeDateStr = (dateStr: string): string => {
    if (!dateStr) {
        return dateStr;
    }

    // If dateStr is in the format "mm/dd", add the current year
    if (dateStr.match(/^\d{2}\/\d{2}$/)) {
        const date = new Date();
        const year = date.getFullYear();
        return `${dateStr}/${year}`;
    }

    return dateStr;
};

const normalizeTimeStr = (timeStr: string): string => {
    if (!timeStr) {
        return timeStr;
    }

    // If timeStr is in the format "hhmm", add a colon
    if (timeStr.match(/^\d{4}$/)) {
        return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
    }

    // If timeStr is in the format "hhmmss", change to "hh:mm"
    if (timeStr.match(/^\d{6}$/)) {
        return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`;
    }

    // If timeStr is in the format "hh:mm:ss", change to "hh:mm"
    if (timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) {
        return timeStr.slice(0, 5);
    }

    // If timeStr is in the format "h:mm", change to "hh:mm"
    if (timeStr.match(/^\d{1}:\d{2}$/)) {
        return `0${timeStr}`;
    }

    // If timeStr is in the format "hh", change to "hh:00"
    if (timeStr.match(/^\d{2}$/)) {
        return `${timeStr}:00`;
    }

    return timeStr;
};
