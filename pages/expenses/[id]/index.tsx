import React, { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Transition, Dialog } from '@headlessui/react';
import {
    DocumentTextIcon,
    PencilIcon,
    CalendarDaysIcon,
    CurrencyDollarIcon,
    MapPinIcon,
    TruckIcon,
    UserIcon,
    ClipboardDocumentListIcon,
    ArrowDownTrayIcon,
    ArrowTopRightOnSquareIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';

import Layout from '../../../components/layout/Layout';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import { notify } from '../../../components/notifications/Notification';
import { PageWithAuth } from '../../../interfaces/auth';
import PDFViewer from '../../../components/PDFViewer';
import ExpenseStatusBadge from '../../../components/expenses/ExpenseStatusBadge';
import ExpensePaidByBadge from '../../../components/expenses/ExpensePaidByBadge';
import ExpenseActionMenu from '../../../components/expenses/ExpenseActionMenu';
import SimpleDialog from '../../../components/dialogs/SimpleDialog';
import { ExpenseProvider, useExpenseContext } from '../../../components/context/ExpenseContext';
import { ExpandedExpense } from '../../../interfaces/models';
import {
    approveExpense,
    rejectExpense,
    resetExpenseStatus,
    deleteExpense,
    getExpenseStatusInfo,
} from '../../../lib/expenses/expense-operations';

interface Expense {
    id: string;
    carrierId: string;
    loadId?: string;
    driverId?: string;
    userId?: string;
    equipmentId?: string;
    categoryId: string;
    amount: number;
    currencyCode?: string;
    paidBy: 'COMPANY' | 'DRIVER';
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    description?: string;
    vendorName?: string;
    receiptDate: string;
    createdAt: string;
    updatedAt: string;
    category: {
        id: string;
        name: string;
        group: string;
    };
    load?: {
        id: string;
        refNum: string;
        loadNum: string;
        shipper?: {
            id: string;
            name: string;
            city: string;
            state: string;
        };
        receiver?: {
            id: string;
            name: string;
            city: string;
            state: string;
        };
    };
    driver?: {
        id: string;
        name: string;
    };
    user?: {
        id: string;
        name: string;
    };
    equipment?: {
        id: string;
        name: string;
        type: string;
        equipmentNumber?: string;
        make?: string;
        model?: string;
    };
    documents: Array<{
        id: string;
        expenseId: string;
        documentId: string;
        document: {
            id: string;
            fileName: string;
            mimeType: string;
            sizeBytes: number;
            storageUrl: string;
            uploadedBy: string;
            uploadedAt: string;
        };
    }>;
}

type Props = {
    expenseId: string;
};

const ExpenseDetailPage = ({ expenseId }: Props) => {
    const router = useRouter();
    const { expense, loading: contextLoading, setExpense, refetch } = useExpenseContext();

    // Local state
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [currentPdfDocument, setCurrentPdfDocument] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isClearingStatus, setIsClearingStatus] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
    const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
    const [clearStatusDialogOpen, setClearStatusDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        // Load PDF if available when expense loads
        if (expense?.documents?.length) {
            // Look for PDF documents in the junction table structure
            const pdfDoc = expense.documents.find((docRelation: any) => {
                // Check if there's a nested document with PDF mime type
                if (docRelation.document?.mimeType === 'application/pdf') {
                    return true;
                }
                // Check if the document filename suggests PDF
                if (docRelation.document?.fileName?.toLowerCase().endsWith('.pdf')) {
                    return true;
                }
                // Fallback: check direct properties (for backward compatibility)
                if (docRelation.mimeType === 'application/pdf') {
                    return true;
                }
                if (docRelation.fileName?.toLowerCase().endsWith('.pdf')) {
                    return true;
                }

                return false;
            });

            if (pdfDoc) {
                // Store the document information for display
                setCurrentPdfDocument(pdfDoc);

                // Get storage path from the nested document structure
                const storagePath = pdfDoc.document?.storageUrl;

                if (storagePath) {
                    loadPDF(storagePath);
                } else {
                }
            } else {
                console.warn('No PDF document found in documents array');
            }
        }
    }, [expense]);

    const loadPDF = async (storagePathOrUrl: string) => {
        try {
            let response;
            // Check if it's a full URL (Google Cloud Storage URL) or just a path
            if (storagePathOrUrl.startsWith('http')) {
                // It's a full URL, fetch directly
                response = await fetch(storagePathOrUrl);
            } else {
                // It's a path, use the download API
                response = await fetch(`/api/documents/download?path=${encodeURIComponent(storagePathOrUrl)}`);
            }

            if (response.ok) {
                const blob = await response.blob();

                if (blob.type === 'application/pdf' || blob.size > 0) {
                    setPdfBlob(blob);
                } else {
                    console.warn('Downloaded file is not a valid PDF:', blob.type, blob.size);
                }
            } else {
                // Try to get error details
                const errorText = await response.text();
            }
        } catch (error) {}
    };

    const handleApprove = async () => {
        try {
            setIsApproving(true);
            const updatedExpense = await approveExpense(expenseId);
            setExpense(updatedExpense);
            notify({ title: 'Expense approved successfully', type: 'success' });
        } catch (error) {
            console.error('Error approving expense:', error);
            notify({ title: error instanceof Error ? error.message : 'Failed to approve expense', type: 'error' });
        } finally {
            setIsApproving(false);
            setApprovalDialogOpen(false);
        }
    };

    const handleReject = async () => {
        const trimmedReason = rejectionReason.trim();

        try {
            setIsRejecting(true);
            const updatedExpense = await rejectExpense(expenseId, trimmedReason);
            setExpense(updatedExpense);
            notify({ title: 'Expense rejected successfully', type: 'success' });
        } catch (error) {
            notify({ title: error instanceof Error ? error.message : 'Failed to reject expense', type: 'error' });
        } finally {
            setIsRejecting(false);
            setRejectionDialogOpen(false);
            setRejectionReason(''); // Clear the reason after rejection
        }
    };

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await deleteExpense(expenseId);
            notify({ title: 'Expense deleted successfully', type: 'success' });
            router.push('/expenses');
        } catch (error) {
            notify({ title: error instanceof Error ? error.message : 'Failed to delete expense', type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClearStatus = async () => {
        try {
            setIsClearingStatus(true);
            const updatedExpense = await resetExpenseStatus(expenseId);
            setExpense(updatedExpense);
            notify({ title: 'Expense status reset to pending', type: 'success' });
        } catch (error) {
            notify({ title: error instanceof Error ? error.message : 'Failed to clear expense status', type: 'error' });
        } finally {
            setIsClearingStatus(false);
            setClearStatusDialogOpen(false);
        }
    };

    const formatCurrency = (amount: number, currencyCode?: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode || 'USD',
        }).format(amount);
    };

    const formatDate = (dateString: string | null | undefined) => {
        // Handle null, undefined, or empty string
        if (!dateString) {
            return 'No date set';
        }

        try {
            // Parse the date string and create a date in local timezone to avoid off-by-one issues
            const [year, month, day] = dateString.split('T')[0].split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

            // Check if the date is valid
            if (isNaN(date.getTime())) {
                return 'Invalid date';
            }

            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch (error) {
            return 'Invalid date';
        }
    };

    const getFullAddress = () => {
        if (!expense) return '';

        const parts = [];
        if (expense.street) parts.push(expense.street);
        if (expense.city) parts.push(expense.city);
        if (expense.state) parts.push(expense.state);
        if (expense.postalCode) parts.push(expense.postalCode);
        if (expense.country) parts.push(expense.country);

        // If only country exists, don't show location
        if (
            parts.length === 1 &&
            expense.country &&
            !expense.street &&
            !expense.city &&
            !expense.state &&
            !expense.postalCode
        ) {
            return '';
        }

        return parts.join(', ');
    };

    const getPaidByDisplay = (paidBy: 'COMPANY' | 'DRIVER') => {
        return paidBy === 'COMPANY' ? 'Company' : 'Driver';
    };

    const handleDownloadPDF = () => {
        if (pdfBlob && currentPdfDocument) {
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentPdfDocument.document?.fileName || 'expense-document.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const handleViewInNewTab = () => {
        if (pdfBlob) {
            const url = URL.createObjectURL(pdfBlob);
            const newWindow = window.open(url, '_blank');
            if (newWindow) {
                newWindow.onload = () => {
                    URL.revokeObjectURL(url);
                };
            }
        }
    };

    const getFileName = () => {
        if (currentPdfDocument?.document?.fileName) {
            return currentPdfDocument.document.fileName;
        }
        return 'Document';
    };

    const getFileSize = () => {
        if (currentPdfDocument?.document?.sizeBytes) {
            const sizeInMB = (currentPdfDocument.document.sizeBytes / 1024 / 1024).toFixed(1);
            return `${sizeInMB} MB`;
        }
        return '';
    };

    if (contextLoading) {
        return (
            <Layout
                smHeaderComponent={
                    <div className="flex items-center">
                        <h1 className="flex-1 text-xl font-semibold text-gray-900">Loading...</h1>
                    </div>
                }
            >
                {/* Main content container */}
                <div className="px-4 py-6 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Breadcrumb skeleton */}
                        <div className="mb-0 md:mb-6 animate-pulse">
                            <div className="flex items-center space-x-2">
                                <div className="h-4 bg-slate-200 rounded w-20"></div>
                                <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                <div className="h-4 bg-slate-200 rounded w-16"></div>
                                <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                <div className="h-4 bg-slate-200 rounded w-24"></div>
                            </div>
                        </div>

                        {/* Header Section skeleton */}
                        <div className="bg-white shadow rounded-lg mb-6 animate-pulse">
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
                                            <div className="h-4 bg-slate-200 rounded w-64"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="h-10 bg-slate-200 rounded-lg w-16"></div>
                                        <div className="h-10 bg-slate-200 rounded-lg w-10"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Grid skeleton */}
                        <div className="grid grid-cols-1 lg:grid-cols-[9fr_11fr] gap-6 animate-pulse">
                            {/* PDF Viewer Section skeleton - Sticky */}
                            <div className="sticky top-4 self-start">
                                <div className="bg-white shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        {/* File header skeleton */}
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="w-5 h-5 bg-slate-200 rounded mr-2"></div>
                                                    <div>
                                                        <div className="h-4 bg-slate-200 rounded w-32 mb-1"></div>
                                                        <div className="h-3 bg-slate-200 rounded w-16"></div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-4 h-4 bg-slate-200 rounded"></div>
                                                    <div className="w-4 h-4 bg-slate-200 rounded"></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* PDF viewer skeleton */}
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <div className="h-[70vh] sm:h-[80vh] lg:h-[60vh] bg-slate-200"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expense Details Section skeleton */}
                            <div>
                                <div className="bg-white shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <div className="h-6 bg-slate-200 rounded w-40 mb-6"></div>

                                        {/* Amount and Status skeleton */}
                                        <div className="text-center mb-6 pb-6 border-b border-gray-200">
                                            <div className="h-10 bg-slate-200 rounded w-32 mx-auto mb-2"></div>
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                                                <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                                            </div>
                                        </div>

                                        {/* Details grid skeleton */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {[...Array(8)].map((_, i) => (
                                                <div key={i}>
                                                    <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
                                                    <div className="h-5 bg-slate-200 rounded w-32"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
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
                        <h1 className="flex-1 text-xl font-semibold text-gray-900">Expense Not Found</h1>
                    </div>
                }
            >
                <div className="relative overflow-hidden mb-8 min-h-screen">
                    <div className="px-4 py-8 sm:px-6 lg:px-8">
                        <div className="max-w-7xl mx-auto">
                            <div className="relative overflow-hidden bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/40 shadow-2xl shadow-black/[0.03] p-12">
                                <div className="text-center space-y-6">
                                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
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
                                    <div>
                                        <h2 className="text-3xl font-light text-gray-900 tracking-wide">
                                            Expense Not Found
                                        </h2>
                                        <p className="mt-3 text-lg text-gray-600 font-light">
                                            The expense you&apos;re looking for doesn&apos;t exist or has been deleted.
                                        </p>
                                    </div>
                                    <div className="pt-4">
                                        <Link
                                            href="/expenses"
                                            className="group relative inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl border border-blue-400/50 hover:border-blue-300/60 focus:ring-2 focus:ring-blue-400/40 focus:ring-offset-2 focus:ring-offset-white/50 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                            <span className="relative">Back to Expenses</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">
                        {expense ? `Expense Details` : 'Expense'}
                    </h1>
                </div>
            }
        >
            {/* Main content container */}
            <div className="px-4 py-6 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="mb-0 md:mb-6">
                        <BreadCrumb
                            paths={[
                                { label: 'Dashboard', href: '/' },
                                { label: 'Expenses', href: '/expenses' },
                                { label: 'Expense Details' },
                            ]}
                        />
                    </div>

                    {/* Header Section */}
                    <div className="bg-white shadow rounded-lg mb-6">
                        <div className="px-4 py-5 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Expense Details</h1>

                                    {/* Status badges */}
                                    {expense && (
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="inline-flex items-center px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-200/50 shadow-sm">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 flex-shrink-0"></div>
                                                <span className="text-sm font-medium text-blue-700 whitespace-nowrap">
                                                    {expense.category.name}
                                                </span>
                                            </div>
                                            <ExpenseStatusBadge status={expense.approvalStatus} />
                                            <div className="inline-flex items-center px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-200/50 shadow-sm">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 flex-shrink-0"></div>
                                                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                                    {formatCurrency(Number(expense.amount), expense.currencyCode)}
                                                </span>
                                            </div>
                                            {expense.driverInvoiceId && (
                                                <div className="inline-flex items-center px-2.5 py-1 bg-orange-50 rounded-lg border border-orange-200/50 shadow-sm">
                                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5 flex-shrink-0"></div>
                                                    <span className="text-sm font-medium text-orange-700 whitespace-nowrap">
                                                        Attached to Invoice
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {expense &&
                                    (() => {
                                        const isProcessing =
                                            isApproving || isRejecting || isClearingStatus || isDeleting;
                                        const isAttachedToInvoice = expense.driverInvoiceId != null;
                                        const isEditDisabled = isProcessing || isAttachedToInvoice;

                                        return (
                                            <div className="mt-4 sm:mt-0 flex gap-2 flex-shrink-0 justify-end">
                                                {/* Edit Button - Apple Style */}
                                                {isEditDisabled ? (
                                                    <div
                                                        className="relative inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-b from-gray-400 to-gray-500 rounded-xl border border-gray-300/20 cursor-not-allowed opacity-75 group"
                                                        title={
                                                            isAttachedToInvoice
                                                                ? 'Cannot edit expense that is attached to a driver invoice'
                                                                : 'Edit is currently disabled'
                                                        }
                                                    >
                                                        <PencilIcon className="w-4 h-4 mr-2" />
                                                        <span>Edit</span>
                                                        {/* Enhanced Tooltip */}
                                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                                            {isAttachedToInvoice
                                                                ? 'Cannot edit expense attached to driver invoice'
                                                                : 'Edit is currently disabled'}
                                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Link
                                                        href={`/expenses/${expense.id}/edit`}
                                                        className="group relative inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl border border-blue-400/20 hover:border-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 focus:ring-offset-white/50 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 active:scale-[0.98]"
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                                        <PencilIcon className="w-4 h-4 mr-2 relative z-10" />
                                                        <span className="relative z-10">Edit</span>
                                                    </Link>
                                                )}

                                                {/* Actions Dropdown */}
                                                <ExpenseActionMenu
                                                    expense={expense}
                                                    onEdit={(id) => router.push(`/expenses/${id}/edit`)}
                                                    onApprove={() => setApprovalDialogOpen(true)}
                                                    onReject={() => {
                                                        setRejectionReason(''); // Clear any previous reason
                                                        setRejectionDialogOpen(true);
                                                    }}
                                                    onClearStatus={() => setClearStatusDialogOpen(true)}
                                                    onDelete={() => setDeleteDialogOpen(true)}
                                                    size="medium"
                                                    isApproving={isApproving}
                                                    isRejecting={isRejecting}
                                                    isClearingStatus={isClearingStatus}
                                                    isDeleting={isDeleting}
                                                />
                                            </div>
                                        );
                                    })()}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-[9fr_11fr] gap-6">
                        {/* PDF Viewer Section - 45% - Sticky on lg+ screens only */}
                        <div className="lg:sticky lg:top-4 self-start">
                            <div className="bg-white shadow rounded-lg">
                                <div className="px-4 py-5 sm:p-6">
                                    {pdfBlob && currentPdfDocument && (
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <DocumentTextIcon className="w-5 h-5 text-blue-600 mr-2" />
                                                    <div>
                                                        <h3 className="text-sm font-medium text-gray-900">
                                                            {getFileName()}
                                                        </h3>
                                                        {getFileSize() && (
                                                            <p className="text-xs text-gray-500">{getFileSize()}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={handleDownloadPDF}
                                                        className="p-1 text-gray-400 hover:text-gray-600"
                                                        title="Download file"
                                                    >
                                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={handleViewInNewTab}
                                                        className="p-1 text-gray-400 hover:text-gray-600"
                                                        title="Open in new tab"
                                                    >
                                                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        {pdfBlob ? (
                                            <div className="min-h-[400px] max-h-[calc(100vh-200px)] h-auto">
                                                <PDFViewer fileBlob={pdfBlob} />
                                            </div>
                                        ) : (
                                            <div className="h-96 flex items-center justify-center text-gray-400 bg-gray-50">
                                                <div className="text-center">
                                                    <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                                    <p className="text-sm font-medium text-gray-500">No document</p>
                                                    <p className="text-xs text-gray-400">Upload a receipt</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Expense Details Section - 55% */}
                        <div>
                            <div className="bg-white shadow rounded-lg">
                                <div className="px-4 py-5 sm:p-6">
                                    <h2 className="text-lg font-medium text-gray-900 mb-6">Expense Information</h2>

                                    {/* Amount and Status */}
                                    <div className="text-center mb-6 pb-6 border-b border-gray-200">
                                        <div className="text-3xl font-bold text-gray-900 mb-2">
                                            {formatCurrency(Number(expense.amount), expense.currencyCode)}
                                        </div>
                                        <div className="flex items-center justify-center gap-2">
                                            <ExpenseStatusBadge status={expense.approvalStatus} />
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {getPaidByDisplay(expense.paidBy)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Date</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {formatDate(
                                                    expense.receiptDate instanceof Date
                                                        ? expense.receiptDate.toISOString()
                                                        : expense.receiptDate,
                                                )}
                                            </dd>
                                        </div>

                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Category</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {expense.category.name}
                                                <span className="text-gray-500 text-xs ml-1">
                                                    ({expense.category.group})
                                                </span>
                                            </dd>
                                        </div>

                                        {expense.vendorName && (
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Vendor</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{expense.vendorName}</dd>
                                            </div>
                                        )}

                                        {expense.description && (
                                            <div className="sm:col-span-2">
                                                <dt className="text-sm font-medium text-gray-500">Description</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{expense.description}</dd>
                                            </div>
                                        )}

                                        {getFullAddress() && (
                                            <div className="sm:col-span-2">
                                                <dt className="text-sm font-medium text-gray-500">Location</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{getFullAddress()}</dd>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Information */}
                                    {(() => {
                                        const statusInfo = getExpenseStatusInfo(expense);
                                        return (
                                            <div className="mt-6 pt-6 border-t border-gray-200">
                                                <h3 className="text-sm font-medium text-gray-500 mb-4">
                                                    Approval Status
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="flex items-center space-x-3">
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                statusInfo.statusColor === 'green'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : statusInfo.statusColor === 'red'
                                                                    ? 'bg-red-100 text-red-800'
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                            }`}
                                                        >
                                                            {statusInfo.statusText}
                                                        </span>
                                                        {statusInfo.actionBy && (
                                                            <span className="text-sm text-gray-600">
                                                                by {statusInfo.actionBy}
                                                            </span>
                                                        )}
                                                        {statusInfo.actionAt && (
                                                            <span className="text-sm text-gray-500">
                                                                on{' '}
                                                                {formatDate(
                                                                    statusInfo.actionAt instanceof Date
                                                                        ? statusInfo.actionAt.toISOString()
                                                                        : statusInfo.actionAt,
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {statusInfo.reason && (
                                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                            <div className="flex">
                                                                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                                                                <div className="ml-3">
                                                                    <h4 className="text-sm font-medium text-red-800">
                                                                        Rejection Reason
                                                                    </h4>
                                                                    <p className="mt-1 text-sm text-red-700">
                                                                        {statusInfo.reason}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Associations */}
                                    {(expense.load || expense.driver || expense.equipment || expense.user) && (
                                        <div className="mt-6 pt-6 border-t border-gray-200">
                                            <h3 className="text-sm font-medium text-gray-500 mb-4">Associated Items</h3>
                                            <div className="space-y-3">
                                                {/* Load */}
                                                {expense.load && (
                                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                                        <div className="flex items-center">
                                                            <TruckIcon className="w-4 h-4 text-blue-600 mr-2" />
                                                            <Link
                                                                href={`/loads/${expense.load.id}`}
                                                                className="text-sm font-medium text-blue-900 hover:underline"
                                                            >
                                                                Load {expense.load.refNum}
                                                            </Link>
                                                        </div>
                                                        <span className="text-xs text-blue-600">
                                                            #{expense.load.loadNum}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Driver */}
                                                {expense.driver && (
                                                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                                                        <UserIcon className="w-4 h-4 text-green-600 mr-2" />
                                                        <Link
                                                            href={`/drivers/${expense.driver.id}`}
                                                            className="text-sm font-medium text-green-900 hover:underline"
                                                        >
                                                            {expense.driver.name}
                                                        </Link>
                                                    </div>
                                                )}

                                                {/* Equipment */}
                                                {expense.equipment && (
                                                    <div className="flex items-center p-3 bg-orange-50 rounded-lg">
                                                        <TruckIcon className="w-4 h-4 text-orange-600 mr-2" />
                                                        <Link
                                                            href={`/equipments/${expense.equipment.id}`}
                                                            className="text-sm font-medium text-orange-900 hover:underline"
                                                        >
                                                            {expense.equipment.equipmentNumber ||
                                                                `${expense.equipment.make} ${expense.equipment.model}`}
                                                            {expense.equipment.equipmentNumber &&
                                                                ` #${expense.equipment.equipmentNumber}`}
                                                        </Link>
                                                    </div>
                                                )}

                                                {/* Created By */}
                                                {expense.user && (
                                                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                                        <UserIcon className="w-4 h-4 text-gray-600 mr-2" />
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {expense.user.name}
                                                            </span>
                                                            <span className="text-xs text-gray-500 ml-2">
                                                                Created this expense
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <SimpleDialog
                show={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                title="Delete Expense"
                description="Are you sure you want to delete this expense? This action cannot be undone."
                primaryButtonText={isDeleting ? 'Deleting...' : 'Delete'}
                primaryButtonAction={handleDelete}
                primaryButtonColor="bg-red-600 hover:bg-red-700"
                secondaryButtonText="Cancel"
                secondaryButtonAction={() => setDeleteDialogOpen(false)}
            />

            {/* Approval Confirmation Dialog */}
            <SimpleDialog
                show={approvalDialogOpen}
                onClose={() => setApprovalDialogOpen(false)}
                title="Approve Expense"
                description="Are you sure you want to approve this expense?"
                primaryButtonText="Approve"
                primaryButtonAction={handleApprove}
                primaryButtonColor="bg-green-600 hover:bg-green-700"
                secondaryButtonText="Cancel"
                secondaryButtonAction={() => setApprovalDialogOpen(false)}
            />

            {/* Rejection Confirmation Dialog */}
            <Transition appear show={rejectionDialogOpen} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-10"
                    onClose={() => {
                        if (!isRejecting) {
                            setRejectionDialogOpen(false);
                            setRejectionReason('');
                        }
                    }}
                >
                    <Transition.Child
                        as={Fragment}
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
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <div className="flex items-center">
                                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <ExclamationTriangleIcon
                                                className="h-6 w-6 text-red-600"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <div className="ml-4">
                                            <Dialog.Title
                                                as="h3"
                                                className="text-lg font-medium leading-6 text-gray-900"
                                            >
                                                Reject Expense
                                            </Dialog.Title>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-4">
                                        <p className="text-sm text-gray-600">
                                            Are you sure you want to reject this expense? You can optionally provide a
                                            reason for rejection.
                                        </p>
                                        <div>
                                            <label
                                                htmlFor="rejection-reason"
                                                className="block text-sm font-medium text-gray-700 mb-2"
                                            >
                                                Reason for rejection (optional)
                                            </label>
                                            <textarea
                                                id="rejection-reason"
                                                rows={4}
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                placeholder="Optionally explain why this expense is being rejected..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                                                disabled={isRejecting}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={() => {
                                                setRejectionDialogOpen(false);
                                                setRejectionReason('');
                                            }}
                                            disabled={isRejecting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={handleReject}
                                            disabled={isRejecting || rejectionReason.trim().length === 0}
                                        >
                                            {isRejecting ? 'Rejecting...' : 'Reject'}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Clear Status Confirmation Dialog */}
            <SimpleDialog
                show={clearStatusDialogOpen}
                onClose={() => setClearStatusDialogOpen(false)}
                title="Clear Expense Status"
                description="Are you sure you want to reset this expense status to pending? This will clear any approval or rejection information."
                primaryButtonText="Clear Status"
                primaryButtonAction={handleClearStatus}
                primaryButtonColor="bg-yellow-600 hover:bg-yellow-700"
                secondaryButtonText="Cancel"
                secondaryButtonAction={() => setClearStatusDialogOpen(false)}
            />
        </Layout>
    );
};

ExpenseDetailPage.authenticationEnabled = true;

// Wrapper component with ExpenseProvider
const ExpenseDetailPageWithProvider: React.FC & { authenticationEnabled?: boolean } = () => {
    const router = useRouter();
    const { id } = router.query;

    if (!id || typeof id !== 'string') {
        return <div>Loading...</div>;
    }

    return (
        <ExpenseProvider expenseId={id}>
            <ExpenseDetailPage expenseId={id} />
        </ExpenseProvider>
    );
};

ExpenseDetailPageWithProvider.authenticationEnabled = true;

export default ExpenseDetailPageWithProvider;
