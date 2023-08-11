import { ExpandedLoad } from '../../interfaces/models';
import * as zip from '@zip.js/zip.js';
import { createInvoicePdfBlob } from '../../components/invoices/invoicePdf';
import { LoadDocument } from '@prisma/client';
import { sanitize } from '../helpers/string';

export const downloadAllDocsForLoad = async (load: ExpandedLoad, carrierId: string) => {
    if (!load) {
        return;
    }

    const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'), {
        bufferedWrite: true,
    });

    const loadDocs = [load.rateconDocument, ...load.podDocuments, ...load.loadDocuments].filter((ld) => ld);

    if (loadDocs.length === 0 && !load.invoice) {
        return;
    }

    if (load.invoice) {
        const invoiceBlob = await createInvoicePdfBlob(carrierId, load.invoice, load.customer, load);
        await zipWriter.add(`invoice-${load.invoice.invoiceNum}.pdf`, new zip.BlobReader(invoiceBlob));
    }

    if (loadDocs.length > 0) {
        const addBlobToZip = async (doc: LoadDocument) => {
            const blob = await fetch(doc.fileUrl).then((r) => r.blob());
            await zipWriter.add(doc.fileName, new zip.BlobReader(blob));
        };
        const promises = loadDocs.map((doc) => addBlobToZip(doc));
        await Promise.all(promises);
    }

    const blob = await zipWriter.close();
    // Use load reference number and customer name (if available) in the file name, format to a file name friendly string
    const fileName = `${sanitize(load.refNum)}${load.customer?.name ? `-${sanitize(load.customer.name)}` : ''}`;

    // Convert the blob to an Object URL
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element to initiate the download
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName; // specify the name of the zip file

    // Append anchor to the body, click it to download, and then remove it
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
};
