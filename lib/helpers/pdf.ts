// import * as pdfjsLib from 'pdfjs-dist/build/pdf';
// import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';

// pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const calcPdfPageCount = async (
    byteArray: Uint8Array,
): Promise<{
    totalPages: number;
    metadata: any;
}> => {
    // const pdf = await pdfjsLib.getDocument({
    //     data: byteArray,
    //     useWorkerFetch: false,
    //     isEvalSupported: false,
    //     useSystemFonts: true,
    // }).promise;

    // return {
    //     totalPages: pdf.numPages,
    //     metadata: await pdf.getMetadata(),
    // };
    return {
        totalPages: 1,
        metadata: {},
    };
};
