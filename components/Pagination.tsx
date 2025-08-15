import React, { useState } from 'react';
import { PaginationMetadata } from '../interfaces/table';

type Props = {
    metadata: PaginationMetadata;
    loading: boolean;
    onPrevious: (metadata: PaginationMetadata) => void;
    onNext: (metadata: PaginationMetadata) => void;
    onGoToPage?: (page: number) => void;
};

const Pagination: React.FC<Props> = ({ metadata, loading, onPrevious, onNext, onGoToPage }) => {
    const [pageInput, setPageInput] = useState('');

    // Calculate current page and total pages
    const currentPage = Math.floor(metadata.currentOffset / metadata.currentLimit) + 1;
    const totalPages = Math.ceil(metadata.total / metadata.currentLimit);

    // Generate page numbers to display (show up to 5 pages around current page)
    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return pages;
    };

    const handlePageInputSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pageNumber = parseInt(pageInput, 10);
        if (pageNumber >= 1 && pageNumber <= totalPages && onGoToPage) {
            onGoToPage(pageNumber);
            setPageInput('');
        }
    };

    const handleGoToPage = (page: number) => {
        if (onGoToPage && page >= 1 && page <= totalPages) {
            onGoToPage(page);
        }
    };
    return (
        <div
            className="flex items-center justify-between px-1 py-3 pt-5  border-l border-r border-b rounded-bl-lg rounded-br-lg -mt-3 roudned bg-gray-50/40 border-gray-200 sm:px-4"
            aria-label="Pagination"
        >
            <div className="px-3 sm:px-0 block">
                <p className="text-sm text-gray-600 font-semibold">
                    {metadata.total > 0 && (
                        <>
                            Showing <span className="font-medium">{metadata.currentOffset + 1}</span> to{' '}
                            <span className="font-medium">
                                {Math.min(metadata.total, metadata.currentOffset + metadata.currentLimit)}
                            </span>{' '}
                            of <span className="font-medium">{metadata.total}</span> results
                        </>
                    )}
                </p>
            </div>

            {/* Mobile pagination - simple prev/next */}
            <div className="flex justify-between flex-1 space-x-3 sm:justify-end lg:hidden">
                <button
                    onClick={() => onPrevious(metadata)}
                    type="button"
                    className="w-1/2 sm:w-auto items-center px-5 py-2.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
                    disabled={!metadata.prev || loading}
                >
                    Previous
                </button>
                <button
                    onClick={() => onNext(metadata)}
                    type="button"
                    className="w-1/2 sm:w-auto items-center px-5 py-2.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
                    disabled={!metadata.next || loading}
                >
                    Next
                </button>
            </div>

            {/* Desktop pagination - with page numbers and go to page */}
            <div className="hidden lg:flex lg:items-center lg:space-x-3">
                {/* Previous button */}
                <button
                    onClick={() => onPrevious(metadata)}
                    type="button"
                    className="items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
                    disabled={!metadata.prev || loading}
                >
                    Previous
                </button>

                {/* Page numbers */}
                {totalPages > 1 && (
                    <div className="flex items-center space-x-1">
                        {/* First page */}
                        {getPageNumbers()[0] > 1 && (
                            <>
                                <button
                                    onClick={() => handleGoToPage(1)}
                                    className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    1
                                </button>
                                {getPageNumbers()[0] > 2 && <span className="px-2 text-gray-500">...</span>}
                            </>
                        )}

                        {/* Page number buttons */}
                        {getPageNumbers().map((page) => (
                            <button
                                key={page}
                                onClick={() => handleGoToPage(page)}
                                className={`px-3 py-2 text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                                    page === currentPage
                                        ? 'text-white bg-indigo-600 border border-indigo-600'
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {page}
                            </button>
                        ))}

                        {/* Last page */}
                        {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                            <>
                                {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                                    <span className="px-2 text-gray-500">...</span>
                                )}
                                <button
                                    onClick={() => handleGoToPage(totalPages)}
                                    className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Go to page input */}
                {totalPages > 1 && onGoToPage && (
                    <form onSubmit={handlePageInputSubmit} className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Go to:</span>
                        <input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            placeholder={currentPage.toString()}
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button
                            type="submit"
                            className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Go
                        </button>
                    </form>
                )}

                {/* Next button */}
                <button
                    onClick={() => onNext(metadata)}
                    type="button"
                    className="items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
                    disabled={!metadata.next || loading}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Pagination;
