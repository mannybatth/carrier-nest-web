'use client';

import React, { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { ArrowUpTrayIcon, DocumentTextIcon, PaperClipIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { LoadDocument } from '@prisma/client';
import Spinner from 'components/Spinner';
import { Dialog, Transition } from '@headlessui/react';
import { useSession } from 'next-auth/react';
import {
    generateStandardizedFileName,
    DocumentType as StandardDocumentType,
} from '../../../lib/helpers/document-naming';

type LoadDetailsDocumentsProps = {
    podDocuments: LoadDocument[];
    bolDocuments: LoadDocument[];
    loadDocuments: LoadDocument[];
    rateconDocument?: LoadDocument | null;
    docsLoading: boolean;
    handleUploadPodsChange: (event: ChangeEvent<HTMLInputElement>) => void;
    handleUploadBolsChange: (event: ChangeEvent<HTMLInputElement>) => void;
    handleUploadRateconChange: (event: ChangeEvent<HTMLInputElement>) => void;
    handleUploadDocsChange: (event: ChangeEvent<HTMLInputElement>) => void;
    openDocument: (document: LoadDocument) => void;
    setDocumentIdToDelete: (id: string | null) => void;
    setOpenDeleteDocumentConfirmation: (open: boolean) => void;
    deletingDocumentId?: string | null; // Document currently being deleted (after confirmation)
    documentIdToDelete?: string | null; // Document queued for deletion (pending confirmation)
    loadDocumentsData?: () => Promise<void>; // Function to load documents on demand
};

type DocumentType = 'pod' | 'bol' | 'ratecon' | 'document';

const LoadDetailsDocuments: React.FC<LoadDetailsDocumentsProps> = ({
    podDocuments,
    bolDocuments,
    loadDocuments,
    rateconDocument,
    docsLoading,
    handleUploadPodsChange,
    handleUploadBolsChange,
    handleUploadRateconChange,
    handleUploadDocsChange,
    openDocument,
    setDocumentIdToDelete,
    setOpenDeleteDocumentConfirmation,
    deletingDocumentId,
    documentIdToDelete,
    loadDocumentsData,
}) => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>('document');
    const [documentsLoaded, setDocumentsLoaded] = useState(false);

    // Load documents when component mounts (lazy loading)
    useEffect(() => {
        const shouldLoadDocuments =
            !documentsLoaded &&
            loadDocumentsData &&
            !loadDocuments?.length &&
            !podDocuments?.length &&
            !bolDocuments?.length &&
            !rateconDocument;

        if (shouldLoadDocuments) {
            loadDocumentsData()
                .then(() => {
                    setDocumentsLoaded(true);
                })
                .catch(console.error);
        }
    }, [
        loadDocumentsData,
        documentsLoaded,
        loadDocuments?.length,
        podDocuments?.length,
        bolDocuments?.length,
        rateconDocument,
    ]);

    const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
        switch (selectedDocumentType) {
            case 'pod':
                handleUploadPodsChange(event);
                break;
            case 'bol':
                handleUploadBolsChange(event);
                break;
            case 'ratecon':
                handleUploadRateconChange(event);
                break;
            case 'document':
                handleUploadDocsChange(event);
                break;
        }
        // Don't close modal here - let handleUploadClick manage the modal state
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100/50 backdrop-blur-sm">
            <div className="px-6 py-6 border-b border-gray-100/80 bg-gradient-to-r from-gray-50/50 to-white">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Documents</h2>
                    <button
                        type="button"
                        className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl shadow-sm hover:bg-blue-700 hover:shadow-md transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        onClick={() => setIsUploadModalOpen(true)}
                        disabled={docsLoading}
                    >
                        <ArrowUpTrayIcon className="w-4 h-4 mr-2.5" />
                        Upload Document
                    </button>
                </div>
            </div>

            <div className="px-6 py-6">
                <div className="space-y-8">
                    {/* First Row: Rate Confirmation and Bill of Lading */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Rate Confirmation Document */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-600 tracking-tight">Rate Confirmation</h3>
                            {rateconDocument ? (
                                <div className="bg-white rounded-xl border border-gray-100/80 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <DocumentItem
                                        document={rateconDocument}
                                        openDocument={openDocument}
                                        setDocumentIdToDelete={setDocumentIdToDelete}
                                        setOpenDeleteDocumentConfirmation={setOpenDeleteDocumentConfirmation}
                                        disabled={docsLoading}
                                        isDeleting={deletingDocumentId === rateconDocument.id}
                                        isPendingDeletion={documentIdToDelete === rateconDocument.id}
                                    />
                                </div>
                            ) : (
                                <div className="bg-gray-50/50 rounded-xl border border-gray-100/50 border-dashed">
                                    <p className="text-sm text-gray-500 text-center py-8 font-medium">
                                        No rate confirmation document
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* BOL Documents */}
                        <DocumentSection
                            title="Bill of Lading"
                            documents={bolDocuments}
                            openDocument={openDocument}
                            setDocumentIdToDelete={setDocumentIdToDelete}
                            setOpenDeleteDocumentConfirmation={setOpenDeleteDocumentConfirmation}
                            emptyMessage="No BOL documents"
                            disabled={docsLoading}
                            deletingDocumentId={deletingDocumentId}
                            documentIdToDelete={documentIdToDelete}
                        />
                    </div>

                    {/* Second Row: Proof of Delivery and Other Documents */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* POD Documents */}
                        <DocumentSection
                            title="Proof of Delivery"
                            documents={podDocuments}
                            openDocument={openDocument}
                            setDocumentIdToDelete={setDocumentIdToDelete}
                            setOpenDeleteDocumentConfirmation={setOpenDeleteDocumentConfirmation}
                            emptyMessage="No POD documents"
                            disabled={docsLoading}
                            deletingDocumentId={deletingDocumentId}
                            documentIdToDelete={documentIdToDelete}
                        />

                        {/* Other Documents */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-600 tracking-tight">Other Documents</h3>
                            {loadDocuments.length > 0 ? (
                                <div className="bg-white rounded-xl border border-gray-100/80 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                                    <div className="divide-y divide-gray-100/60">
                                        {loadDocuments.map((doc) => (
                                            <DocumentItem
                                                key={doc.id}
                                                document={doc}
                                                openDocument={openDocument}
                                                setDocumentIdToDelete={setDocumentIdToDelete}
                                                setOpenDeleteDocumentConfirmation={setOpenDeleteDocumentConfirmation}
                                                disabled={docsLoading}
                                                isDeleting={deletingDocumentId === doc.id}
                                                isPendingDeletion={documentIdToDelete === doc.id}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50/50 rounded-xl border border-gray-100/50 border-dashed">
                                    <p className="text-sm text-gray-500 text-center py-8 font-medium">
                                        No other documents
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            <DocumentUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                selectedDocumentType={selectedDocumentType}
                setSelectedDocumentType={setSelectedDocumentType}
                handleUpload={handleUpload}
                isUploading={docsLoading}
                rateconDocument={rateconDocument}
            />
        </div>
    );
};

// Document Section Component (simplified without upload button)
type DocumentSectionProps = {
    title: string;
    documents: LoadDocument[];
    openDocument: (document: LoadDocument) => void;
    setDocumentIdToDelete: (id: string | null) => void;
    setOpenDeleteDocumentConfirmation: (open: boolean) => void;
    emptyMessage: string;
    disabled: boolean;
    deletingDocumentId?: string | null;
    documentIdToDelete?: string | null;
};

const DocumentSection: React.FC<DocumentSectionProps> = ({
    title,
    documents,
    openDocument,
    setDocumentIdToDelete,
    setOpenDeleteDocumentConfirmation,
    emptyMessage,
    disabled,
    deletingDocumentId,
    documentIdToDelete,
}) => {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-600 tracking-tight">{title}</h3>

            {documents.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-100/80 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                    <div className="divide-y divide-gray-100/60">
                        {documents.map((doc) => (
                            <DocumentItem
                                key={doc.id}
                                document={doc}
                                openDocument={openDocument}
                                setDocumentIdToDelete={setDocumentIdToDelete}
                                setOpenDeleteDocumentConfirmation={setOpenDeleteDocumentConfirmation}
                                disabled={disabled}
                                isDeleting={deletingDocumentId === doc.id}
                                isPendingDeletion={documentIdToDelete === doc.id}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50/50 rounded-xl border border-gray-100/50 border-dashed">
                    <p className="text-sm text-gray-500 text-center py-8 font-medium">{emptyMessage}</p>
                </div>
            )}
        </div>
    );
};

// Document Upload Modal Component
type DocumentUploadModalProps = {
    isOpen: boolean;
    onClose: () => void;
    selectedDocumentType: DocumentType;
    setSelectedDocumentType: (type: DocumentType) => void;
    handleUpload: (event: ChangeEvent<HTMLInputElement>) => void;
    isUploading: boolean;
    rateconDocument?: LoadDocument | null;
};

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
    isOpen,
    onClose,
    selectedDocumentType,
    setSelectedDocumentType,
    handleUpload,
    isUploading,
    rateconDocument,
}) => {
    const { data: session } = useSession();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isModalUploading, setIsModalUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Helper function to generate standardized filename
    const generateFileName = (file: File, docType: DocumentType): string => {
        const documentTypeMap: Record<DocumentType, StandardDocumentType> = {
            pod: 'POD',
            bol: 'BOL',
            ratecon: 'RATECON',
            document: 'DOCUMENT',
        };

        return generateStandardizedFileName(file, documentTypeMap[docType], session);
    };

    // Regenerate filename when document type changes
    useEffect(() => {
        if (selectedFile) {
            const newFileName = generateFileName(selectedFile, selectedDocumentType);
            setFileName(newFileName);
        }
    }, [selectedDocumentType, selectedFile, session]);

    // Automatically switch away from ratecon if it becomes disabled
    useEffect(() => {
        if (selectedDocumentType === 'ratecon' && rateconDocument) {
            setSelectedDocumentType('document');
        }
    }, [selectedDocumentType, rateconDocument, setSelectedDocumentType]);

    // Reset modal state
    const resetModalState = () => {
        setSelectedFile(null);
        setFileName('');
        setSelectedDocumentType('document'); // Reset to default document type
        setUploadProgress(0);
        setIsModalUploading(false);
        setUploadStatus('idle');
        setErrorMessage('');

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Enhanced close handler that resets state
    const handleClose = () => {
        if (uploadStatus !== 'uploading') {
            resetModalState();
            onClose();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const file = e.target.files[0];
        setSelectedFile(file);

        // Generate standardized filename based on document type
        const standardizedFileName = generateFileName(file, selectedDocumentType);
        setFileName(standardizedFileName);
    };

    const handleUploadClick = async () => {
        if (!selectedFile || !fileInputRef.current) {
            return;
        }

        setIsModalUploading(true);
        setUploadStatus('uploading');
        setUploadProgress(0);
        setErrorMessage('');

        let progressInterval: NodeJS.Timeout | null = null;

        try {
            // Simulate progress updates during upload
            progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev < 90) {
                        return prev + Math.random() * 20;
                    }
                    return prev;
                });
            }, 200);

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

            // Special handling for rate con uploads - check if already exists
            if (selectedDocumentType === 'ratecon' && rateconDocument) {
                throw new Error(
                    'A rate confirmation document already exists for this load. Please delete the existing rate con document first.',
                );
            }

            // Call the upload handler (this happens synchronously)
            handleUpload(newEvent as unknown as ChangeEvent<HTMLInputElement>);

            // Simulate some upload time to show progress
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Clear the progress interval and set to 100%
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            setUploadProgress(100);
            setUploadStatus('success');
            setIsModalUploading(false);

            // Wait longer to show success state, then close
            setTimeout(() => {
                resetModalState();
            }, 3000);
        } catch (error) {
            console.error('Upload error:', error);

            // Clean up progress interval on error
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }

            setIsModalUploading(false);
            setUploadProgress(0);
            setUploadStatus('error');
            setErrorMessage(error.message || 'An error occurred during upload');
        }
    };

    const documentTypes = [
        { value: 'pod' as DocumentType, label: 'POD', description: 'Proof of Delivery' },
        { value: 'bol' as DocumentType, label: 'BOL', description: 'Bill of Lading' },
        { value: 'ratecon' as DocumentType, label: 'Rate Con', description: 'Rate Confirmation' },
        { value: 'document' as DocumentType, label: 'Other', description: 'Other Document' },
    ];

    return (
        <Transition appear show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-40" onClose={handleClose}>
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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-8 text-left align-middle shadow-2xl transition-all border border-gray-100/50 backdrop-blur-sm">
                                <div className="flex justify-between items-start mb-6">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-xl font-semibold leading-6 text-gray-900 tracking-tight"
                                    >
                                        Upload Document
                                    </Dialog.Title>
                                    {!isUploading && (
                                        <button
                                            type="button"
                                            className="text-gray-400 hover:text-gray-500 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors duration-200"
                                            onClick={handleClose}
                                        >
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    {/* Document Type Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Document Type
                                        </label>
                                        <div className="grid grid-cols-4 gap-1">
                                            {documentTypes.map((type) => {
                                                const isRateconExisting = type.value === 'ratecon' && !!rateconDocument;
                                                const isDisabled = uploadStatus === 'uploading' || isRateconExisting;

                                                return (
                                                    <button
                                                        key={type.value}
                                                        type="button"
                                                        className={`px-2 py-1.5 text-center border rounded-md transition-colors text-xs font-medium ${
                                                            selectedDocumentType === type.value
                                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                                : isDisabled
                                                                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                        onClick={() =>
                                                            !isDisabled && setSelectedDocumentType(type.value)
                                                        }
                                                        disabled={isDisabled}
                                                        title={
                                                            isRateconExisting
                                                                ? 'Rate confirmation document already exists'
                                                                : ''
                                                        }
                                                    >
                                                        {type.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

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
                                                disabled={uploadStatus === 'uploading'}
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
                                                disabled={uploadStatus === 'uploading'}
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
                                                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {selectedFile.type || 'Unknown file type'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Upload Progress/Status */}
                                    {(uploadStatus === 'uploading' ||
                                        uploadStatus === 'success' ||
                                        uploadStatus === 'error') && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                {uploadStatus === 'uploading' && (
                                                    <>
                                                        <span className="text-gray-700 flex items-center">
                                                            <Spinner className="w-4 h-4 mr-2" />
                                                            Uploading...
                                                        </span>
                                                        <span className="text-gray-700">
                                                            {Math.round(uploadProgress)}%
                                                        </span>
                                                    </>
                                                )}
                                                {uploadStatus === 'success' && (
                                                    <>
                                                        <span className="text-green-700 flex items-center">
                                                            <svg
                                                                className="w-4 h-4 mr-2"
                                                                fill="currentColor"
                                                                viewBox="0 0 20 20"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                            Upload Complete!
                                                        </span>
                                                        <span className="text-green-700">100%</span>
                                                    </>
                                                )}
                                                {uploadStatus === 'error' && (
                                                    <span className="text-red-700 flex items-center">
                                                        <svg
                                                            className="w-4 h-4 mr-2"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                        Upload Failed
                                                    </span>
                                                )}
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-300 ease-out ${
                                                        uploadStatus === 'success'
                                                            ? 'bg-green-600'
                                                            : uploadStatus === 'error'
                                                            ? 'bg-red-600'
                                                            : 'bg-blue-600'
                                                    }`}
                                                    style={{
                                                        width: uploadStatus === 'error' ? '100%' : `${uploadProgress}%`,
                                                    }}
                                                ></div>
                                            </div>
                                            {uploadStatus === 'error' && errorMessage && (
                                                <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 flex justify-end space-x-3">
                                    {uploadStatus !== 'uploading' && (
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                                            onClick={handleClose}
                                        >
                                            {uploadStatus === 'success' ? 'Close' : 'Cancel'}
                                        </button>
                                    )}
                                    {uploadStatus === 'error' && (
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-xl border border-transparent bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                                            onClick={() => {
                                                setUploadStatus('idle');
                                                setErrorMessage('');
                                                setUploadProgress(0);
                                            }}
                                        >
                                            Retry Upload
                                        </button>
                                    )}
                                    {uploadStatus === 'idle' && (
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-xl border border-transparent bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                            onClick={handleUploadClick}
                                            disabled={!selectedFile}
                                        >
                                            Upload
                                        </button>
                                    )}
                                    {uploadStatus === 'uploading' && (
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-xl border border-transparent bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm opacity-50 cursor-not-allowed"
                                            disabled
                                        >
                                            <Spinner className="w-4 h-4 mr-2" />
                                            Uploading...
                                        </button>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
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
    isDeleting?: boolean;
    isPendingDeletion?: boolean;
};

const DocumentItem: React.FC<DocumentItemProps> = ({
    document,
    openDocument,
    setDocumentIdToDelete,
    setOpenDeleteDocumentConfirmation,
    disabled,
    isDeleting = false,
    isPendingDeletion = false,
}) => {
    // Handle delete button click - just show confirmation, no local state changes
    const handleDeleteClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setDocumentIdToDelete(document.id);
        setOpenDeleteDocumentConfirmation(true);
    };

    // Determine the visual state
    const getDocumentState = () => {
        if (isDeleting) return 'deleting';
        if (isPendingDeletion) return 'pending';
        return 'normal';
    };

    const documentState = getDocumentState();

    return (
        <div
            className={`group transition-all duration-200 ${
                documentState === 'deleting'
                    ? 'opacity-60 pointer-events-none'
                    : documentState === 'pending'
                    ? 'bg-red-50/30'
                    : 'hover:bg-gray-50/80'
            }`}
        >
            <div className="flex items-center justify-between px-4 py-4 min-w-0">
                <div
                    className={`flex items-center flex-1 min-w-0 ${
                        documentState !== 'normal' ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    onClick={() => documentState === 'normal' && openDocument(document)}
                >
                    <div className="flex-shrink-0 mr-3">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                                documentState === 'deleting'
                                    ? 'bg-gray-100'
                                    : documentState === 'pending'
                                    ? 'bg-red-50 border border-red-200'
                                    : 'bg-blue-50 group-hover:bg-blue-100'
                            }`}
                        >
                            {documentState === 'deleting' ? (
                                <Spinner className="w-4 h-4 text-gray-500" />
                            ) : documentState === 'pending' ? (
                                <div className="relative">
                                    <PaperClipIcon className="h-5 w-5 text-red-600" />
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                                </div>
                            ) : (
                                <PaperClipIcon className="h-5 w-5 text-blue-600" />
                            )}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                        <p
                            className={`text-sm font-medium truncate transition-colors duration-200 ${
                                documentState === 'deleting'
                                    ? 'text-gray-500'
                                    : documentState === 'pending'
                                    ? 'text-red-700'
                                    : 'text-gray-900 group-hover:text-gray-800'
                            }`}
                            title={document.fileName}
                        >
                            {document.fileName}
                        </p>
                        <p
                            className={`text-xs transition-colors duration-200 truncate ${
                                documentState === 'deleting'
                                    ? 'text-gray-400'
                                    : documentState === 'pending'
                                    ? 'text-red-500'
                                    : 'text-gray-500'
                            }`}
                        >
                            {documentState === 'deleting'
                                ? 'Removing...'
                                : documentState === 'pending'
                                ? 'Tap to confirm deletion'
                                : document.fileType || 'Document'}
                        </p>
                    </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                    {documentState === 'deleting' ? (
                        <div className="w-8 h-8 flex items-center justify-center">
                            {/* Empty space while deleting */}
                        </div>
                    ) : documentState === 'pending' ? (
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleDeleteClick}
                            disabled={disabled || documentState !== 'normal'}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100/0 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete document"
                        >
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadDetailsDocuments;
