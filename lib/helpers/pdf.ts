import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// NOTE: Do not import this in a serverless function. Canvas dependency from pdfjs will cause it to fail.
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
