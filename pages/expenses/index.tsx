import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
    ChevronDownIcon,
    PlusIcon,
    DocumentTextIcon,
    TrashIcon,
    CheckIcon,
    XMarkIcon,
    EllipsisVerticalIcon,
    ArrowPathIcon,
    ReceiptPercentIcon,
    CurrencyDollarIcon,
    ClipboardDocumentListIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import classNames from 'classnames';

import Layout from '../../components/layout/Layout';
import { notify } from '../../components/notifications/Notification';
import Pagination from '../../components/Pagination';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import HoverPopover from '../../components/HoverPopover';
import { PageWithAuth } from '../../interfaces/auth';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { useLocalStorage } from '../../lib/useLocalStorage';
import { useUserContext } from 'components/context/UserContext';
import ExpensesTable, { ExpensesTableSkeleton } from '../../components/expenses/ExpensesTable';
import ExpenseStatusBadge from '../../components/expenses/ExpenseStatusBadge';
import ExpensePaidByBadge from '../../components/expenses/ExpensePaidByBadge';
import { rejectExpense, bulkUpdateExpenseStatus, deleteExpense } from '../../lib/expenses/expense-operations';

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
    driverInvoiceId?: string;
    reimbursedAt?: string;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    approvedById?: string;
    approvedAt?: string;
    rejectionReason?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    description?: string;
    createdById?: string;
    updatedById?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    // Relations
    category: {
        id: string;
        name: string;
        group: string;
    };
    load?: {
        id: string;
        refNum: string;
        loadNum: string;
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
        equipmentNumber?: string;
        make: string;
        model?: string;
    };
    documents: {
        id: string;
        document: {
            id: string;
            fileName: string;
            mimeType: string;
            sizeBytes: number;
        };
    }[];
}

interface ExpensesResponse {
    expenses: Expense[];
    pagination: PaginationMetadata;
}

