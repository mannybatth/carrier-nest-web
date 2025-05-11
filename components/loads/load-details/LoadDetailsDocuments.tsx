'use client';

import React, { type ChangeEvent, useRef, useState } from 'react';
import { ArrowUpTrayIcon, DocumentTextIcon, PaperClipIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { LoadDocument } from '@prisma/client';
import Spinner from 'components/Spinner';
import { Dialog, Transition } from '@headlessui/react';

type LoadDetailsDocumentsProps = {
    podDocuments: LoadDocument[];
    loadDocuments: LoadDocument[];
    rateconDocument?: LoadDocument | null;
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
    rateconDocument,
    docsLoading,
    handleUploadPodsChange,
    handleUploadDocsChange,
    openDocument,
    setDocumentIdToDelete,
    setOpenDeleteDocumentConfirmation,
}) => {
    // Group documents by type for better organization
    const documentsByType = React.useMemo(() => {
        const grouped: Record<string, LoadDocument[]> = {};

        // Group regular load documents by fileType
        loadDocuments.forEach((doc) => {
            const type = getDocumentTypeLabel(doc.fileType);
            if (!grouped[type]) {
                grouped[type] = [];
            }
            grouped[type].push(doc);
        });

        return grouped;
    }, [loadDocuments]);

    return (
        <div className="bg-gray-50 rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="px-4 sm:px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">Documents</h2>
            </div>

            <div className="px-4 sm:px-6 py-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* POD/BOL Documents Section */}
                    <DocumentSection
                        title="POD/BOL Documents"
                        documents={podDocuments}
                        docsLoading={docsLoading}
                        handleUploadChange={handleUploadPodsChange}
                        openDocument={openDocument}
                        setDocumentIdToDelete={setDocumentIdToDelete}
                        setOpenDeleteDocumentConfirmation={setOpenDeleteDocumentConfirmation}
                        uploadButtonText="Upload POD/BOL"
                        emptyMessage="No POD/BOL documents uploaded"
                        documentType="pod"
                    />

                    {/* Rate Confirmation Document */}
                    {rateconDocument && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-medium text-gray-900">Rate Confirmation</h3>
                            </div>
                            <ul className="border border-gray-200 rounded-md overflow-hidden">
                                <li className="hover:bg-gray-50">
                                    <div
                                        className="flex items-center py-3 pl-3 pr-4 text-sm cursor-pointer"
                                        onClick={() => openDocument(rateconDocument)}
                                    >
                                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                                        <span className="font-medium text-gray-900 truncate">
                                            {rateconDocument.fileName}
                                        </span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    )}

                    {/* Other Documents Section */}
                    <div className={`${rateconDocument ? 'lg:col-span-2' : ''}`}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-medium text-gray-900">Other Documents</h3>
                            <UploadButton
                                docsLoading={docsLoading}
                                handleUploadChange={handleUploadDocsChange}
                                buttonText="Upload Document"
                                documentType="document"
                            />
                        </div>

                        {/* Document types sections */}
                        {Object.keys(documentsByType).length > 0 ? (
                            <div className="space-y-6">
                                {Object.entries(documentsByType).map(([type, docs]) => (
                                    <div key={type} className="space-y-2">
                                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {type}
                                        </h4>
                                        <ul className="border border-white bg-gray-100 rounded-md overflow-hidden divide-y divide-gray-200">
                                            {docs.map((doc) => (
                                                <DocumentItem
                                                    key={doc.id}
                                                    document={doc}
                                                    openDocument={openDocument}
                                                    setDocumentIdToDelete={setDocumentIdToDelete}
                                                    setOpenDeleteDocumentConfirmation={
                                                        setOpenDeleteDocumentConfirmation
                                                    }
                                                    disabled={docsLoading}
                                                />
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic py-4">No other documents uploaded</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to get a readable document type label
function getDocumentTypeLabel(fileType: string): string {
    if (!fileType) return 'Other';

    if (fileType.includes('pdf')) return 'PDF Documents';
    if (fileType.includes('image') || fileType.includes('png') || fileType.includes('jpg') || fileType.includes('jpeg'))
        return 'Images';
    if (fileType.includes('word') || fileType.includes('doc')) return 'Word Documents';
    if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('csv')) return 'Spreadsheets';

    return 'Other';
}

// Document Section Component
type DocumentSectionProps = {
    title: string;
    documents: LoadDocument[];
    docsLoading: boolean;
    handleUploadChange: (event: ChangeEvent<HTMLInputElement>) => void;
    openDocument: (document: LoadDocument) => void;
    setDocumentIdToDelete: (id: string | null) => void;
    setOpenDeleteDocumentConfirmation: (open: boolean) => void;
    uploadButtonText: string;
    emptyMessage: string;
    documentType: 'pod' | 'document';
};

const DocumentSection: React.FC<DocumentSectionProps> = ({
    title,
    documents,
    docsLoading,
    handleUploadChange,
    openDocument,
    setDocumentIdToDelete,
    setOpenDeleteDocumentConfirmation,
    uploadButtonText,
    emptyMessage,
    documentType,
}) => {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-900">{title}</h3>
                <UploadButton
                    docsLoading={docsLoading}
                    handleUploadChange={handleUploadChange}
                    buttonText={uploadButtonText}
                    documentType={documentType}
                />
            </div>

            {documents.length > 0 ? (
                <ul className="border border-white bg-gray-100 rounded-md overflow-hidden divide-y divide-gray-200">
                    {documents.map((doc) => (
                        <DocumentItem
                            key={doc.id}
                            document={doc}
                            openDocument={openDocument}
                            setDocumentIdToDelete={setDocumentIdToDelete}
                            setOpenDeleteDocumentConfirmation={setOpenDeleteDocumentConfirmation}
                            disabled={docsLoading}
                        />
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500 italic py-4">{emptyMessage}</p>
            )}
        </div>
    );
};

// Upload Button Component
type UploadButtonProps = {
    docsLoading: boolean;
    handleUploadChange: (event: ChangeEvent<HTMLInputElement>) => void;
    buttonText: string;
    documentType: 'pod' | 'document';
};

const UploadButton: React.FC<UploadButtonProps> = ({ docsLoading, handleUploadChange, buttonText, documentType }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const file = e.target.files[0];
        setSelectedFile(file);
        setFileName(file.name);
    };

    const handleUpload = async () => {
        if (!selectedFile || !fileInputRef.current) {
            return;
        }

        setIsUploading(true);
        try {
            // Create a new File object with the custom filename
            const fileExtension = selectedFile.name.split('.').pop() || '';
            const fileNameWithExtension = fileName.endsWith(`.${fileExtension}`)
                ? fileName
                : `${fileName}.${fileExtension}`;

            // Create a new File object with the custom name but same content and type
            const renamedFile = new File([selectedFile], fileNameWithExtension, { type: selectedFile.type });

            // Create a new event with the renamed file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(renamedFile);

            const newEvent = new Event('change', { bubbles: true });
            Object.defineProperty(newEvent, 'target', {
                writable: false,
                value: { files: dataTransfer.files },
            });

            await handleUploadChange(newEvent as unknown as ChangeEvent<HTMLInputElement>);

            // Reset state after successful upload
            setSelectedFile(null);
            setFileName('');
            setIsModalOpen(false);

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                className="inline-flex whitespace-nowrap items-center px-3 py-1.5 text-xs sm:text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => setIsModalOpen(true)}
                disabled={docsLoading}
            >
                <ArrowUpTrayIcon className="w-4 h-4 mr-1.5 text-gray-500" />
                {buttonText}
            </button>

            {/* Upload Modal */}
            <Transition appear show={isModalOpen} as={React.Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => !isUploading && setIsModalOpen(false)}>
                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <div className="flex justify-between items-start">
                                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                            Upload {documentType === 'pod' ? 'POD/BOL Document' : 'Document'}
                                        </Dialog.Title>
                                        {!isUploading && (
                                            <button
                                                type="button"
                                                className="text-gray-400 hover:text-gray-500"
                                                onClick={() => setIsModalOpen(false)}
                                            >
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-4">
                                        <div className="space-y-4">
                                            {/* File selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Select File
                                                </label>
                                                <div className="flex items-center">
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleFileSelect}
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                        disabled={isUploading}
                                                    />
                                                </div>
                                            </div>

                                            {/* File name editing (only shown if a file is selected) */}
                                            {selectedFile && (
                                                <div>
                                                    <label
                                                        htmlFor="fileName"
                                                        className="block text-sm font-medium text-gray-700 mb-1"
                                                    >
                                                        File Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="fileName"
                                                        value={fileName}
                                                        onChange={(e) => setFileName(e.target.value)}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                        disabled={isUploading}
                                                    />
                                                </div>
                                            )}

                                            {/* Selected file info */}
                                            {selectedFile && (
                                                <div className="bg-gray-50 rounded-md p-3">
                                                    <div className="flex items-center">
                                                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {selectedFile.name} ({formatFileSize(selectedFile.size)}
                                                                )
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {selectedFile.type || 'Unknown file type'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end space-x-3">
                                        {!isUploading && (
                                            <button
                                                type="button"
                                                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                onClick={() => setIsModalOpen(false)}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                            onClick={handleUpload}
                                            disabled={!selectedFile || isUploading}
                                        >
                                            {isUploading ? (
                                                <div className="flex items-center">
                                                    <Spinner className="w-4 h-4 mr-2" />
                                                    <span>Uploading...</span>
                                                </div>
                                            ) : (
                                                'Upload'
                                            )}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

// Helper function to format file size
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Document Item Component
type DocumentItemProps = {
    document: LoadDocument;
    openDocument: (document: LoadDocument) => void;
    setDocumentIdToDelete: (id: string | null) => void;
    setOpenDeleteDocumentConfirmation: (open: boolean) => void;
    disabled: boolean;
};

const DocumentItem: React.FC<DocumentItemProps> = ({
    document,
    openDocument,
    setDocumentIdToDelete,
    setOpenDeleteDocumentConfirmation,
    disabled,
}) => {
    return (
        <li className="hover:bg-gray-50">
            <div className="flex relative items-center justify-between py-2 pl-3 pr-4 text-sm">
                <div className="flex items-center flex-1 cursor-pointer" onClick={() => openDocument(document)}>
                    <PaperClipIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="font-medium text-gray-900 truncate">{document.fileName}</span>
                </div>
                <div className="ml-4 absolute right-0 flex-shrink-0">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDocumentIdToDelete(document.id);
                            setOpenDeleteDocumentConfirmation(true);
                        }}
                        disabled={disabled}
                        className="font-medium bg-slate-100 text-red-600 hover:text-red-500 p-1 rounded-full hover:bg-red-50"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </li>
    );
};

export default LoadDetailsDocuments;
