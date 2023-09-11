import { ExpandedLoad } from '../../interfaces/models';
import * as zip from '@zip.js/zip.js';
import { createInvoicePdfBlob } from '../../components/invoices/invoicePdf';
import { LoadDocument } from '@prisma/client';
import { sanitize } from '../helpers/string';
import { PDFDocument, PDFImage } from 'pdf-lib';

const commonImageFormats = ['jpg', 'jpeg', 'gif', 'png', 'bmp', 'tiff', 'tif', 'webp', 'heif', 'heic', 'avif'];

const isValidJPEG = (arrayBuffer: ArrayBuffer) => {
    const arr = new Uint8Array(arrayBuffer.slice(0, 2));
    return arr[0] === 0xff && arr[1] === 0xd8; // SOI marker for JPEG
};

const isContentTypeImage = (contentType: string) => {
    return commonImageFormats.some((format) => contentType.includes(format));
};

const convertToJPEG = async (arrayBuffer: ArrayBuffer) => {
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);
    const img = document.createElement('img');

    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const jpegBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg');
    });

    const jpegArrayBuffer = await jpegBlob.arrayBuffer();
    return jpegArrayBuffer;
};

let heic2anyModule;
async function convertHeicToJpeg(arrayBuffer: ArrayBuffer, contentType: string) {
    if (!heic2anyModule) {
        heic2anyModule = await import('heic2any');
    }
    const heicBlob = new Blob([arrayBuffer], { type: contentType });
    const jpegBlob = await heic2anyModule.default({ blob: heicBlob, toType: 'image/jpeg', quality: 0.8 });
    const jpegArrayBuffer = await jpegBlob.arrayBuffer();
    return jpegArrayBuffer;
}

const addBlobToCombinedPdf = async (blob: Blob, combinedPDFDoc: PDFDocument) => {
    if (!combinedPDFDoc) {
        return;
    }

    const arrayBuffer = await blob.arrayBuffer();
    const contentType = blob.type;

    const pdfWidth = 612; // default width of a PDF page (8.5 x 72 points/inch)
    const margin = 36; // 0.5 inch margins on each side
    const drawableWidth = pdfWidth - 2 * margin;

    if (contentType === 'application/pdf') {
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = await combinedPDFDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
        for (const page of pages) {
            combinedPDFDoc.addPage(page);
        }
    } else if (isContentTypeImage(contentType)) {
        try {
            let image: PDFImage;
            if (contentType === 'image/jpeg') {
                image = await combinedPDFDoc.embedJpg(arrayBuffer);
            } else if (contentType === 'image/png') {
                image = await combinedPDFDoc.embedPng(arrayBuffer);
            } else if (contentType === 'image/heic' || contentType === 'image/heif') {
                const jpegArrayBuffer = await convertHeicToJpeg(arrayBuffer, contentType);
                image = await combinedPDFDoc.embedJpg(jpegArrayBuffer);
            } else {
                // Convert to JPEG
                const jpegArrayBuffer = isValidJPEG(arrayBuffer) ? arrayBuffer : await convertToJPEG(arrayBuffer);
                image = await combinedPDFDoc.embedJpg(jpegArrayBuffer);
            }

            const imageAspectRatio = image.height / image.width;
            let scaledWidth = drawableWidth;
            let scaledHeight = drawableWidth * imageAspectRatio;

            // Check if the image width with margins is less than 612
            if (image.width + 2 * margin < pdfWidth) {
                scaledWidth = image.width;
                scaledHeight = image.height;
            }

            const page = combinedPDFDoc.addPage([pdfWidth, scaledHeight + 2 * margin]);
            page.drawImage(image, { x: margin, y: margin, width: scaledWidth, height: scaledHeight });
        } catch (error) {
            console.error(`Error embedding ${contentType}:`, error);
        }
    }
};