const ExpensesPage: PageWithAuth = () => {
    const router = useRouter();
    const { defaultCarrier } = useUserContext();

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(50);
    const [offset, setOffset] = useState(0);
    const [pagination, setPagination] = useState<PaginationMetadata>({
        total: 0,
        currentOffset: 0,
        currentLimit: 50,
    });

    const [sort, setSort] = useLocalStorage<Sort>('expenses-sort', {
        key: 'createdAt',
        order: 'desc',
    });

    const [lastExpensesTableLimit, setLastExpensesTableLimit] = useLocalStorage('lastExpensesTableLimit', 50);

    const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
    const selectedExpenses = new Set(selectedExpenseIds);
    const [bulkActionOpen, setBulkActionOpen] = useState(false);
    const [bulkApprovalDialogOpen, setBulkApprovalDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [expenseToReject, setExpenseToReject] = useState<string | null>(null);
    const [bulkRejectionDialogOpen, setBulkRejectionDialogOpen] = useState(false);
    const [bulkRejectionReason, setBulkRejectionReason] = useState('');
    const [bulkClearStatusDialogOpen, setBulkClearStatusDialogOpen] = useState(false);
    const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
    const [processingExpenseIds, setProcessingExpenseIds] = useState<Set<string>>(new Set());

    const [statusFilter, setStatusFilter] = useState<string>('');
    const [paidByFilter, setPaidByFilter] = useState<string>('');

    // Helper function to get selected expenses data
    const getSelectedExpensesData = () => {
        return expenses.filter((expense) => selectedExpenses.has(expense.id));
    };

    // Helper function to check if any selected expenses are invoiced
    const hasInvoicedExpenses = () => {
        const selectedExpensesData = getSelectedExpensesData();
        return selectedExpensesData.some((expense) => expense.driverInvoiceId);
    };

    // Helper function to get invoiced expenses from selection
    const getInvoicedExpenses = () => {
        const selectedExpensesData = getSelectedExpensesData();
        return selectedExpensesData.filter((expense) => expense.driverInvoiceId);
    };

    // Helper function to check if all selected expenses have the same status
    const getSelectedExpensesStatus = () => {
        const selectedExpensesData = getSelectedExpensesData();
        if (selectedExpensesData.length === 0) return null;

        const firstStatus = selectedExpensesData[0].approvalStatus;
        const allSameStatus = selectedExpensesData.every((expense) => expense.approvalStatus === firstStatus);

        return allSameStatus ? firstStatus : 'MIXED';
    };

    // Helper function to check if bulk operation is allowed
    const isBulkOperationAllowed = (targetStatus: 'APPROVED' | 'REJECTED' | 'PENDING') => {
        const currentStatus = getSelectedExpensesStatus();
        if (currentStatus === 'MIXED') return false;

        // Check if any selected expenses are invoiced
        if (hasInvoicedExpenses()) return false;

        // Can't approve already approved expenses, can't reject already rejected expenses, etc.
        return currentStatus !== targetStatus;
    };

    // Helper function to get the reason why bulk operation is not allowed
    const getBulkOperationDisabledReason = (targetStatus: 'APPROVED' | 'REJECTED' | 'PENDING') => {
        const currentStatus = getSelectedExpensesStatus();
        const hasInvoiced = hasInvoicedExpenses();
        const invoicedCount = getInvoicedExpenses().length;
        const selectedCount = selectedExpenseIds.length;

        if (hasInvoiced) {
            return `${invoicedCount} of ${selectedCount} selected expenses are linked to driver invoices and cannot be modified`;
        }

        if (currentStatus === 'MIXED') {
            return 'Cannot perform bulk operations on expenses with different statuses';
        }

        if (currentStatus === targetStatus) {
            const statusName = targetStatus.toLowerCase();
            return `Selected expenses are already ${statusName}`;
        }

        return null;
    };

    // Handler function for clearing selections
    const handleClearSelection = (event?: React.MouseEvent) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        setSelectedExpenseIds([]);
    };

    const fetchExpenses = async (params: any = {}) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                limit: params.limit?.toString() || limit.toString(),
                offset: params.offset?.toString() || offset.toString(),
                ...(sort?.key && { sortBy: sort.key }),
                ...(sort?.order && { sortOrder: sort.order }),
                ...(statusFilter && { status: statusFilter }),
                ...(paidByFilter && { paidBy: paidByFilter }),
                ...params,
            });

            const response = await fetch(`/api/expenses?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch expenses');

            const data: ExpensesResponse = await response.json();
            setExpenses(data.expenses);
            setPagination(data.pagination);
            setLastExpensesTableLimit(data.expenses.length !== 0 ? data.expenses.length : lastExpensesTableLimit);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            notify({ title: 'Failed to fetch expenses', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [sort, statusFilter, paidByFilter, limit, offset]);

    // Clear selections when filters change (expenses data changes)
    useEffect(() => {
        setSelectedExpenseIds([]);
    }, [statusFilter, paidByFilter, limit, offset]);

    const handleSort = (newSort: Sort) => {
        setSort(newSort);
        const query = queryFromSort(newSort, router.query);
        router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
    };

    const previousPage = async () => {
        if (pagination.prev) {
            // Clear selections when changing pages
            setSelectedExpenseIds([]);
            setLimit(pagination.prev.limit);
            setOffset(pagination.prev.offset);
            router.push(
                {
                    pathname: router.pathname,
                    query: queryFromPagination(pagination.prev, router.query),
                },
                undefined,
                { shallow: true },
            );
        }
    };

    const nextPage = async () => {
        if (pagination.next) {
            // Clear selections when changing pages
            setSelectedExpenseIds([]);
            setLimit(pagination.next.limit);
            setOffset(pagination.next.offset);
            router.push(
                {
                    pathname: router.pathname,
                    query: queryFromPagination(pagination.next, router.query),
                },
                undefined,
                { shallow: true },
            );
        }
    };

    const goToPage = async (page: number) => {
        // Clear selections when changing pages
        setSelectedExpenseIds([]);

        // Calculate offset based on page number
        const newOffset = (page - 1) * limit;
        setOffset(newOffset);

        const query = {
            ...router.query,
            offset: newOffset.toString(),
            limit: limit.toString(),
        };

        router.push(
            {
                pathname: router.pathname,
                query,
            },
            undefined,
            { shallow: true },
        );
    };

    const handleDeleteExpense = async (expenseId: string) => {
        try {
            await deleteExpense(expenseId);

            notify({ title: 'Expense deleted successfully', type: 'success' });

            // Remove the expense from local state instead of refetching all data
            setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId));

            // Update pagination total count
            setPagination((prev) => ({
                ...prev,
                total: prev.total - 1,
            }));

            // Clear selection if the deleted expense was selected
            setSelectedExpenseIds((prev) => prev.filter((id) => id !== expenseId));

            setDeleteDialogOpen(false);
            setExpenseToDelete(null);
        } catch (error) {
            console.error('Error deleting expense:', error);

            // Handle specific case where expense is linked to driver invoice
            if (error instanceof Error && error.message.includes('linked to a driver invoice')) {
                notify({
                    title: 'Cannot delete expense - linked to driver invoice',
                    type: 'error',
                });
            } else {
                notify({
                    title: error instanceof Error ? error.message : 'Failed to delete expense',
                    type: 'error',
                });
            }
            setDeleteDialogOpen(false);
            setExpenseToDelete(null);
        }
    };

    const handleRejectExpense = async (expenseId: string, reason?: string) => {
        try {
            await rejectExpense(expenseId, reason);

            // Refresh the entire list to get updated data
            await fetchExpenses();

            notify({ title: 'Expense rejected successfully', type: 'success' });
            setRejectionDialogOpen(false);
            setExpenseToReject(null);
            setRejectionReason('');
        } catch (error) {
            console.error('Error rejecting expense:', error);
            notify({
                title: error instanceof Error ? error.message : 'Failed to reject expense',
                type: 'error',
            });
        }
    };

    const handleBulkApproval = async (status: 'APPROVED' | 'REJECTED' | 'PENDING', reason?: string) => {
        const expenseIdsArray = selectedExpenseIds; // Use selectedExpenseIds directly since it's already an array

        setBulkOperationLoading(true);
        try {
            const result = await bulkUpdateExpenseStatus({
                expenseIds: expenseIdsArray,
                status,
                rejectionReason: status === 'REJECTED' ? reason : undefined,
            });

            // Update only the local state - no need to refetch all expenses
            setExpenses((prev) =>
                prev.map((expense) =>
                    expenseIdsArray.includes(expense.id)
                        ? {
                              ...expense,
                              approvalStatus: status,
                              ...(status === 'APPROVED'
                                  ? {
                                        rejectionReason: undefined,
                                        approvedAt: new Date().toISOString(),
                                    }
                                  : {}),
                              ...(status === 'REJECTED'
                                  ? {
                                        rejectionReason: reason || '',
                                        approvedAt: undefined,
                                        approvedById: undefined,
                                    }
                                  : {}),
                              ...(status === 'PENDING'
                                  ? {
                                        rejectionReason: undefined,
                                        approvedAt: undefined,
                                        approvedById: undefined,
                                    }
                                  : {}),
                          }
                        : expense,
                ),
            );

            const statusText = status === 'PENDING' ? 'reset to pending' : status.toLowerCase();
            notify({ title: `Expenses ${statusText} successfully`, type: 'success' });
            setSelectedExpenseIds([]);
            setBulkActionOpen(false);
            setBulkApprovalDialogOpen(false);
            setBulkRejectionDialogOpen(false);
            setBulkClearStatusDialogOpen(false);
            setBulkRejectionReason('');
        } catch (error) {
            console.error('Error updating expenses:', error);
            notify({ title: 'Failed to update expenses', type: 'error' });
        } finally {
            setBulkOperationLoading(false);
        }
    };

    const handleBulkApprovalConfirm = async () => {
        setBulkOperationLoading(true);
        setProcessingExpenseIds(new Set(selectedExpenseIds));
        setBulkApprovalDialogOpen(false);

        try {
            await handleBulkApproval('APPROVED');
        } finally {
            setBulkOperationLoading(false);
            setProcessingExpenseIds(new Set());
        }
    };

    const handleBulkRejectConfirm = async () => {
        if (!bulkRejectionReason.trim()) {
            // Allow empty reason since it's optional
        }

        setBulkOperationLoading(true);
        setProcessingExpenseIds(new Set(selectedExpenseIds));
        setBulkRejectionDialogOpen(false);

        // Store the reason before clearing it
        const reasonToSend = bulkRejectionReason;
        setBulkRejectionReason('');

        try {
            await handleBulkApproval('REJECTED', reasonToSend);
        } finally {
            setBulkOperationLoading(false);
            setProcessingExpenseIds(new Set());
        }
    };

    const handleBulkDelete = async () => {
        setBulkOperationLoading(true);
        setProcessingExpenseIds(new Set(selectedExpenseIds));
        setBulkDeleteDialogOpen(false);

        try {
            const response = await fetch('/api/expenses/bulk-delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    expenseIds: selectedExpenseIds,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();

                // Handle specific case where some expenses are linked to driver invoices
                if (response.status === 400 && errorData.error?.includes('linked to driver invoices')) {
                    const invoicedCount = errorData.details?.count || 0;
                    notify({
                        title: `Cannot delete ${invoicedCount} expense${
                            invoicedCount !== 1 ? 's' : ''
                        } - linked to driver invoices`,
                        type: 'error',
                    });
                    setSelectedExpenseIds([]);
                    return;
                }

                throw new Error(errorData.error || 'Failed to delete expenses');
            }

            notify({ title: 'Expenses deleted successfully', type: 'success' });

            // Remove deleted expenses from local state instead of refetching all data
            setExpenses((prev) => prev.filter((expense) => !selectedExpenseIds.includes(expense.id)));

            // Update pagination total count
            setPagination((prev) => ({
                ...prev,
                total: prev.total - selectedExpenseIds.length,
            }));

            setSelectedExpenseIds([]);
        } catch (error) {
            console.error('Error deleting expenses:', error);
            notify({ title: 'Failed to delete expenses', type: 'error' });
        } finally {
            setBulkOperationLoading(false);
            setProcessingExpenseIds(new Set());
        }
    };

    const formatCurrency = (amount: number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        // Parse the date string and create a date in local timezone to avoid off-by-one issues
        const [year, month, day] = dateString.split('T')[0].split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Expense Management</h1>
                    <div className="flex items-center space-x-2">
                        {selectedExpenseIds.length > 0 && (
                            <HoverPopover
                                trigger={
                                    <button
                                        type="button"
                                        onClick={() => setBulkApprovalDialogOpen(true)}
                                        disabled={!isBulkOperationAllowed('APPROVED') || bulkOperationLoading}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <CheckIcon className="w-3 h-3 mr-1" />
                                        Approve ({selectedExpenseIds.length})
                                    </button>
                                }
                                content={
                                    !isBulkOperationAllowed('APPROVED') && !bulkOperationLoading ? (
                                        <div className="text-sm text-gray-700">
                                            {getBulkOperationDisabledReason('APPROVED')}
                                        </div>
                                    ) : null
                                }
                            />
                        )}
                        {selectedExpenseIds.length > 0 &&
                            (hasInvoicedExpenses() ? (
                                <HoverPopover
                                    trigger={
                                        <div className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-purple-600 opacity-50 cursor-not-allowed">
                                            <ClipboardDocumentListIcon className="w-3 h-3 mr-1" />
                                            Review ({selectedExpenseIds.length})
                                        </div>
                                    }
                                    content={
                                        <div className="text-sm text-gray-700">
                                            {getBulkOperationDisabledReason('PENDING')}
                                        </div>
                                    }
                                />
                            ) : (
                                <Link href="/review">
                                    <button
                                        type="button"
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                    >
                                        <ClipboardDocumentListIcon className="w-3 h-3 mr-1" />
                                        Review ({selectedExpenseIds.length})
                                    </button>
                                </Link>
                            ))}
                        <Link href="/expenses/create">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <PlusIcon className="w-4 h-4 mr-1" />
                                Add Expense
                            </button>
                        </Link>
                    </div>
                </div>
            }
        >
            <>
                {/* Responsive Mobile-First Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
                    {/* Background Elements */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-blue-700/95 to-indigo-800/90"></div>
                    <div className="absolute inset-0">
                        <div className="absolute top-0 left-1/4 w-16 h-16 xs:w-24 xs:h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 right-1/4 w-12 h-12 xs:w-16 xs:h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-48 lg:h-48 bg-white/5 rounded-full blur-3xl"></div>
                    </div>

                    <div className="relative max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
                        {/* Mobile-First Unified Header */}
                        <div className="py-4 sm:py-5 md:py-6 lg:py-8">
                            {/* Header Top Section */}
                            <div className="flex flex-col space-y-3 sm:space-y-4 md:space-y-5">
                                {/* Title and Stats Row */}
                                <div className="flex items-center justify-between py-4">
                                    <div className="flex items-center space-x-2 sm:space-x-3">
                                        <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 bg-white/20 backdrop-blur-lg rounded-lg sm:rounded-xl border border-white/20 shadow-lg">
                                            <ReceiptPercentIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 lg:w-6 lg:h-6 text-white" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-2xl xl:text-3xl font-bold text-white tracking-tight">
                                                <span className="block md:hidden">Expenses</span>
                                                <span className="hidden md:block">Expense Management</span>
                                            </h1>
                                            <p className="text-xs sm:text-sm md:text-sm text-blue-100 leading-relaxed mt-0.5">
                                                <span className="block md:hidden">Manage expenses</span>
                                                <span className="hidden md:block">
                                                    Track and manage business expenses
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats and Action Row */}
                                    <div className="flex items-center space-x-3 sm:space-x-4">
                                        {/* Stats Section - Compact Badges */}
                                        <div className="hidden lg:flex items-center space-x-2 sm:space-x-3">
                                            {/* Total Expenses Badge */}
                                            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 px-3 py-2 sm:px-4 sm:py-2.5">
                                                <div className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-md flex-shrink-0">
                                                    <DocumentTextIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                                </div>
                                                <div className="-my-1">
                                                    <p className="text-xs sm:text-sm font-semibold text-white leading-none">
                                                        {expenses.length}
                                                    </p>
                                                    <p className="text-xs text-blue-200 leading-none mt-0.5">
                                                        <span className="block sm:hidden">Expenses</span>
                                                        <span className="hidden sm:block">Expenses</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Total Amount Badge */}
                                            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 px-3 py-2 sm:px-4 sm:py-2.5">
                                                <div className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-md flex-shrink-0">
                                                    <CurrencyDollarIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                                </div>
                                                <div className="-my-1">
                                                    <p className="text-xs sm:text-sm font-semibold text-white leading-none">
                                                        {new Intl.NumberFormat('en-US', {
                                                            style: 'currency',
                                                            currency: 'USD',
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        }).format(
                                                            expenses.reduce((sum, expense) => sum + expense.amount, 0),
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-blue-200 leading-none mt-0.5">
                                                        <span className="block sm:hidden">Amount</span>
                                                        <span className="hidden sm:block">Amount</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <Link href="/expenses/create">
                                            <button className="hidden md:inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 md:px-4 md:py-2.5 lg:px-5 lg:py-3 text-xs sm:text-sm font-semibold text-blue-700 bg-white/95 backdrop-blur-lg rounded-lg border border-white/20 shadow-lg hover:bg-white hover:shadow-xl active:scale-95 transition-all duration-200">
                                                <PlusIcon className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                                <span>Add Expense</span>
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative mt-4 sm:-mt-8 pb-24">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Content Section */}
                        <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-xl overflow-hidden mb-12">
                            <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
                                    <div className=" md:w-full w-fit">
                                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">All Expenses</h2>
                                        <p className="text-sm sm:text-base text-gray-600 mt-1">
                                            Manage your business expenses and approvals
                                        </p>
                                    </div>

                                    {/* Filter Dropdowns and Actions - Aligned Container */}
                                    <div className="flex   space-x-3 justify-end w-fit md:w-full">
                                        <div className="flex items-center gap-2 sm:gap-3 ">
                                            <Link href="/expenses/review">
                                                <button className="group relative inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] border border-blue-600/20">
                                                    <ClipboardDocumentListIcon className="w-4 h-4 mr-2 text-blue-100 group-hover:text-white transition-colors duration-200" />
                                                    <span className="relative whitespace-nowrap">Bulk Review</span>
                                                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 ml-2 text-blue-200 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
                                                </button>
                                            </Link>
                                        </div>
                                        {/* Filter Dropdowns */}
                                        <div className="flex space-x-3">
                                            <Menu as="div" className="relative">
                                                <Menu.Button className="group inline-flex items-center px-4 py-2.5 bg-white/80 backdrop-blur-lg border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md">
                                                    {statusFilter ? (
                                                        <span className="flex items-center">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mr-2">
                                                                {statusFilter === 'PENDING' && 'Pending'}
                                                                {statusFilter === 'APPROVED' && 'Approved'}
                                                                {statusFilter === 'REJECTED' && 'Rejected'}
                                                            </span>
                                                            Status
                                                        </span>
                                                    ) : (
                                                        'Status'
                                                    )}
                                                    <ChevronDownIcon className="w-4 h-4 ml-2 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                                </Menu.Button>
                                                <Transition
                                                    as={Fragment}
                                                    enter="transition ease-out duration-200"
                                                    enterFrom="transform opacity-0 scale-95 translate-y-1"
                                                    enterTo="transform opacity-100 scale-100 translate-y-0"
                                                    leave="transition ease-in duration-150"
                                                    leaveFrom="transform opacity-100 scale-100 translate-y-0"
                                                    leaveTo="transform opacity-0 scale-95 translate-y-1"
                                                >
                                                    <Menu.Items className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                                                        <div className="py-2">
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => setStatusFilter('')}
                                                                        className={classNames(
                                                                            active ? 'bg-gray-50/80' : '',
                                                                            statusFilter === ''
                                                                                ? 'bg-blue-50/80 text-blue-700 font-semibold'
                                                                                : 'text-gray-700',
                                                                            'group flex w-full items-center px-4 py-3 text-sm transition-all duration-150',
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center justify-between w-full">
                                                                            <span>All Statuses</span>
                                                                            {statusFilter === '' && (
                                                                                <CheckIcon className="w-4 h-4 text-blue-600" />
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => setStatusFilter('PENDING')}
                                                                        className={classNames(
                                                                            active ? 'bg-gray-50/80' : '',
                                                                            statusFilter === 'PENDING'
                                                                                ? 'bg-blue-50/80 text-blue-700 font-semibold'
                                                                                : 'text-gray-700',
                                                                            'group flex w-full items-center px-4 py-3 text-sm transition-all duration-150',
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center justify-between w-full">
                                                                            <div className="flex items-center">
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 mr-3">
                                                                                    Pending
                                                                                </span>
                                                                                <span>Pending</span>
                                                                            </div>
                                                                            {statusFilter === 'PENDING' && (
                                                                                <CheckIcon className="w-4 h-4 text-blue-600" />
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => setStatusFilter('APPROVED')}
                                                                        className={classNames(
                                                                            active ? 'bg-gray-50/80' : '',
                                                                            statusFilter === 'APPROVED'
                                                                                ? 'bg-blue-50/80 text-blue-700 font-semibold'
                                                                                : 'text-gray-700',
                                                                            'group flex w-full items-center px-4 py-3 text-sm transition-all duration-150',
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center justify-between w-full">
                                                                            <div className="flex items-center">
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 mr-3">
                                                                                    Approved
                                                                                </span>
                                                                                <span>Approved</span>
                                                                            </div>
                                                                            {statusFilter === 'APPROVED' && (
                                                                                <CheckIcon className="w-4 h-4 text-blue-600" />
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => setStatusFilter('REJECTED')}
                                                                        className={classNames(
                                                                            active ? 'bg-gray-50/80' : '',
                                                                            statusFilter === 'REJECTED'
                                                                                ? 'bg-blue-50/80 text-blue-700 font-semibold'
                                                                                : 'text-gray-700',
                                                                            'group flex w-full items-center px-4 py-3 text-sm transition-all duration-150',
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center justify-between w-full">
                                                                            <div className="flex items-center">
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 mr-3">
                                                                                    Rejected
                                                                                </span>
                                                                                <span>Rejected</span>
                                                                            </div>
                                                                            {statusFilter === 'REJECTED' && (
                                                                                <CheckIcon className="w-4 h-4 text-blue-600" />
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                        </div>
                                                    </Menu.Items>
                                                </Transition>
                                            </Menu>

                                            <Menu as="div" className="relative">
                                                <Menu.Button className="group inline-flex whitespace-nowrap items-center px-4 py-2.5 bg-white/80 backdrop-blur-lg border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md">
                                                    {paidByFilter ? (
                                                        <span className="flex items-center whitespace-nowrap">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 mr-2">
                                                                {paidByFilter === 'COMPANY' && 'Company'}
                                                                {paidByFilter === 'DRIVER' && 'Driver'}
                                                            </span>
                                                            Paid By
                                                        </span>
                                                    ) : (
                                                        'Paid By'
                                                    )}
                                                    <ChevronDownIcon className="w-4 h-4 ml-2 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                                </Menu.Button>
                                                <Transition
                                                    as={Fragment}
                                                    enter="transition ease-out duration-200"
                                                    enterFrom="transform opacity-0 scale-95 translate-y-1"
                                                    enterTo="transform opacity-100 scale-100 translate-y-0"
                                                    leave="transition ease-in duration-150"
                                                    leaveFrom="transform opacity-100 scale-100 translate-y-0"
                                                    leaveTo="transform opacity-0 scale-95 translate-y-1"
                                                >
                                                    <Menu.Items className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                                                        <div className="py-2">
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => setPaidByFilter('')}
                                                                        className={classNames(
                                                                            active ? 'bg-gray-50/80' : '',
                                                                            paidByFilter === ''
                                                                                ? 'bg-green-50/80 text-green-700 font-semibold'
                                                                                : 'text-gray-700',
                                                                            'group flex w-full items-center px-4 py-3 text-sm transition-all duration-150',
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center justify-between w-full">
                                                                            <span>All</span>
                                                                            {paidByFilter === '' && (
                                                                                <CheckIcon className="w-4 h-4 text-green-600" />
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => setPaidByFilter('COMPANY')}
                                                                        className={classNames(
                                                                            active ? 'bg-gray-50/80' : '',
                                                                            paidByFilter === 'COMPANY'
                                                                                ? 'bg-green-50/80 text-green-700 font-semibold'
                                                                                : 'text-gray-700',
                                                                            'group flex w-full items-center px-4 py-3 text-sm transition-all duration-150',
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center justify-between w-full">
                                                                            <div className="flex items-center">
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mr-3">
                                                                                    Company
                                                                                </span>
                                                                                <span>Company</span>
                                                                            </div>
                                                                            {paidByFilter === 'COMPANY' && (
                                                                                <CheckIcon className="w-4 h-4 text-green-600" />
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => setPaidByFilter('DRIVER')}
                                                                        className={classNames(
                                                                            active ? 'bg-gray-50/80' : '',
                                                                            paidByFilter === 'DRIVER'
                                                                                ? 'bg-green-50/80 text-green-700 font-semibold'
                                                                                : 'text-gray-700',
                                                                            'group flex w-full items-center px-4 py-3 text-sm transition-all duration-150',
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center justify-between w-full">
                                                                            <div className="flex items-center">
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mr-3">
                                                                                    Driver
                                                                                </span>
                                                                                <span>Driver</span>
                                                                            </div>
                                                                            {paidByFilter === 'DRIVER' && (
                                                                                <CheckIcon className="w-4 h-4 text-green-600" />
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                        </div>
                                                    </Menu.Items>
                                                </Transition>
                                            </Menu>
                                        </div>

                                        {/* Actions Button */}
                                        {selectedExpenses.size > 0 && (
                                            <Menu as="div" className="relative">
                                                <Menu.Button
                                                    className={`group inline-flex items-center px-4 py-2.5 bg-white/80 backdrop-blur-lg border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md ${
                                                        bulkOperationLoading ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                                    disabled={bulkOperationLoading}
                                                >
                                                    {bulkOperationLoading ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600 mr-2"></div>
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mr-2">
                                                                {selectedExpenses.size}
                                                            </span>
                                                            Actions
                                                            <ChevronDownIcon className="w-4 h-4 ml-2 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                                        </>
                                                    )}
                                                </Menu.Button>
                                                <Transition
                                                    as={Fragment}
                                                    enter="transition ease-out duration-200"
                                                    enterFrom="transform opacity-0 scale-95 translate-y-1"
                                                    enterTo="transform opacity-100 scale-100 translate-y-0"
                                                    leave="transition ease-in duration-150"
                                                    leaveFrom="transform opacity-100 scale-100 translate-y-0"
                                                    leaveTo="transform opacity-0 scale-95 translate-y-1"
                                                >
                                                    <Menu.Items className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                                                        <div className="py-2">
                                                            {(() => {
                                                                const selectedStatus = getSelectedExpensesStatus();
                                                                const selectedCount = selectedExpenses.size;
                                                                const hasInvoiced = hasInvoicedExpenses();
                                                                const invoicedCount = getInvoicedExpenses().length;

                                                                // If some expenses are invoiced, show warning and limited options
                                                                if (hasInvoiced) {
                                                                    return (
                                                                        <>
                                                                            <div className="px-4 py-2 text-xs text-orange-600 bg-orange-50 border-b border-orange-100">
                                                                                {invoicedCount} of {selectedCount}{' '}
                                                                                expenses are linked to driver invoices
                                                                                and cannot be modified
                                                                            </div>
                                                                            <Menu.Item>
                                                                                {({ active }) => (
                                                                                    <button
                                                                                        onClick={handleClearSelection}
                                                                                        className={classNames(
                                                                                            active ? 'bg-gray-50' : '',
                                                                                            'block w-full text-left px-4 py-2 text-sm text-gray-700',
                                                                                        )}
                                                                                    >
                                                                                        <div className="flex items-center">
                                                                                            <XMarkIcon className="w-4 h-4 mr-3 text-gray-600" />
                                                                                            <div>
                                                                                                <div className="font-medium">
                                                                                                    Clear Selection
                                                                                                </div>
                                                                                                <div className="text-xs text-gray-500">
                                                                                                    Clear{' '}
                                                                                                    {selectedCount}{' '}
                                                                                                    selected items
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </button>
                                                                                )}
                                                                            </Menu.Item>
                                                                        </>
                                                                    );
                                                                }

                                                                if (selectedStatus === 'MIXED') {
                                                                    return (
                                                                        <>
                                                                            <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                                                                                Mixed status selected - only clear
                                                                                operation available
                                                                            </div>
                                                                            <Menu.Item>
                                                                                {({ active }) => (
                                                                                    <button
                                                                                        onClick={handleClearSelection}
                                                                                        className={classNames(
                                                                                            active ? 'bg-gray-50' : '',
                                                                                            'block w-full text-left px-4 py-2 text-sm text-gray-700',
                                                                                        )}
                                                                                    >
                                                                                        <div className="flex items-center">
                                                                                            <XMarkIcon className="w-4 h-4 mr-3 text-gray-600" />
                                                                                            <div>
                                                                                                <div className="font-medium">
                                                                                                    Clear Selection
                                                                                                </div>
                                                                                                <div className="text-xs text-gray-500">
                                                                                                    Clear{' '}
                                                                                                    {selectedCount}{' '}
                                                                                                    selected items
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </button>
                                                                                )}
                                                                            </Menu.Item>
                                                                        </>
                                                                    );
                                                                }

                                                                return (
                                                                    <>
                                                                        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                                                                            {selectedCount}{' '}
                                                                            {selectedStatus?.toLowerCase() || 'mixed'}{' '}
                                                                            expense
                                                                            {selectedCount !== 1 ? 's' : ''} selected
                                                                        </div>

                                                                        {selectedStatus !== 'APPROVED' &&
                                                                            !hasInvoiced && (
                                                                                <Menu.Item>
                                                                                    {({ active }) => (
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setBulkApprovalDialogOpen(
                                                                                                    true,
                                                                                                );
                                                                                            }}
                                                                                            disabled={
                                                                                                !isBulkOperationAllowed(
                                                                                                    'APPROVED',
                                                                                                )
                                                                                            }
                                                                                            className={classNames(
                                                                                                active
                                                                                                    ? 'bg-gray-50'
                                                                                                    : '',
                                                                                                !isBulkOperationAllowed(
                                                                                                    'APPROVED',
                                                                                                )
                                                                                                    ? 'opacity-50 cursor-not-allowed'
                                                                                                    : '',
                                                                                                'block w-full text-left px-4 py-2 text-sm text-gray-700',
                                                                                            )}
                                                                                        >
                                                                                            <div className="flex items-center">
                                                                                                <CheckIcon className="w-4 h-4 mr-3 text-green-600" />
                                                                                                <div>
                                                                                                    <div className="font-medium">
                                                                                                        Approve Selected
                                                                                                    </div>
                                                                                                    <div className="text-xs text-gray-500">
                                                                                                        Approve{' '}
                                                                                                        {selectedCount}{' '}
                                                                                                        expenses
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </button>
                                                                                    )}
                                                                                </Menu.Item>
                                                                            )}

                                                                        {selectedStatus !== 'REJECTED' &&
                                                                            !hasInvoiced && (
                                                                                <Menu.Item>
                                                                                    {({ active }) => (
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setBulkRejectionDialogOpen(
                                                                                                    true,
                                                                                                );
                                                                                            }}
                                                                                            disabled={
                                                                                                !isBulkOperationAllowed(
                                                                                                    'REJECTED',
                                                                                                )
                                                                                            }
                                                                                            className={classNames(
                                                                                                active
                                                                                                    ? 'bg-gray-50'
                                                                                                    : '',
                                                                                                !isBulkOperationAllowed(
                                                                                                    'REJECTED',
                                                                                                )
                                                                                                    ? 'opacity-50 cursor-not-allowed'
                                                                                                    : '',
                                                                                                'block w-full text-left px-4 py-2 text-sm text-gray-700',
                                                                                            )}
                                                                                        >
                                                                                            <div className="flex items-center">
                                                                                                <XMarkIcon className="w-4 h-4 mr-3 text-red-600" />
                                                                                                <div>
                                                                                                    <div className="font-medium">
                                                                                                        Reject Selected
                                                                                                    </div>
                                                                                                    <div className="text-xs text-gray-500">
                                                                                                        Reject{' '}
                                                                                                        {selectedCount}{' '}
                                                                                                        expenses
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </button>
                                                                                    )}
                                                                                </Menu.Item>
                                                                            )}

                                                                        {(selectedStatus === 'APPROVED' ||
                                                                            selectedStatus === 'REJECTED') &&
                                                                            !hasInvoiced && (
                                                                                <Menu.Item>
                                                                                    {({ active }) => (
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setBulkClearStatusDialogOpen(
                                                                                                    true,
                                                                                                );
                                                                                            }}
                                                                                            disabled={
                                                                                                !isBulkOperationAllowed(
                                                                                                    'PENDING',
                                                                                                )
                                                                                            }
                                                                                            className={classNames(
                                                                                                active
                                                                                                    ? 'bg-gray-50'
                                                                                                    : '',
                                                                                                !isBulkOperationAllowed(
                                                                                                    'PENDING',
                                                                                                )
                                                                                                    ? 'opacity-50 cursor-not-allowed'
                                                                                                    : '',
                                                                                                'block w-full text-left px-4 py-2 text-sm text-gray-700',
                                                                                            )}
                                                                                        >
                                                                                            <div className="flex items-center">
                                                                                                <ArrowPathIcon className="w-4 h-4 mr-3 text-blue-600" />
                                                                                                <div>
                                                                                                    <div className="font-medium">
                                                                                                        Clear Status
                                                                                                    </div>
                                                                                                    <div className="text-xs text-gray-500">
                                                                                                        Reset{' '}
                                                                                                        {selectedCount}{' '}
                                                                                                        to pending
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </button>
                                                                                    )}
                                                                                </Menu.Item>
                                                                            )}

                                                                        <div className="border-t border-gray-100 my-1"></div>

                                                                        <Menu.Item>
                                                                            {({ active }) => (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setBulkDeleteDialogOpen(true);
                                                                                    }}
                                                                                    disabled={hasInvoiced}
                                                                                    className={classNames(
                                                                                        active ? 'bg-gray-50' : '',
                                                                                        hasInvoiced
                                                                                            ? 'opacity-50 cursor-not-allowed'
                                                                                            : '',
                                                                                        'block w-full text-left px-4 py-2 text-sm text-gray-700',
                                                                                    )}
                                                                                >
                                                                                    <div className="flex items-center">
                                                                                        <TrashIcon className="w-4 h-4 mr-3 text-red-600" />
                                                                                        <div>
                                                                                            <div className="font-medium">
                                                                                                Delete Selected
                                                                                            </div>
                                                                                            <div className="text-xs text-gray-500">
                                                                                                {hasInvoiced
                                                                                                    ? 'Cannot delete expenses linked to invoices'
                                                                                                    : `Delete ${selectedCount} expenses`}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </button>
                                                                            )}
                                                                        </Menu.Item>

                                                                        <Menu.Item>
                                                                            {({ active }) => (
                                                                                <button
                                                                                    onClick={handleClearSelection}
                                                                                    className={classNames(
                                                                                        active ? 'bg-gray-50' : '',
                                                                                        'block w-full text-left px-4 py-2 text-sm text-gray-700',
                                                                                    )}
                                                                                >
                                                                                    <div className="flex items-center">
                                                                                        <XMarkIcon className="w-4 h-4 mr-3 text-gray-600" />
                                                                                        <div>
                                                                                            <div className="font-medium">
                                                                                                Clear Selection
                                                                                            </div>
                                                                                            <div className="text-xs text-gray-500">
                                                                                                Clear {selectedCount}{' '}
                                                                                                selected items
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </button>
                                                                            )}
                                                                        </Menu.Item>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </Menu.Items>
                                                </Transition>
                                            </Menu>
                                        )}
                                    </div>
                                </div>

                                {/* Active Filters Section */}
                                {(statusFilter || paidByFilter) && (
                                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
                                        <div className="flex items-center space-x-4">
                                            <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                                            <div className="flex items-center space-x-2">
                                                {statusFilter && (
                                                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                                        <span className="mr-1">Status:</span>
                                                        <span className="font-semibold">
                                                            {statusFilter === 'PENDING' && 'Pending'}
                                                            {statusFilter === 'APPROVED' && 'Approved'}
                                                            {statusFilter === 'REJECTED' && 'Rejected'}
                                                        </span>
                                                        <button
                                                            onClick={() => setStatusFilter('')}
                                                            className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 transition-colors"
                                                        >
                                                            <XMarkIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                                {paidByFilter && (
                                                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                        <span className="mr-1">Paid By:</span>
                                                        <span className="font-semibold">
                                                            {paidByFilter === 'COMPANY' && 'Company'}
                                                            {paidByFilter === 'DRIVER' && 'Driver'}
                                                        </span>
                                                        <button
                                                            onClick={() => setPaidByFilter('')}
                                                            className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200 transition-colors"
                                                        >
                                                            <XMarkIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setStatusFilter('');
                                                setPaidByFilter('');
                                            }}
                                            className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                                        >
                                            Clear all filters
                                        </button>
                                    </div>
                                )}

                                {/* Table */}
                                {loading ? (
                                    <ExpensesTableSkeleton limit={lastExpensesTableLimit} />
                                ) : (
                                    <ExpensesTable
                                        expenses={expenses}
                                        loading={loading}
                                        sort={sort}
                                        onSort={handleSort}
                                        selectedExpenses={selectedExpenses}
                                        processingExpenseIds={processingExpenseIds}
                                        bulkOperationLoading={bulkOperationLoading}
                                        onSelectionChange={(newSelection) => {
                                            setSelectedExpenseIds(Array.from(newSelection));
                                        }}
                                        onDelete={(id) => {
                                            setExpenseToDelete(id);
                                            setDeleteDialogOpen(true);
                                        }}
                                        onExpenseUpdate={(expenseId, updatedExpense) => {
                                            setExpenses((prev) =>
                                                prev.map((expense) =>
                                                    expense.id === expenseId
                                                        ? { ...expense, ...updatedExpense }
                                                        : expense,
                                                ),
                                            );
                                        }}
                                        onReject={(expenseId) => {
                                            setExpenseToReject(expenseId);
                                            setRejectionDialogOpen(true);
                                        }}
                                    />
                                )}

                                {/* Pagination */}
                                {!loading && expenses.length > 0 && (
                                    <div className="mt-0">
                                        <Pagination
                                            metadata={pagination}
                                            loading={loading}
                                            onPrevious={previousPage}
                                            onNext={nextPage}
                                            onGoToPage={goToPage}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Single Expense Delete Confirmation Dialog */}
                            <SimpleDialog
                                show={deleteDialogOpen && expenseToDelete !== null}
                                onClose={() => {
                                    setDeleteDialogOpen(false);
                                    setExpenseToDelete(null);
                                }}
                                title="Delete Expense"
                                description="Are you sure you want to delete this expense? This action cannot be undone."
                                primaryButtonText="Delete"
                                primaryButtonAction={() => expenseToDelete && handleDeleteExpense(expenseToDelete)}
                                primaryButtonColor="bg-red-600 hover:bg-red-500"
                                secondaryButtonAction={() => {
                                    setDeleteDialogOpen(false);
                                    setExpenseToDelete(null);
                                }}
                            />

                            {/* Rejection Dialog with Reason */}
                            {rejectionDialogOpen && (
                                <div className="fixed inset-0 z-50 overflow-y-auto">
                                    <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                                        <div
                                            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                                            onClick={() => {
                                                setRejectionDialogOpen(false);
                                                setExpenseToReject(null);
                                                setRejectionReason('');
                                            }}
                                        ></div>

                                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
                                            &#8203;
                                        </span>

                                        <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                            <div className="sm:flex sm:items-start">
                                                <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-red-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                                                    <XMarkIcon className="w-6 h-6 text-red-600" />
                                                </div>
                                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                                                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                                                        Reject Expense
                                                    </h3>
                                                    <div className="mt-2">
                                                        <p className="text-sm text-gray-500 mb-4">
                                                            Are you sure you want to reject this expense? You can
                                                            optionally provide a reason for rejection.
                                                        </p>
                                                        <div>
                                                            <label
                                                                htmlFor="rejection-reason"
                                                                className="block text-sm font-medium text-gray-700 mb-2"
                                                            >
                                                                Rejection Reason{' '}
                                                                <span className="text-gray-400 font-normal">
                                                                    (optional)
                                                                </span>
                                                            </label>
                                                            <textarea
                                                                id="rejection-reason"
                                                                rows={4}
                                                                value={rejectionReason}
                                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                placeholder="Enter reason for rejection (optional)..."
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                                    onClick={() =>
                                                        expenseToReject &&
                                                        handleRejectExpense(expenseToReject, rejectionReason)
                                                    }
                                                >
                                                    Reject Expense
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                                                    onClick={() => {
                                                        setRejectionDialogOpen(false);
                                                        setExpenseToReject(null);
                                                        setRejectionReason('');
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bulk Approval Confirmation Dialog */}
                            {bulkApprovalDialogOpen && (
                                <div className="fixed inset-0 z-50 overflow-y-auto">
                                    <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                                        <div
                                            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                                            onClick={() => setBulkApprovalDialogOpen(false)}
                                        ></div>

                                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
                                            &#8203;
                                        </span>

                                        <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                            <div className="sm:flex sm:items-start">
                                                <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-green-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                                                    <CheckIcon className="w-6 h-6 text-green-600" />
                                                </div>
                                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                                                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                                                        Approve Selected Expenses
                                                    </h3>
                                                    <div className="mt-2">
                                                        <p className="text-sm text-gray-500">
                                                            Are you sure you want to approve {selectedExpenses.size}{' '}
                                                            expenses? This action cannot be undone.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                                                    onClick={handleBulkApprovalConfirm}
                                                >
                                                    Approve {selectedExpenses.size} Expenses
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                                                    onClick={() => setBulkApprovalDialogOpen(false)}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bulk Rejection Dialog with Reason */}
                            {bulkRejectionDialogOpen && (
                                <div className="fixed inset-0 z-50 overflow-y-auto">
                                    <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                                        <div
                                            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                                            onClick={() => {
                                                setBulkRejectionDialogOpen(false);
                                                setBulkRejectionReason('');
                                            }}
                                        ></div>

                                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
                                            &#8203;
                                        </span>

                                        <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                            <div className="sm:flex sm:items-start">
                                                <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-red-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                                                    <XMarkIcon className="w-6 h-6 text-red-600" />
                                                </div>
                                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                                                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                                                        Reject Selected Expenses
                                                    </h3>
                                                    <div className="mt-2">
                                                        <p className="text-sm text-gray-500 mb-4">
                                                            Are you sure you want to reject {selectedExpenses.size}{' '}
                                                            expenses? You can optionally provide a reason for rejection.
                                                        </p>
                                                        <div>
                                                            <label
                                                                htmlFor="bulk-rejection-reason"
                                                                className="block text-sm font-medium text-gray-700 mb-2"
                                                            >
                                                                Rejection Reason{' '}
                                                                <span className="text-gray-400 font-normal">
                                                                    (optional)
                                                                </span>
                                                            </label>
                                                            <textarea
                                                                id="bulk-rejection-reason"
                                                                rows={4}
                                                                value={bulkRejectionReason}
                                                                onChange={(e) => setBulkRejectionReason(e.target.value)}
                                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                placeholder="Enter reason for rejection (optional)..."
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                                    onClick={handleBulkRejectConfirm}
                                                >
                                                    Reject {selectedExpenses.size} Expenses
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                                                    onClick={() => {
                                                        setBulkRejectionDialogOpen(false);
                                                        setBulkRejectionReason('');
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bulk Delete Confirmation Dialog */}
                            {bulkDeleteDialogOpen && selectedExpenseIds.length > 0 && (
                                <div className="fixed inset-0 z-50 overflow-y-auto">
                                    <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                                        <div
                                            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                                            onClick={() => setBulkDeleteDialogOpen(false)}
                                        ></div>

                                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
                                            &#8203;
                                        </span>

                                        <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                            <div className="sm:flex sm:items-start">
                                                <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-red-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                                                    <TrashIcon className="w-6 h-6 text-red-600" />
                                                </div>
                                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                                                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                                                        Delete Selected Expenses
                                                    </h3>
                                                    <div className="mt-2">
                                                        <p className="text-sm text-gray-500">
                                                            Are you sure you want to delete {selectedExpenseIds.length}{' '}
                                                            expense{selectedExpenseIds.length !== 1 ? 's' : ''}? This
                                                            action cannot be undone and will permanently remove all
                                                            selected expense records.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                                    onClick={() => {
                                                        handleBulkDelete();
                                                    }}
                                                >
                                                    Delete {selectedExpenseIds.length} Expense
                                                    {selectedExpenseIds.length !== 1 ? 's' : ''}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                                                    onClick={() => setBulkDeleteDialogOpen(false)}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Clear Status Confirmation Dialog */}
                            <SimpleDialog
                                show={bulkClearStatusDialogOpen}
                                onClose={() => setBulkClearStatusDialogOpen(false)}
                                title="Clear Status"
                                description={`Are you sure you want to reset ${selectedExpenseIds.length} expense${
                                    selectedExpenseIds.length !== 1 ? 's' : ''
                                } back to pending status? This will clear any approval or rejection status.`}
                                primaryButtonText={`Reset ${selectedExpenseIds.length} to Pending`}
                                primaryButtonAction={() => handleBulkApproval('PENDING')}
                                primaryButtonColor="bg-blue-600 hover:bg-blue-700"
                                secondaryButtonAction={() => setBulkClearStatusDialogOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            </>
        </Layout>
    );
};

ExpensesPage.authenticationEnabled = true;

export default ExpensesPage;
