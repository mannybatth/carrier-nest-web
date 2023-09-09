import { ExpandedLoad } from '../../interfaces/models';
import * as zip from '@zip.js/zip.js';
import { createInvoicePdfBlob } from '../../components/invoices/invoicePdf';
import { LoadDocument } from '@prisma/client';
import { sanitize } from '../helpers/string';
import { PDFDocument, PDFImage } from 'pdf-lib';

export const downloadAllDocsForLoad = async (load: ExpandedLoad, carrierId: string) => {
    if (!load) {
        return;
    }

    const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'), {
        bufferedWrite: true,
    });

    const loadDocs = [load.rateconDocument, ...load.loadDocuments, ...load.podDocuments].filter((ld) => ld);

    if (loadDocs.length === 0 && !load.invoice) {
        return;
    }

    const combinedPDFDoc = await PDFDocument.create();

    const isValidJPEG = (arrayBuffer: ArrayBuffer) => {
        const arr = new Uint8Array(arrayBuffer.slice(0, 2));
        return arr[0] === 0xff && arr[1] === 0xd8; // SOI marker for JPEG
    };

    const addBlobToCombinedPdf = async (blob: Blob) => {
        const arrayBuffer = await blob.arrayBuffer();
        const contentType = blob.type;

        const pdfWidth = 612; // default width of a PDF page (8.5 x 72 points/inch)

        if (contentType === 'application/pdf') {
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pages = await combinedPDFDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
            for (const page of pages) {
                combinedPDFDoc.addPage(page);
            }
        } else if ((contentType === 'image/jpeg' && isValidJPEG(arrayBuffer)) || contentType === 'image/png') {
            try {
                let image: PDFImage;
                if (contentType === 'image/jpeg') {
                    image = await combinedPDFDoc.embedJpg(arrayBuffer);
                } else if (contentType === 'image/png') {
                    image = await combinedPDFDoc.embedPng(arrayBuffer);
                }

                const imageAspectRatio = image.height / image.width;
                let scaledWidth = pdfWidth;
                let scaledHeight = pdfWidth * imageAspectRatio;

                // Check if the image width is less than 612
                if (image.width < pdfWidth) {
                    scaledWidth = image.width;
                    scaledHeight = image.height;
                }

                const page = combinedPDFDoc.addPage([scaledWidth, scaledHeight]);
                page.drawImage(image, { x: 0, y: 0, width: scaledWidth, height: scaledHeight });
            } catch (error) {
                console.error(`Error embedding ${contentType}:`, error);
            }
        }
    };

    if (load.invoice) {
        const invoiceBlob = await createInvoicePdfBlob(carrierId, load.invoice, load.customer, load);
        await zipWriter.add(`invoice-${load.invoice.invoiceNum}.pdf`, new zip.BlobReader(invoiceBlob));

        // Add invoiceBlob to the combined PDF
        await addBlobToCombinedPdf(invoiceBlob);
    }

    if (loadDocs.length > 0) {
        const addBlobToZip = async (doc: LoadDocument) => {
            const response = await fetch(doc.fileUrl);
            const blob = await response.blob();

            await zipWriter.add(doc.fileName, new zip.BlobReader(blob));
            await addBlobToCombinedPdf(blob);
        };
        for (const doc of loadDocs) {
            await addBlobToZip(doc);
        }
    }

    // Serialize the combinedPDFDoc and add it to the zip
    const combinedPdfBytes = await combinedPDFDoc.save();
    const combinedPdfBlob = new Blob([combinedPdfBytes], { type: 'application/pdf' });
    const fileName = `${load.customer?.name ? `${sanitize(load.customer.name)}_` : ''}${sanitize(load.refNum)}`;
    await zipWriter.add(`${fileName}.pdf`, new zip.BlobReader(combinedPdfBlob));

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
