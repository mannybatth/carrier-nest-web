import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Viewer to handle SSR issues
const Viewer = dynamic(async () => (await import('@react-pdf-viewer/core')).Viewer, { ssr: false });
const Worker = dynamic(async () => (await import('@react-pdf-viewer/core')).Worker, { ssr: false });

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { SpecialZoomLevel } from '@react-pdf-viewer/core';
import { DocumentLoadEvent } from '@react-pdf-viewer/core';
import { set } from 'date-fns';

interface PDFViewerProps {
    fileBlob: Blob;
    scrollToPage?: number; // Page to scroll to (1-indexed)
    scrollToXY?: { x: number; y: number }; // Custom (x, y) scroll location
    ocrVertices?: { x: number; y: number }[][]; // OCR bounding boxes
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileBlob, scrollToPage, scrollToXY, ocrVertices }) => {
    const pdfFileUrl = React.useMemo(() => URL.createObjectURL(fileBlob), [fileBlob]);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isPdfLoaded, setIsPdfLoaded] = useState(false);
    const [pageCount, setPageCount] = useState(0);

    const onPageLoad = (e: DocumentLoadEvent) => {
        const pageCount = e.doc.numPages;
        // console.log(`PDF loaded with ${pageCount} pages`);
        setIsPdfLoaded(true);
        setPageCount(pageCount);

        // Trigger scroll after pages are rendered
        if (containerRef.current) {
            const pages = containerRef.current.querySelectorAll('.rpv-core__page-layer');
            // console.log('Checking pages:', pages.length, e.file, scrollToPage, scrollToXY); // Debugging line

            // Ensure that pages are rendered

            if (pages.length > 0 && scrollToPage) {
                // console.log('Scrolling to page:', scrollToPage);
                const pageHeight = pages[0].getBoundingClientRect().height;
                const scrollTop = (pageCount - 1) * pageHeight;
                // console.log('Scrolling to:', pageHeight, scrollTop);
                containerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
                window.scrollTo({ top: scrollTop, behavior: 'smooth' });
            } else if (pages.length > 0 && scrollToXY) {
                // console.log('Scrolling to custom location:', scrollToXY);
                containerRef.current.scrollTo({ top: 1100, left: 0 }); // .scrollTo({ top: scrollToXY.y, left: scrollToXY.x, behavior: 'smooth' });
                // console.log('Scrolled to custom location:', containerRef.current.scrollTop);
                window.scrollTo({ top: scrollToXY.y, behavior: 'smooth' });
                //console.log('Page properties:', pages[0].getBoundingClientRect());
            }
        }
    };

    const onPageLoadError = (error: any) => {
        // console.log('Error loading PDF:', error);
        return <div>Error loading PDF: {error.message}</div>;
    };

    // console.log('PDF File URL:', pdfFileUrl);

    // Check if the PDF Blob is valid
    useEffect(() => {
        // console.log('PDF Blob:', fileBlob);
    }, [fileBlob]);

    // Debug: Check if page count is updated
    useEffect(() => {
        // console.log('Current page count:', pageCount);
    }, [pageCount]);

    /*  useEffect(() => {
        console.log('Before scrolling to page:', scrollToPage, isPdfLoaded, containerRef.current);
        if (isPdfLoaded && scrollToPage) {
            console.log('Scrolling to page:', scrollToPage);
            const pages = containerRef.current.querySelectorAll('.rpv-core__page-layer');
            // console.log('Scrolling to page:', scrollToPage);
            const pageHeight = pages[scrollToPage].getBoundingClientRect().height;
            const scrollTop = (pageCount - 1) * pageHeight;
            console.log('Scrolling to:', pageHeight, scrollTop, pageCount);
            window.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
    }, [scrollToPage, isPdfLoaded]); */

    const drawBox = (vertices: { x: number; y: number }[]) => {
        //console.log('Vertices: ', vertices);
        const pagesBoundry = containerRef.current
            .querySelectorAll('.rpv-core__page-layer')
            [scrollToPage]?.getBoundingClientRect();

        if (!pagesBoundry) return null;

        const isPageInView =
            pagesBoundry.top >= 0 &&
            pagesBoundry.left >= 0 &&
            pagesBoundry.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            pagesBoundry.right <= (window.innerWidth || document.documentElement.clientWidth);

        const pages = containerRef.current.querySelectorAll('.rpv-core__page-layer');

        //  console.log('Scrolling to page:', scrollToPage);
        if (!isPageInView && (scrollToPage === 0 || scrollToPage)) {
            // console.log('Scrolling to page:', scrollToPage);
            const pagesBoundry = pages[scrollToPage].getBoundingClientRect();
            //console.log('Scrolling to:', pagesBoundry, window.scrollY);

            window.scrollTo({
                top: pages[scrollToPage].getBoundingClientRect().y + window.scrollY,
                behavior: 'smooth',
            });
        }

        // console.log('Pages Boundry:', pagesBoundry.width, pagesBoundry.height, pagesBoundry);
        if (vertices.length !== 4) return null;

        const xMin = Math.min(...vertices.map((v) => v.x * pagesBoundry.width + 5.5));
        const yMin = Math.min(
            ...vertices.map(
                (v) => v.y * pagesBoundry.height + (scrollToPage === 0 ? 0 : pagesBoundry.height * scrollToPage) - 3,
            ),
        );
        const xMax = Math.max(...vertices.map((v) => v.x * pagesBoundry.width + 11.5));
        const yMax = Math.max(
            ...vertices.map(
                (v) => v.y * pagesBoundry.height + (scrollToPage === 0 ? 0 : pagesBoundry.height * scrollToPage) + 3,
            ),
        );

        const width = xMax - xMin;
        const height = yMax - yMin;

        // console.log('min:', xMin, yMin, 'max:', xMax, yMax, 'width:', width, 'height:', height);

        return (
            <div
                key={`${xMin}-${yMin}`}
                id="ocr-box"
                className="absolute z-[1000] border-[1px] transition-all border-double animate-pulse border-red-400 pointer-events-none bg-red-400/50 rounded-sm"
                style={{
                    left: `${xMin}px`,
                    top: `${yMin}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                }}
            />
        );
    };

    return (
        <div className="relative flex-1">
            {/* Overlay boxes for OCR vertices */}
            <div className="absolute inset-0 pointer-events-none">
                {ocrVertices?.map((vertices, index) => drawBox(vertices))}
            </div>
            <div ref={containerRef} className="flex-col h-full overflow-y-scroll  bg-slate-300">
                {/* ReactPDF Worker for performance */}
                <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
                    {/* Render a simple log or message to ensure Viewer is working */}

                    {/* Actual PDF Viewer */}
                    <Viewer
                        fileUrl={pdfFileUrl}
                        defaultScale={SpecialZoomLevel.PageWidth}
                        onDocumentLoad={onPageLoad} // Ensure we know when the PDF has fully loaded
                        renderError={onPageLoadError} // Catch any errors
                    />
                </Worker>
            </div>
        </div>
    );
};

export default PDFViewer;
