'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDoubleRightIcon } from '@heroicons/react/24/solid';
import { SpecialZoomLevel } from '@react-pdf-viewer/core';
import type { DocumentLoadEvent, LoadError } from '@react-pdf-viewer/core';

// Dynamically import with better error handling
const Viewer = dynamic(async () => (await import('@react-pdf-viewer/core')).Viewer, {
    ssr: false,
    loading: () => <PDFLoadingSkeleton />,
});

const Worker = dynamic(async () => (await import('@react-pdf-viewer/core')).Worker, { ssr: false });

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// Types
interface OCRVertex {
    x: number;
    y: number;
}

interface ScrollPosition {
    x: number;
    y: number;
}

interface PDFViewerProps {
    fileBlob: Blob;
    scrollToPage?: number;
    scrollToXY?: ScrollPosition;
    ocrVertices?: OCRVertex[][];
    isProcessing?: boolean;
    processingProgress?: number;
    onPageChange?: (page: number) => void;
    onError?: (error: Error) => void;
}

// Constants
const WORKER_URL = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const SCAN_ANIMATION_SPEED = 20;
const SCAN_INCREMENT = 2;

// Loading skeleton component
const PDFLoadingSkeleton: React.FC = () => (
    <div className="flex-1 h-full bg-gray-50 animate-pulse" style={{ overflowY: 'scroll', scrollbarGutter: 'stable' }}>
        <div className="h-full flex flex-col space-y-4 p-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm h-96 flex items-center justify-center">
                    <div className="text-gray-400">Loading PDF...</div>
                </div>
            ))}
        </div>
    </div>
);

// Error boundary component
const PDFErrorFallback: React.FC<{ error: Error; onRetry?: () => void }> = ({ error, onRetry }) => (
    <div
        className="flex-1 h-full flex items-center justify-center bg-red-50"
        style={{ overflowY: 'scroll', scrollbarGutter: 'stable' }}
    >
        <div className="text-center p-6 max-w-md">
            <div className="text-red-600 text-lg font-semibold mb-2">Failed to load PDF</div>
            <div className="text-red-500 text-sm mb-4">{error.message}</div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                    Try Again
                </button>
            )}
        </div>
    </div>
);

// Processing indicator component
const ProcessingIndicator: React.FC<{ progress: number }> = React.memo(({ progress }) => (
    <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 transition-all duration-300 ease-in-out z-[1002]">
        <div className="flex items-center mb-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-blue-500 animate-pulse mr-2" />
            <p className="text-xs sm:text-sm font-medium text-gray-800">AI Processing Document</p>
            <p className="ml-auto text-xs font-medium text-gray-500">{Math.round(progress)}%</p>
        </div>
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Processing progress"
            />
        </div>
    </div>
));

ProcessingIndicator.displayName = 'ProcessingIndicator';

