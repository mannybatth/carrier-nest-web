import * as pdfjs from 'pdfjs-dist';
import type { Metadata } from 'pdfjs-dist/types/src/display/metadata';

// Use the worker from 'pdfjs-dist/lib/pdf.worker' if you're using ES5 module system.
pdfjs.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker');

export const calcPdfPageCount = async (
    byteArray: Uint8Array,
): Promise<{
    totalPages: number;
    metadata: {
        info: unknown;
        metadata: Metadata;
    };
    images: string[];
}> => {
    const pdfDocument = await pdfjs.getDocument({ data: byteArray }).promise;
    const totalPages = pdfDocument.numPages;
    const metadata = await pdfDocument.getMetadata();
    const allImages: string[] = [];

    // Define a higher scale for better quality (e.g., 2 for double resolution).
    const scale = 2;

    for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDocument.getPage(i);
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        const canvasContext = canvas.getContext('2d');

        // Adjust canvas size based on scale for higher quality.
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext, viewport }).promise;

        // Extract a high-quality image as a data URL.
        const image = canvas.toDataURL('image/png', 1.0); // 1.0 for max quality
        allImages.push(image);
    }

    return {
        totalPages,
        metadata,
        images: allImages,
    };
};
