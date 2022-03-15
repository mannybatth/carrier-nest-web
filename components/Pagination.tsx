import React from 'react';
import { PaginationMetadata } from '../interfaces/models';

type Props = {
    metadata: PaginationMetadata;
    onPrevious: (metadata: PaginationMetadata) => void;
    onNext: (metadata: PaginationMetadata) => void;
};

const Pagination: React.FC<Props> = ({ metadata, onPrevious, onNext }: Props) => {
    return (
        <div
            className="flex items-center justify-between px-1 py-3 bg-white border-t border-gray-200 sm:px-6"
            aria-label="Pagination"
        >
            <div className="hidden sm:block">
                <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{metadata.currentOffset + 1}</span> to{' '}
                    <span className="font-medium">
                        {Math.min(metadata.total, metadata.currentOffset + metadata.currentLimit)}
                    </span>{' '}
                    of <span className="font-medium">{metadata.total}</span> results
                </p>
            </div>
            <div className="flex justify-between flex-1 space-x-3 sm:justify-end">
                <button
                    onClick={() => onPrevious(metadata)}
                    type="button"
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
                    disabled={!metadata.prev}
                >
                    Previous
                </button>
                <button
                    onClick={() => onNext(metadata)}
                    type="button"
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
                    disabled={!metadata.next}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Pagination;