// OCR Box component - EXACT original logic restored
const OCRBox: React.FC<{
    vertices: OCRVertex[];
    scrollToPage: number;
    containerRef: React.RefObject<HTMLDivElement>;
}> = React.memo(({ vertices, scrollToPage, containerRef }) => {
    // If vertices are not available, return null
    if (vertices.length !== 4) return null;

    // If small screen, return null
    if (window.innerWidth < 640) return null;

    // Get the boundary of the current (scrollToPage) page
    const pagesBoundary = containerRef.current
        ?.querySelectorAll('.rpv-core__page-layer')
        [scrollToPage]?.getBoundingClientRect();

    // If page boundary is not available, return null
    if (!pagesBoundary) return null;

    // ORIGINAL LOGIC: Check if page is in view relative to WINDOW (not container)
    const isPageInView =
        pagesBoundary.top >= 0 &&
        pagesBoundary.left >= 0 &&
        pagesBoundary.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        pagesBoundary.right <= (window.innerWidth || document.documentElement.clientWidth);

    const pages = containerRef.current?.querySelectorAll('.rpv-core__page-layer');

    // ORIGINAL LOGIC: Use window.scrollTo if page is not in view
    if (!isPageInView && (scrollToPage === 0 || scrollToPage)) {
        window.scrollTo({
            top: pages?.[scrollToPage]?.getBoundingClientRect().y + window.scrollY,
            behavior: 'smooth',
        });
    }

    // ORIGINAL coordinate calculations
    const xMin = Math.min(...vertices.map((v) => v.x * pagesBoundary.width + 5.5));
    const yMin = Math.min(
        ...vertices.map(
            (v) => v.y * pagesBoundary.height + (scrollToPage === 0 ? 0 : pagesBoundary.height * scrollToPage) - 3,
        ),
    );
    const xMax = Math.max(...vertices.map((v) => v.x * pagesBoundary.width + 11.5));
    const yMax = Math.max(
        ...vertices.map(
            (v) => v.y * pagesBoundary.height + (scrollToPage === 0 ? 0 : pagesBoundary.height * scrollToPage) + 3,
        ),
    );

    // Get width and height of the box
    const width = xMax - xMin;
    const height = yMax - yMin;

    return (
        <div key={`${xMin}-${yMin}-container`} className="relative">
            <ChevronDoubleRightIcon
                key={`${xMin}-${yMin}-icon`}
                className="z-[9999] relative -left-[14px] animate-pulse"
                width={28}
                height={28}
                color="#007AFF"
                style={{
                    top: `${Math.round(yMin) + height * 0.6 - 14}px`,
                    position: 'absolute',
                    filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.8))',
                }}
            />

            <div
                key={`${xMin}-${yMin}`}
                id="ocr-box"
                className="absolute z-[1000] transition-all animate-pulse pointer-events-none rounded-sm"
                style={{
                    left: `${xMin}px`,
                    top: `${yMin}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    background: 'rgba(0, 122, 255, 0.2)',
                    boxShadow: '0 0 0 2px rgba(0, 122, 255, 0.8), 0 0 10px rgba(0, 122, 255, 0.4)',
                    backdropFilter: 'brightness(1.2)',
                }}
            />
        </div>
    );
});

OCRBox.displayName = 'OCRBox';

// Main PDFViewer component
const PDFViewer: React.FC<PDFViewerProps> = ({
    fileBlob,
    scrollToPage,
    scrollToXY,
    ocrVertices = [],
    isProcessing = false,
    processingProgress = 0,
    onPageChange,
    onError,
}) => {
    // Memoize PDF URL and clean up on unmount
    const pdfFileUrl = useMemo(() => {
        return URL.createObjectURL(fileBlob);
    }, [fileBlob]);

    useEffect(() => {
        return () => {
            URL.revokeObjectURL(pdfFileUrl);
        };
    }, [pdfFileUrl]);

    // State
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPdfLoaded, setIsPdfLoaded] = useState(false);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scanPosition, setScanPosition] = useState(0);

    // Scanning animation effect
    useEffect(() => {
        if (!isProcessing || !containerRef.current) return;

        const interval = setInterval(() => {
            const height = containerRef.current?.scrollHeight || 0;
            setScanPosition((prev) => {
                const newPos = prev + SCAN_INCREMENT;
                return newPos > height ? 0 : newPos;
            });
        }, SCAN_ANIMATION_SPEED);

        return () => clearInterval(interval);
    }, [isProcessing]);

    // Handle document load - EXACT original logic
    const handleDocumentLoad = useCallback(
        (e: DocumentLoadEvent) => {
            const pageCount = e.doc.numPages;
            setIsPdfLoaded(true);
            setPageCount(pageCount);

            // Trigger scroll after pages are rendered - ORIGINAL LOGIC
            if (containerRef.current) {
                const pages = containerRef.current.querySelectorAll('.rpv-core__page-layer');

                // Ensure that pages are rendered
                if (pages.length > 0 && scrollToPage) {
                    const pageHeight = pages[0].getBoundingClientRect().height;
                    const scrollTop = scrollToPage * pageHeight;
                    containerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
                    setCurrentPage(scrollToPage + 1);
                } else if (pages.length > 0 && scrollToXY) {
                    containerRef.current.scrollTo({ top: 1100, left: 0 });
                    window.scrollTo({ top: scrollToXY.y, behavior: 'smooth' });
                }
            }
        },
        [scrollToPage, scrollToXY],
    );

    // Handle document load error - returns JSX for renderError prop
    const renderDocumentError = useCallback(
        (error: LoadError) => {
            const errorObj = new Error(`Failed to load PDF: ${error.message || 'Unknown error'}`);
            onError?.(errorObj);

            return (
                <div className="p-4 text-red-600 bg-red-50 rounded-md">
                    <div className="font-semibold mb-2">Error loading PDF</div>
                    <div className="text-sm">{error.message || 'Unknown error occurred'}</div>
                    <div className="text-xs text-gray-500 mt-2">{error.name && `Error type: ${error.name}`}</div>
                </div>
            );
        },
        [onError],
    );

    // Handle scroll to track current page
    const handleScroll = useCallback(() => {
        if (!containerRef.current || !isPdfLoaded) return;

        const scrollTop = containerRef.current.scrollTop;
        const pages = containerRef.current.querySelectorAll('.rpv-core__page-layer');

        if (pages.length > 0) {
            const pageHeight = pages[0].getBoundingClientRect().height;
            const newCurrentPage = Math.floor(scrollTop / pageHeight) + 1;

            if (newCurrentPage !== currentPage && newCurrentPage <= pageCount) {
                setCurrentPage(newCurrentPage);
                onPageChange?.(newCurrentPage);
            }
        }
    }, [isPdfLoaded, currentPage, pageCount, onPageChange]);

    // Attach scroll listener
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Minimal CSS to prevent flickering without breaking window scroll
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
      .pdf-container-stable {
        scrollbar-gutter: stable !important;
        overflow-y: scroll !important;
        overflow-x: hidden !important;
      }

      .pdf-container-stable::-webkit-scrollbar {
        width: 16px;
      }

      .pdf-container-stable::-webkit-scrollbar-track {
        background: #f1f1f1;
      }

      .pdf-container-stable::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 8px;
      }

      .pdf-container-stable::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (
        <div className="relative flex-1 h-full" role="document" aria-label="PDF Viewer">
            {/* Scanning effect overlay */}
            {isProcessing && (
                <div className="absolute inset-0 z-[1001] pointer-events-none" aria-hidden="true">
                    <div
                        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent transition-all duration-300 ease-in-out"
                        style={{
                            top: `${scanPosition}px`,
                            boxShadow: '0 0 10px rgba(0, 122, 255, 0.8), 0 0 20px rgba(0, 122, 255, 0.4)',
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent opacity-30" />
                    <ProcessingIndicator progress={processingProgress} />
                </div>
            )}

            {/* OCR overlay boxes - EXACT original logic */}
            <div className="absolute inset-0 pointer-events-none">
                {ocrVertices?.map((vertices, index) => (
                    <OCRBox
                        key={`ocr-${index}`}
                        vertices={vertices}
                        scrollToPage={scrollToPage || 0}
                        containerRef={containerRef}
                    />
                ))}
            </div>

            {/* PDF Container with stable scrollbar and auto-fit width */}
            <div
                ref={containerRef}
                className="pdf-container-stable flex-col h-full bg-white"
                tabIndex={0}
                role="main"
                aria-label="PDF content"
            >
                <Worker workerUrl={WORKER_URL}>
                    <Viewer
                        fileUrl={pdfFileUrl}
                        defaultScale={SpecialZoomLevel.PageWidth}
                        onDocumentLoad={handleDocumentLoad}
                        renderError={renderDocumentError}
                    />
                </Worker>
            </div>
        </div>
    );
};

export default PDFViewer;
