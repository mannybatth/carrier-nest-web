import { PDFDocument } from 'pdf-lib';

export const calcPdfPageCount = async (
    byteArray: Uint8Array,
): Promise<{
    totalPages: number;
    metadata: {
        title?: string;
        author?: string;
        subject?: string;
        creator?: string;
        producer?: string;
        creationDate?: Date;
        modificationDate?: Date;
    };
}> => {
    const pdf = await PDFDocument.load(byteArray);
    const totalPages = pdf.getPageCount();

    // pdf-lib does not support all the metadata fields pdfjs-dist supports.
    // Here we are only fetching what's available.
    const metadata = {
        title: pdf.getTitle(),
        author: pdf.getAuthor(),
        subject: pdf.getSubject(),
        creator: pdf.getCreator(),
        producer: pdf.getProducer(),
        creationDate: pdf.getCreationDate(),
        modificationDate: pdf.getModificationDate(),
    };

    return {
        totalPages,
        metadata,
    };
};
