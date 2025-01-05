import React, { ChangeEvent } from 'react';
import { ArrowUpTrayIcon, PaperClipIcon, TrashIcon } from '@heroicons/react/24/outline';
import { LoadDocument } from '@prisma/client';

type LoadDetailsDocumentsProps = {
    podDocuments: LoadDocument[];
    loadDocuments: LoadDocument[];
    docsLoading: boolean;
    handleUploadPodsChange: (event: ChangeEvent<HTMLInputElement>) => void;
    handleUploadDocsChange: (event: ChangeEvent<HTMLInputElement>) => void;
    openDocument: (document: LoadDocument) => void;
    setDocumentIdToDelete: (id: string | null) => void;
    setOpenDeleteDocumentConfirmation: (open: boolean) => void;
};

const LoadDetailsDocuments: React.FC<LoadDetailsDocumentsProps> = ({
    podDocuments,
    loadDocuments,
    docsLoading,
    handleUploadPodsChange,
    handleUploadDocsChange,
    openDocument,
    setDocumentIdToDelete,
    setOpenDeleteDocumentConfirmation,
}) => {
    let podFileInput: HTMLInputElement;

    return (
        <div>
            <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <div className="border-b border-gray-200 sm:border-none">
                    <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                        <dt className="text-gray-500">PODs</dt>
                        <dd className="text-gray-900">
                            <div>
                                <input
                                    type="file"
                                    onChange={handleUploadPodsChange}
                                    style={{ display: 'none' }}
                                    ref={(input) => (podFileInput = input)}
                                />
                                <button
                                    type="button"
                                    className="inline-flex items-center px-3 py-1 ml-5 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    onClick={() => podFileInput.click()}
                                    disabled={docsLoading}
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4 mr-1 text-gray-500" />
                                    <span className="block md:hidden">Upload POD</span>
                                    <span className="hidden md:block">Upload POD</span>
                                </button>
                            </div>
                        </dd>
                    </div>
                    {podDocuments.length > 0 && (
                        <ul role="list" className="mb-2 border border-gray-200 divide-y divide-gray-200 rounded-md">
                            {podDocuments.map((doc, index) => (
                                <li key={`pod-doc-${index}`}>
                                    <div className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100">
                                        <div
                                            className="flex items-center flex-1 py-2 pl-3 pr-4"
                                            onClick={() => openDocument(doc)}
                                        >
                                            <PaperClipIcon
                                                className="flex-shrink-0 w-4 h-4 text-gray-400"
                                                aria-hidden="true"
                                            />
                                            <span className="flex-1 w-0 ml-2 truncate">{doc.fileName}</span>
                                        </div>
                                        <div className="flex-shrink-0 ml-2">
                                            <button
                                                type="button"
                                                className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDocumentIdToDelete(doc.id);
                                                    setOpenDeleteDocumentConfirmation(true);
                                                }}
                                                disabled={docsLoading}
                                            >
                                                <TrashIcon className="flex-shrink-0 w-4 h-4 text-gray-800" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <LoadDocumentsSection
                    title="Documents"
                    documents={loadDocuments}
                    docsLoading={docsLoading}
                    handleUploadChange={handleUploadDocsChange}
                    openDocument={openDocument}
                    setDocumentIdToDelete={setDocumentIdToDelete}
                    setOpenDeleteDocumentConfirmation={setOpenDeleteDocumentConfirmation}
                />
            </dl>
        </div>
    );
};

type LoadDocumentsSectionProps = {
    title: string;
    documents: LoadDocument[];
    docsLoading: boolean;
    handleUploadChange: (event: ChangeEvent<HTMLInputElement>) => void;
    openDocument: (document: LoadDocument) => void;
    setDocumentIdToDelete: (id: string | null) => void;
    setOpenDeleteDocumentConfirmation: (open: boolean) => void;
};

const LoadDocumentsSection: React.FC<LoadDocumentsSectionProps> = ({
    title,
    documents,
    docsLoading,
    handleUploadChange,
    openDocument,
    setDocumentIdToDelete,
    setOpenDeleteDocumentConfirmation,
}) => {
    let fileInput: HTMLInputElement;

    return (
        <div>
            <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                <dt className="text-gray-500">{title}</dt>
                <dd className="text-gray-900">
                    <div>
                        <input
                            type="file"
                            onChange={handleUploadChange}
                            style={{ display: 'none' }}
                            ref={(input) => (fileInput = input)}
                        />
                        <button
                            type="button"
                            className="inline-flex items-center px-3 py-1 ml-5 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            onClick={() => fileInput.click()}
                            disabled={docsLoading}
                        >
                            <ArrowUpTrayIcon className="w-4 h-4 mr-1 text-gray-500" />
                            <span className="block md:hidden">Upload</span>
                            <span className="hidden md:block">Upload Doc</span>
                        </button>
                    </div>
                </dd>
            </div>
            {documents.length > 0 && (
                <ul role="list" className="mb-2 border border-gray-200 divide-y divide-gray-200 rounded-md">
                    {documents.map((doc, index) => (
                        <li key={`load-doc-${index}`}>
                            <div className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100">
                                <div
                                    className="flex items-center flex-1 py-2 pl-3 pr-4"
                                    onClick={() => openDocument(doc)}
                                >
                                    <PaperClipIcon className="flex-shrink-0 w-4 h-4 text-gray-400" aria-hidden="true" />
                                    <span className="flex-1 w-0 ml-2 truncate">{doc.fileName}</span>
                                </div>
                                <div className="flex-shrink-0 ml-2">
                                    <button
                                        type="button"
                                        className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDocumentIdToDelete(doc.id);
                                            setOpenDeleteDocumentConfirmation(true);
                                        }}
                                        disabled={docsLoading}
                                    >
                                        <TrashIcon className="flex-shrink-0 w-4 h-4 text-gray-800" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LoadDetailsDocuments;
