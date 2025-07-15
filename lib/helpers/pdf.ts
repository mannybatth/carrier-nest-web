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
    try {
        // First try to load without ignoring encryption
        let pdf: PDFDocument;
        try {
            pdf = await PDFDocument.load(byteArray);
        } catch (encryptionError) {
            // If it fails due to encryption, try with ignoreEncryption
            if (encryptionError.message?.includes('encrypted')) {
                pdf = await PDFDocument.load(byteArray, { ignoreEncryption: true });
            } else {
                throw encryptionError;
            }
        }

        let totalPages: number;
        try {
            totalPages = pdf.getPageCount();
        } catch (pageCountError) {
            // If getPageCount fails (e.g., due to corrupted structure), throw a descriptive error
            throw new Error('PDF document appears to be corrupted or has invalid structure');
        }

        if (totalPages <= 0) {
            throw new Error('PDF document contains no pages');
        }

        // Safely extract metadata with error handling for each field
        const metadata = {
            title: safeGetMetadata(() => pdf.getTitle()),
            author: safeGetMetadata(() => pdf.getAuthor()),
            subject: safeGetMetadata(() => pdf.getSubject()),
            creator: safeGetMetadata(() => pdf.getCreator()),
            producer: safeGetMetadata(() => pdf.getProducer()),
            creationDate: safeGetMetadata(() => pdf.getCreationDate()),
            modificationDate: safeGetMetadata(() => pdf.getModificationDate()),
        };

        return {
            totalPages,
            metadata,
        };
    } catch (error) {
        console.error('Error processing PDF:', error);
        throw new Error(`Unable to process PDF: ${error.message}`);
    }
};

// Helper function to safely extract metadata
const safeGetMetadata = (getter: () => any): any => {
    try {
        return getter();
    } catch {
        return undefined;
    }
};