export const downloadAllDocsForLoad = async (load: ExpandedLoad, carrierId: string) => {
    if (!load) {
        return;
    }

    const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'), {
        bufferedWrite: true,
    });

    const loadDocs: LoadDocument[] = [load.rateconDocument, ...load.loadDocuments, ...load.podDocuments].filter(
        (ld) => ld,
    );

    if (loadDocs.length === 0 && !load.invoice) {
        return;
    }

    let combinedPDFDoc: PDFDocument | null = null;
    if (loadDocs.length + (load.invoice ? 1 : 0) > 1) {
        combinedPDFDoc = await PDFDocument.create();
    }

    if (load.invoice) {
        const invoiceBlob = await createInvoicePdfBlob(carrierId, load.invoice, load.customer, load);
        await zipWriter.add(`invoice-${load.invoice.invoiceNum}.pdf`, new zip.BlobReader(invoiceBlob));

        // Add invoiceBlob to the combined PDF
        await addBlobToCombinedPdf(invoiceBlob, combinedPDFDoc);
    }

    if (loadDocs.length > 0) {
        // Parallel fetching of documents
        const fetchPromises = loadDocs.map((doc) => fetch(doc.fileUrl));
        const responses = await Promise.all(fetchPromises);
        const responseBlobs = await Promise.all(responses.map((response) => response.blob()));

        // Add fetched blobs to ZIP and the combined PDF in parallel
        const addBlobsPromises = responseBlobs.map(async (blob, index) => {
            const doc = loadDocs[index];
            await zipWriter.add(doc.fileName, new zip.BlobReader(blob));
            await addBlobToCombinedPdf(blob, combinedPDFDoc);
        });

        await Promise.all(addBlobsPromises);
    }

    const fileName = `${load.customer?.name ? `${sanitize(load.customer.name)}_` : ''}${sanitize(load.refNum)}`;

    if (combinedPDFDoc) {
        // Serialize the combinedPDFDoc and add it to the zip
        const combinedPdfBytes = await combinedPDFDoc.save();
        const combinedPdfBlob = new Blob([combinedPdfBytes], { type: 'application/pdf' });
        await zipWriter.add(`${fileName}.pdf`, new zip.BlobReader(combinedPdfBlob));
    }

    const blob = await zipWriter.close();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const downloadCombinedPDFForLoad = async (load: ExpandedLoad, carrierId: string) => {
    if (!load) {
        return;
    }

    const loadDocs: LoadDocument[] = [load.rateconDocument, ...load.loadDocuments, ...load.podDocuments].filter(
        (ld) => ld,
    );

    if (loadDocs.length === 0 && !load.invoice) {
        return;
    }

    const combinedPDFDoc = await PDFDocument.create();

    if (load.invoice) {
        const invoiceBlob = await createInvoicePdfBlob(carrierId, load.invoice, load.customer, load);

        // Add invoiceBlob to the combined PDF
        await addBlobToCombinedPdf(invoiceBlob, combinedPDFDoc);
    }

    if (loadDocs.length > 0) {
        // Parallel fetching of documents
        const fetchPromises = loadDocs.map((doc) => fetch(doc.fileUrl));
        const responses = await Promise.all(fetchPromises);
        const responseBlobs = await Promise.all(responses.map((response) => response.blob()));

        // Add fetched blobs to the combined PDF in parallel
        const addBlobsPromises = responseBlobs.map(async (blob) => {
            await addBlobToCombinedPdf(blob, combinedPDFDoc);
        });

        await Promise.all(addBlobsPromises);
    }

    const fileName = `${load.customer?.name ? `${sanitize(load.customer.name)}_` : ''}${sanitize(load.refNum)}.pdf`;

    // Serialize the combinedPDFDoc and initiate download
    const combinedPdfBytes = await combinedPDFDoc.save();
    const combinedPdfBlob = new Blob([combinedPdfBytes], { type: 'application/pdf' });

    const url = URL.createObjectURL(combinedPdfBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
};
