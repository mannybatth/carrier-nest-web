import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeftIcon, TrashIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';

import Layout from '../../../../components/layout/Layout';
import { notify } from '../../../../components/notifications/Notification';
import { PageWithAuth } from '../../../../interfaces/auth';
import ExpenseForm from '../../../../components/expenses/ExpenseForm';
import BreadCrumb from '../../../../components/layout/BreadCrumb';
import PDFViewer from '../../../../components/PDFViewer';
import SimpleDialog from '../../../../components/dialogs/SimpleDialog';
import { generateExpenseFileName } from '../../../../lib/helpers/document-naming';
import { ExpenseProvider, useExpenseContext } from '../../../../components/context/ExpenseContext';
import { ExpandedExpense } from '../../../../interfaces/models';
import { LoadingOverlay } from '../../../../components/LoadingOverlay';

type Props = {
    expenseId: string;
};

const ExpenseEditPage = ({ expenseId }: Props) => {
    const router = useRouter();
    const { data: session } = useSession();
    const { expense, setExpense, loading, error } = useExpenseContext();

    const [submitting, setSubmitting] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    // PDF and file management state
    const [currentDocumentBlob, setCurrentDocumentBlob] = useState<Blob | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<
        'idle' | 'preparing' | 'uploading' | 'saving' | 'success' | 'error'
    >('idle');

    // Modal state for delete confirmation
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isDeletingDocument, setIsDeletingDocument] = useState(false);

    // Ref to store initial data and prevent reinitialization during submission
    const initialDataRef = useRef<any>(null);

    // AbortController ref for cancelling uploads
    const uploadAbortControllerRef = useRef<AbortController | null>(null);

    // Create initial data that updates when expense loads but stays stable during submission
    const initialData = useMemo(() => {
        if (!expense) return {};

        // If we're submitting and have initial data, keep using it
        if (submitting && initialDataRef.current) {
            return initialDataRef.current;
        }

        const data = {
            categoryId: expense.categoryId,
            amount: expense.amount.toString(),
            currencyCode: expense.currencyCode || 'USD',
            paidBy: expense.paidBy,
            receiptDate: expense.receiptDate ? new Date(expense.receiptDate).toISOString().split('T')[0] : '',
            loadId: expense.loadId || '',
            driverId: expense.driverId || '',
            equipmentId: expense.equipmentId || '',
            street: expense.street || '',
            city: expense.city || '',
            state: expense.state || '',
            postalCode: expense.postalCode || '',
            country: expense.country || '',
            description: expense.description || '',
            vendorName: expense.vendorName || '',
            driver: expense.driver || null,
            load: expense.load || null,
            equipment: expense.equipment || null,
        };

        // Store the data in ref for future use during submission
        initialDataRef.current = data;
        return data;
    }, [expense, submitting]); // Update when expense loads, but prevent changes during submission

    // Reset initial data ref when expense ID changes
    useEffect(() => {
        initialDataRef.current = null;
    }, [expenseId]);

    // Utility function to format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    useEffect(() => {
        // Load the first document if it exists when expense loads
        if (expense?.documents && expense.documents.length > 0) {
            loadDocument(expense.documents[0].document.storageUrl);
        }
    }, [expense]);

    // Cleanup: abort any ongoing uploads when component unmounts
    useEffect(() => {
        return () => {
            if (uploadAbortControllerRef.current) {
                uploadAbortControllerRef.current.abort();
            }
        };
    }, []);

    const loadDocument = async (documentUrl: string) => {
        try {
            const response = await fetch(documentUrl);
            if (!response.ok) throw new Error('Failed to fetch document');

            const blob = await response.blob();
            setCurrentDocumentBlob(blob);
        } catch (error) {
            console.error('Error loading document:', error);
            notify({ title: 'Failed to load document', type: 'error' });
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                notify({ title: 'Please select a PDF file', type: 'error' });
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                // 10MB limit
                notify({ title: 'File size must be less than 10MB', type: 'error' });
                return;
            }

            // Reset states
            setUploadProgress(0);
            setUploadStatus('preparing');
            setSelectedFile(file);

            // Create blob for immediate preview
            const blob = new Blob([file], { type: 'application/pdf' });
            setCurrentDocumentBlob(blob);

            // Automatically trigger upload
            await handleFileUpload(file);
        }

        // Clear the input value so the same file can be selected again if needed
        event.target.value = '';
    };

    const handleFileUpload = async (fileToUpload?: File) => {
        const file = fileToUpload || selectedFile;
        if (!file || !expense?.category?.name) {
            return;
        }

        // Cancel any existing upload
        if (uploadAbortControllerRef.current) {
            uploadAbortControllerRef.current.abort();
        }

        // Create new AbortController for this upload
        const abortController = new AbortController();
        uploadAbortControllerRef.current = abortController;

        setIsUploading(true);
        setUploadStatus('uploading');

        try {
            // Generate the new filename based on expense category
            const newFileName = generateExpenseFileName(file, expense.category.name);

            // Create a new File object with the renamed filename
            const renamedFile = new File([file], newFileName, {
                type: file.type,
                lastModified: file.lastModified,
            });

            // Simulate realistic progress during upload
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev < 60) return Math.floor(prev + Math.random() * 10 + 5);
                    return prev;
                });
            }, 200);

            // Use the documents upload API instead of direct GCS upload
            const formData = new FormData();
            formData.append('files', renamedFile);

            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Upload timeout')), 300000); // 5 minutes
            });

            // Race between upload and timeout
            const uploadResponse = (await Promise.race([
                fetch('/api/documents/upload', {
                    method: 'POST',
                    body: formData,
                    signal: abortController.signal,
                    // Add timeout headers to help with large file uploads
                    headers: {
                        'X-Upload-Timeout': '300000', // 5 minutes
                    },
                }),
                timeoutPromise,
            ])) as Response;

            clearInterval(progressInterval);
            setUploadProgress(65);

            if (!uploadResponse.ok) {
                throw new Error('Upload failed');
            }

            const uploadData = await uploadResponse.json();
            if (!uploadData.documentIds || uploadData.documentIds.length === 0) {
                throw new Error('No document ID returned from upload');
            }

            setUploadStatus('saving');
            setUploadProgress(80);

            // Associate the uploaded document with the expense
            const documentId = uploadData.documentIds[0];

            const response = await fetch(`/api/expenses/${expenseId}/documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ documentId }),
                signal: abortController.signal,
            });

            if (!response.ok) {
                throw new Error('Failed to associate document with expense');
            }

            const savedAssociation = await response.json();

            setUploadProgress(100);
            setUploadStatus('success');

            // Update local state - get the document from the association
            setExpense((prev: any) =>
                prev
                    ? {
                          ...prev,
                          documents: [
                              {
                                  id: savedAssociation.id,
                                  document: savedAssociation.document,
                              },
                          ],
                      }
                    : null,
            );

            notify({ title: 'Document uploaded successfully', type: 'success' });

            // Reset states after a brief delay
            setTimeout(() => {
                setSelectedFile(null);
                setUploadProgress(0);
                setUploadStatus('idle');
            }, 2000);
        } catch (error) {
            console.error('Error uploading file:', error);
            setUploadStatus('error');

            // Handle different types of errors
            let errorMessage = 'Failed to upload file';
            if (error.name === 'AbortError') {
                errorMessage = 'Upload was cancelled';
            } else if (error.message?.includes('timeout')) {
                errorMessage = 'Upload timeout - please try again';
            } else if (error.message?.includes('network')) {
                errorMessage = 'Network error - please check your connection';
            }

            notify({ title: errorMessage, type: 'error' });

            // Reset states after error
            setTimeout(() => {
                setUploadProgress(0);
                setUploadStatus('idle');
            }, 3000);
        } finally {
            setIsUploading(false);
            // Clear the abort controller reference
            if (uploadAbortControllerRef.current === abortController) {
                uploadAbortControllerRef.current = null;
            }
        }
    };

    const handleDeleteCurrentDocument = async () => {
        if (!expense?.documents?.length) return;

        setIsDeletingDocument(true);
        try {
            const documentId = expense.documents[0].id;

            // Call backend API to delete the document
            const response = await fetch(`/api/expenses/${expenseId}/documents/${documentId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete document');
            }

            // Update local state
            setCurrentDocumentBlob(null);
            setExpense((prev) =>
                prev
                    ? {
                          ...prev,
                          documents: [],
                      }
                    : null,
            );

            notify({ title: 'Document deleted successfully', type: 'success' });
            setShowDeleteConfirmation(false);
        } catch (error) {
            console.error('Error deleting document:', error);
            notify({ title: 'Failed to delete document', type: 'error' });
        } finally {
            setIsDeletingDocument(false);
        }
    };

    const handleSubmit = async (formData: any) => {
        setSubmitting(true);

        try {
            const updateData = {
                categoryId: formData.categoryId,
                amount: parseFloat(formData.amount),
                currencyCode: formData.currencyCode || 'USD',
                paidBy: formData.paidBy,
                receiptDate: formData.receiptDate || null,
                loadId: formData.loadId || null,
                driverId: formData.driverId || null,
                equipmentId: formData.equipmentId || null,
                street1: formData.street || null,
                street2: null,
                city: formData.city || null,
                state: formData.state || null,
                postalCode: formData.postalCode || null,
                country: formData.country || null,
                description: formData.description || null,
                vendorName: formData.vendorName || null,
            };

            // Update expense data
            const response = await fetch(`/api/expenses/${expenseId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                throw new Error('Failed to update expense');
            }

            const updatedExpense = await response.json();

            // Update the context with the new expense data
            setExpense(updatedExpense);

            notify({ title: 'Expense updated successfully', type: 'success' });

            // Navigate to expense detail page
            await router.push(`/expenses/${expenseId}`);
        } catch (error) {
            console.error('Error updating expense:', error);
            notify({ title: 'Failed to update expense', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleValidationChange = (valid: boolean) => {
        setIsFormValid(valid);
    };

    const handleFormSubmit = () => {
        // Trigger form submission by finding the form and calling submit
        const form = document.querySelector('form');
        if (form) {
            form.requestSubmit();
        }
    };

    const handleCancel = () => {
        router.push(`/expenses/${expenseId}`);
    };

    if (loading) {
        return (
            <Layout
                smHeaderComponent={
                    <div className="flex items-center">
                        <h1 className="text-lg font-semibold text-gray-900">Loading...</h1>
                    </div>
                }
            >
                <div className="bg-white border-b border-gray-200">
                    <div className="px-4 py-6 sm:px-6 lg:px-8">
                        <div className="max-w-7xl mx-auto">
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex gap-6">
                        <div className="w-1/2">
                            <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
                        </div>
                        <div className="w-1/2">
                            <div className="space-y-4">
                                <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
                                <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!expense) {
        return (
            <Layout
                smHeaderComponent={
                    <div className="flex items-center">
                        <h1 className="text-lg font-semibold text-gray-900">Expense Not Found</h1>
                    </div>
                }
            >
                <div className="bg-white border-b border-gray-200">
                    <div className="px-4 py-6 sm:px-6 lg:px-8">
                        <div className="max-w-7xl mx-auto">
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <svg
                                        className="w-8 h-8 text-red-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                        />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Expense Not Found</h2>
                                <p className="text-gray-600 mb-6">
                                    The expense you&apos;re looking for doesn&apos;t exist or has been deleted.
                                </p>
                                <Link
                                    href="/expenses"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                                    Back to Expenses
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    // Check if expense is attached to a driver invoice
    if (expense.driverInvoiceId) {
        return (
            <Layout
                smHeaderComponent={
                    <div className="flex items-center">
                        <h1 className="text-lg font-semibold text-gray-900">Cannot Edit Expense</h1>
                    </div>
                }
            >
                <div className="bg-white">
                    <div className="px-4 py-6 sm:px-6 lg:px-8">
                        <div className="max-w-7xl mx-auto">
                            {/* Breadcrumb */}
                            <div className="mb-6">
                                <BreadCrumb
                                    paths={[
                                        { label: 'Expenses', href: '/expenses' },
                                        { label: 'Expense Details', href: `/expenses/${expenseId}` },
                                        { label: 'Edit' },
                                    ]}
                                />
                            </div>

                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <svg
                                        className="w-8 h-8 text-orange-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                        />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Cannot Edit This Expense</h2>
                                <div className="max-w-md mx-auto">
                                    <p className="text-gray-600 mb-2">
                                        This expense is attached to a driver invoice and cannot be edited.
                                    </p>
                                    <p className="text-sm text-gray-500 mb-6">
                                        To make changes, you must first remove this expense from the driver invoice.
                                    </p>
                                    <div className="inline-flex items-center px-3 py-1 bg-orange-50 rounded-lg border border-orange-200/50 shadow-sm mb-6">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2 flex-shrink-0"></div>
                                        <span className="text-sm font-medium text-orange-700 whitespace-nowrap">
                                            Attached to Driver Invoice
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-center space-x-3">
                                    <Link
                                        href={`/expenses/${expenseId}`}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        View Expense
                                    </Link>
                                    <Link
                                        href="/expenses"
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                                        Back to Expenses
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <>
            {submitting && <LoadingOverlay message="Updating Expense..." />}
            <Layout
                smHeaderComponent={
                    <div className="flex items-center">
                        <Link
                            href={`/expenses/${expenseId}`}
                            className="mr-3 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                        </Link>
                        <h1 className="text-xl font-semibold text-gray-900">Edit Expense</h1>
                    </div>
                }
            >
                {/* Main content container */}
                <div className="px-4 py-6 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Breadcrumb */}
                        <div className="mb-6">
                            <BreadCrumb
                                paths={[
                                    { label: 'Expenses', href: '/expenses' },
                                    { label: 'Expense Details', href: `/expenses/${expenseId}` },
                                    { label: 'Edit' },
                                ]}
                            />
                        </div>

                        {/* Header Section */}
                        <div className="bg-white shadow rounded-lg mb-6">
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-200/50">
                                            <DocumentPlusIcon className="w-5 h-5 text-blue-600" />
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h1 className="text-2xl font-bold text-gray-900">Edit Expense</h1>
                                        <p className="mt-1 text-sm text-gray-600">
                                            Update expense information and manage documents
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-[9fr_11fr] gap-6">
                            {/* PDF Viewer Section - Sticky */}
                            <div className="lg:sticky lg:top-4 self-start">
                                <div className="bg-white shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        {/* Document Upload Section */}
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-medium text-gray-900">Document</h3>
                                                <div className="flex items-center space-x-2">
                                                    {currentDocumentBlob && !isUploading && uploadStatus === 'idle' && (
                                                        <button
                                                            onClick={() => setShowDeleteConfirmation(true)}
                                                            className="p-1 text-red-400 hover:text-red-600"
                                                            title="Delete document"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {!isUploading && uploadStatus === 'idle' && (
                                                        <label className="cursor-pointer p-1 text-blue-400 hover:text-blue-600">
                                                            <DocumentPlusIcon className="w-4 h-4" />
                                                            <input
                                                                type="file"
                                                                accept=".pdf"
                                                                onChange={handleFileSelect}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Upload Status */}
                                            {uploadStatus !== 'idle' && (
                                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-blue-900">
                                                            {uploadStatus === 'preparing' && 'Preparing upload...'}
                                                            {uploadStatus === 'uploading' && 'Uploading document...'}
                                                            {uploadStatus === 'saving' && 'Saving to expense...'}
                                                            {uploadStatus === 'success' && 'Upload complete!'}
                                                            {uploadStatus === 'error' && 'Upload failed'}
                                                        </span>
                                                        <span className="text-sm text-blue-700">{uploadProgress}%</span>
                                                    </div>
                                                    <div className="w-full bg-blue-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${uploadProgress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* PDF Viewer */}
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            {currentDocumentBlob ? (
                                                <div className="h-[70vh] sm:h-[80vh] lg:h-[60vh]">
                                                    <PDFViewer fileBlob={currentDocumentBlob} />
                                                </div>
                                            ) : (
                                                <div className="h-96 flex items-center justify-center bg-gray-50">
                                                    <div className="text-center space-y-3">
                                                        <DocumentPlusIcon className="w-12 h-12 text-gray-300 mx-auto" />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-500">
                                                                No document
                                                            </p>
                                                            <p className="text-xs text-gray-400">
                                                                Upload a PDF to view it here
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expense Form Section */}
                            <div>
                                <div className="bg-white shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-6">Expense Details</h3>

                                        <ExpenseForm
                                            key={`expense-form-${expenseId}`} // Stable key based on expense ID
                                            initialData={initialData}
                                            onSubmit={handleSubmit}
                                            loading={submitting}
                                            submitButtonText="Update Expense"
                                            hideSubmitButton={true}
                                            onValidationChange={handleValidationChange}
                                        />

                                        {/* Action Buttons */}
                                        <div className="pt-6 mt-6 border-t border-gray-200">
                                            <div className="flex flex-col sm:flex-row justify-end gap-3">
                                                {/* Cancel Button */}
                                                <button
                                                    onClick={handleCancel}
                                                    disabled={submitting}
                                                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Cancel
                                                </button>

                                                {/* Update Button */}
                                                <button
                                                    onClick={handleFormSubmit}
                                                    disabled={submitting || !isFormValid}
                                                    className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                                                >
                                                    {submitting && (
                                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                    )}
                                                    {submitting ? 'Updating...' : 'Update Expense'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>

            <SimpleDialog
                show={showDeleteConfirmation}
                onClose={() => setShowDeleteConfirmation(false)}
                title="Delete Document"
                description="Are you sure you want to delete this document? This action cannot be undone."
                primaryButtonText="Delete"
                primaryButtonAction={handleDeleteCurrentDocument}
                secondaryButtonText="Cancel"
                loading={isDeletingDocument}
                loadingText="Deleting document..."
            />
        </>
    );
};

// Wrapper component that provides the context
const ExpenseEditPageWrapper: PageWithAuth = () => {
    const router = useRouter();
    const { id } = router.query;
    const expenseId = typeof id === 'string' ? id : '';

    if (!expenseId) {
        return null; // or loading state
    }

    return (
        <ExpenseProvider expenseId={expenseId}>
            <ExpenseEditPage expenseId={expenseId} />
        </ExpenseProvider>
    );
};

ExpenseEditPageWrapper.authenticationEnabled = true;

export default ExpenseEditPageWrapper;
