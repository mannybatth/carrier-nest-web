import { useEffect, useState, useCallback } from 'react';
import * as PdfJs from 'pdfjs-dist/build/pdf.min';
import * as PdfWorker from 'pdfjs-dist/build/pdf.worker.entry';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

interface Props {
    data?: Uint8Array;
}

const usePDF = ({ data }: Props) => {
    PdfJs.GlobalWorkerOptions.workerSrc = PdfWorker;

    const [pages, setPages] = useState(0);
    const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        setPages(0);
        setDocument(null);
        setError(true);

        PdfJs.getDocument(data)
            .promise.then((pdf: PDFDocumentProxy) => {
                setPages(pdf.numPages);
                setDocument(pdf);
                setError(false);
            })
            .catch(() => {
                setPages(0);
                setDocument(null);
                setError(true);
            });
    }, [data]);

    const fetchPage = useCallback(
        (index: number): Promise<PDFPageProxy> | null => {
            if (document) {
                return document.getPage(index);
            }
            return null;
        },
        [document],
    );

    return { pages, error, fetchPage };
};

export default usePDF;
