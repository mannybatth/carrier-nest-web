'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import {
    DocumentTextIcon,
    PencilIcon,
    TrashIcon,
    CheckIcon,
    XMarkIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Table, { TableHeader, TableDataRow, Sort } from '../Table';
import ExpenseStatusBadge from './ExpenseStatusBadge';
import ExpensePaidByBadge from './ExpensePaidByBadge';
import { notify } from '../notifications/Notification';
import { approveExpense, rejectExpense, updateExpenseStatus } from '../../lib/expenses/expense-operations';

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

type Props = {
    expenses: Expense[];
    loading: boolean;
    sort: Sort;
    onSort: (sort: Sort) => void;
    selectedExpenses: Set<string>;
    onSelectionChange: (selected: Set<string>) => void;
    onDelete: (id: string) => void;
    onApprovalChange?: () => void; // Optional callback to refresh data after approval changes
    onExpenseUpdate?: (expenseId: string, updatedExpense: Partial<Expense>) => void; // Optional callback to update specific expense
    onReject?: (expenseId: string) => void; // Optional callback for reject action with reason
    processingExpenseIds?: Set<string>; // Optional set of expense IDs being processed in bulk operations
    bulkOperationLoading?: boolean; // Optional flag to indicate bulk operations are in progress
};

const ExpensesTable: React.FC<Props> = ({
    expenses,
    loading,
    sort,
    onSort,
    selectedExpenses,
    onSelectionChange,
    onDelete,
    onApprovalChange,
    onExpenseUpdate,
    onReject,
    processingExpenseIds = new Set(),
    bulkOperationLoading = false,
}) => {
    const router = useRouter();

    // Local state for expenses to allow optimistic updates
    const [localExpenses, setLocalExpenses] = useState<Expense[]>(expenses);
    const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

    // Update local expenses when props change
    useEffect(() => {
        setLocalExpenses(expenses);
    }, [expenses]);

    const handleStatusUpdate = async (expenseId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
        try {
            // Mark this item as updating
            setUpdatingItems((prev) => new Set(prev).add(expenseId));

            // Optimistically update local state
            setLocalExpenses((prev) =>
                prev.map((expense) =>
                    expense.id === expenseId
                        ? {
                              ...expense,
                              approvalStatus: status,
                              // Clear/set approval fields based on status
                              ...(status === 'PENDING'
                                  ? {
                                        approvedAt: undefined,
                                        approvedById: undefined,
                                        rejectionReason: undefined,
                                    }
                                  : {}),
                              ...(status === 'APPROVED'
                                  ? {
                                        rejectionReason: undefined,
                                    }
                                  : {}),
                          }
                        : expense,
                ),
            );

            let updatedExpense;
            if (status === 'APPROVED') {
                updatedExpense = await approveExpense(expenseId);
            } else if (status === 'REJECTED') {
                // For rejection without reason from table, use empty string
                updatedExpense = await rejectExpense(expenseId, '');
            } else {
                // For PENDING status
                updatedExpense = await updateExpenseStatus({
                    expenseId,
                    status: 'PENDING',
                });
            }

            // Update the specific expense with server response
            if (onExpenseUpdate) {
                // Convert ExpandedExpense to Expense-compatible format
                const expenseUpdate: Partial<Expense> = {
                    approvalStatus: updatedExpense.approvalStatus,
                    approvedAt: updatedExpense.approvedAt || undefined,
                    approvedById: updatedExpense.approvedById || undefined,
                    rejectionReason: updatedExpense.rejectionReason || undefined,
                    amount: Number(updatedExpense.amount), // Convert Decimal to number
                };
                onExpenseUpdate(expenseId, expenseUpdate);
            }

            // Trigger refresh if callback provided
            if (onApprovalChange) {
                onApprovalChange();
            }
        } catch (error) {
            console.error('Error updating expense status:', error);
            // Revert optimistic update on error
            setLocalExpenses(expenses);
        } finally {
            // Remove from updating items
            setUpdatingItems((prev) => {
                const newSet = new Set(prev);
                newSet.delete(expenseId);
                return newSet;
            });
        }
    };

    const formatCurrency = (amount: number | string, currency = 'USD') => {
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        const validCurrency = currency || 'USD'; // Fallback to USD if currency is null/undefined
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: validCurrency,
        }).format(numericAmount);
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(dateString));
    };

    const headers: TableHeader[] = [
        {
            key: '',
            title: '',
            disableSort: true,
            width: 'w-12',
            priority: 1,
        },
        {
            key: 'category',
            title: 'Category',
            priority: 1,
            width: 'w-48 sm:w-40 md:w-48', // Responsive width
            className: 'min-w-[10rem] sm:min-w-[12rem]', // Responsive minimum width
        },
        {
            key: 'description',
            title: 'Description',
            priority: 1,
            className: 'min-w-0 flex-1 max-w-md',
        },
        {
            key: 'approvalStatus',
            title: 'Status',
            priority: 4, // Lower priority for mobile
            className: 'whitespace-nowrap hidden lg:table-cell',
            width: 'w-20',
        },
        {
            key: 'paidBy',
            title: 'Paid By',
            priority: 5, // Lower priority for mobile
            className: 'whitespace-nowrap hidden xl:table-cell',
            width: 'w-20',
        },
        {
            key: 'documents',
            title: 'Docs',
            disableSort: true,
            width: 'w-14',
            priority: 5, // Lower priority for mobile
            className: 'hidden lg:table-cell',
        },
        {
            key: 'amount',
            title: 'Amount',
            priority: 2,
            className: 'whitespace-nowrap text-right',
            width: 'w-24', // Reduced from w-28 to w-24
        },
    ];
    const handleSelectAll = () => {
        if (selectedExpenses.size === expenses.length) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(expenses.map((expense) => expense.id)));
        }
    };

    const handleSelectExpense = (expenseId: string) => {
        const newSelected = new Set(selectedExpenses);
        if (newSelected.has(expenseId)) {
            newSelected.delete(expenseId);
        } else {
            newSelected.add(expenseId);
        }
        onSelectionChange(newSelected);
    };

    const rows: TableDataRow[] = localExpenses.map((expense) => {
        const isSelected = selectedExpenses.has(expense.id);
        const isUpdating = updatingItems.has(expense.id);
        const isProcessing = processingExpenseIds.has(expense.id);
        const isInvoiced = Boolean(expense.driverInvoiceId); // Check if expense is linked to driver invoice
        const isDisabled = isUpdating || isProcessing || bulkOperationLoading || isInvoiced;

        return {
            id: expense.id,
            className: isDisabled ? 'animate-pulse bg-slate-50' : '',
            items: [
                {
                    node: (
                        <div onClick={(e) => e.stopPropagation()} data-menu-item>
                            <input
                                key={`checkbox-${expense.id}-${isSelected}`}
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    handleSelectExpense(expense.id);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                disabled={isDisabled}
                            />
                        </div>
                    ),
                },
                {
                    node: (
                        <div className={`flex flex-col pr-2 ${isDisabled ? 'opacity-75' : ''}`}>
                            <div className="text-sm font-medium text-gray-900 leading-tight">
                                {expense.category.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{expense.category.group}</div>
                        </div>
                    ),
                },
                {
                    node: (
                        <div className={`flex flex-col min-w-0 pr-2 ${isDisabled ? 'opacity-75' : ''}`}>
                            <div
                                className="text-sm font-medium text-gray-900 leading-tight"
                                style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                }}
                            >
                                {expense.description || 'No description'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1">
                                {isInvoiced && (
                                    <Link
                                        href={`/driverinvoices/${expense.driverInvoiceId}`}
                                        className="inline-flex items-center text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold hover:bg-blue-700 transition-colors duration-200 cursor-pointer shadow-sm"
                                        title="View Driver Invoice"
                                    >
                                        📄 Invoiced
                                    </Link>
                                )}
                                {expense.load && (
                                    <Link
                                        href={`/loads/${expense.load.id}`}
                                        className="inline-flex items-center text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                                        title="View Load Details"
                                    >
                                        Order# {expense.load.refNum}
                                    </Link>
                                )}
                                {expense.driver && (
                                    <Link
                                        href={`/drivers/${expense.driver.id}`}
                                        className="inline-flex items-center text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                                        title="View Driver Details"
                                    >
                                        Driver: {expense.driver.name}
                                    </Link>
                                )}
                                {expense.equipment && (
                                    <span className="inline-flex items-center text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                        Equipment:{' '}
                                        {expense.equipment.equipmentNumber ||
                                            `${expense.equipment.make} ${expense.equipment.model || ''}`.trim()}
                                    </span>
                                )}
                            </div>
                        </div>
                    ),
                },
                {
                    node: (
                        <div className={`relative ${isDisabled ? 'opacity-75' : ''}`}>
                            <div className="flex flex-col items-start space-y-1">
                                <ExpenseStatusBadge status={expense.approvalStatus} />
                            </div>
                            {(isUpdating || isProcessing) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-full">
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    ),
                    className: 'hidden lg:table-cell',
                },
                {
                    node: (
                        <div className={isDisabled ? 'opacity-75' : ''}>
                            <ExpensePaidByBadge paidBy={expense.paidBy} />
                        </div>
                    ),
                    className: 'hidden xl:table-cell',
                },
                {
                    node: (
                        <div className={`flex justify-center ${isDisabled ? 'opacity-75' : ''}`}>
                            {expense.documents.length > 0 ? (
                                <div className="flex items-center">
                                    <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                                    <span className="ml-1 text-xs text-gray-500">{expense.documents.length}</span>
                                </div>
                            ) : (
                                <span className="text-xs text-gray-400">—</span>
                            )}
                        </div>
                    ),
                    className: 'hidden lg:table-cell',
                },
                {
                    node: (
                        <div
                            className={`text-sm font-medium text-gray-900 whitespace-nowrap text-right ${
                                isDisabled ? 'opacity-75' : ''
                            }`}
                        >
                            {formatCurrency(expense.amount, expense.currencyCode)}
                        </div>
                    ),
                },
            ],
            menuItems: [
                {
                    title: 'Edit Expense',
                    description: 'Modify expense details',
                    icon: <PencilIcon />,
                    variant: 'default' as const,
                    disabled: isDisabled,
                    onClick: () => router.push(`/expenses/${expense.id}/edit`),
                },
                ...(expense.approvalStatus === 'PENDING'
                    ? [
                          {
                              title: 'Approve',
                              description: 'Mark as approved',
                              icon: <CheckIcon />,
                              variant: 'success' as const,
                              disabled: isDisabled,
                              onClick: () => handleStatusUpdate(expense.id, 'APPROVED'),
                          },
                          {
                              title: 'Reject',
                              description: 'Mark as rejected',
                              icon: <XMarkIcon />,
                              variant: 'danger' as const,
                              disabled: isDisabled,
                              onClick: () =>
                                  onReject ? onReject(expense.id) : handleStatusUpdate(expense.id, 'REJECTED'),
                              divider: true, // Add divider after reject to separate from delete
                          },
                      ]
                    : []),
                ...(expense.approvalStatus === 'APPROVED' || expense.approvalStatus === 'REJECTED'
                    ? [
                          {
                              title: 'Clear Approval',
                              description: 'Reset to pending',
                              icon: <ArrowPathIcon />,
                              variant: 'warning' as const,
                              disabled: isDisabled,
                              onClick: () => handleStatusUpdate(expense.id, 'PENDING'),
                              divider: true, // Add divider after clear approval to separate from delete
                          },
                      ]
                    : []),
                {
                    title: 'Delete',
                    description: 'Remove permanently',
                    icon: <TrashIcon />,
                    variant: 'danger' as const,
                    disabled: isDisabled,
                    onClick: () => onDelete(expense.id),
                },
            ],
        };
    });

    // Add select all checkbox to headers
    const headersWithSelect = headers.map((header) => {
        if (header.key === 'select') {
            return {
                ...header,
                title: (
                    <input
                        type="checkbox"
                        checked={expenses.length > 0 && selectedExpenses.size === expenses.length}
                        onChange={(e) => {
                            e.stopPropagation();
                            handleSelectAll();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={bulkOperationLoading}
                        ref={(input) => {
                            if (input) {
                                input.indeterminate =
                                    selectedExpenses.size > 0 && selectedExpenses.size < expenses.length;
                            }
                        }}
                    />
                ) as any,
            };
        }
        return header;
    });

    const emptyState = (
        <div className="text-center py-16 px-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <DocumentTextIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Get started by creating your first expense or adjust your filters to see more results.
            </p>
            <Link
                href="/expenses/create"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
            >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                Add Expense
            </Link>
        </div>
    );

    return (
        <div className="bg-white    rounded-lg shadow-sm overflow-clip">
            <Table
                headers={headersWithSelect}
                rows={rows}
                sort={sort}
                loading={loading}
                emptyState={emptyState}
                changeSort={onSort}
                rowLink={(id) => `/expenses/${id}`}
                stickyHeader={true}
            />
        </div>
    );
};

type ExpensesTableSkeletonProps = {
    limit: number;
};

export const ExpensesTableSkeleton: React.FC<ExpensesTableSkeletonProps> = ({ limit }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="w-full animate-pulse">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="w-12">
                            <div className="h-4 w-4 rounded bg-slate-200"></div>
                        </div>
                        <div className="w-36">
                            <div className="h-3 w-16 rounded bg-slate-200"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="h-3 w-20 rounded bg-slate-200"></div>
                        </div>
                        <div className="w-28">
                            <div className="h-3 w-14 rounded bg-slate-200"></div>
                        </div>
                        <div className="w-24">
                            <div className="h-3 w-12 rounded bg-slate-200"></div>
                        </div>
                        <div className="w-24">
                            <div className="h-3 w-14 rounded bg-slate-200"></div>
                        </div>
                        <div className="w-24">
                            <div className="h-3 w-10 rounded bg-slate-200"></div>
                        </div>
                        <div className="w-16">
                            <div className="h-3 w-8 rounded bg-slate-200"></div>
                        </div>
                    </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-100">
                    {[...Array(limit)].map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            {/* Checkbox */}
                            <div className="w-12">
                                <div className="h-4 w-4 rounded bg-slate-200"></div>
                            </div>

                            {/* Category */}
                            <div className="w-36 space-y-1">
                                <div className="h-3 w-20 rounded bg-slate-200"></div>
                                <div className="h-2 w-16 rounded bg-slate-200"></div>
                            </div>

                            {/* Description */}
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="h-3 w-full rounded bg-slate-200"></div>
                                <div className="h-2 w-3/4 rounded bg-slate-200"></div>
                            </div>

                            {/* Amount */}
                            <div className="w-28">
                                <div className="h-3 w-16 rounded bg-slate-200"></div>
                            </div>

                            {/* Status */}
                            <div className="w-24">
                                <div className="h-5 w-16 rounded-full bg-slate-200"></div>
                            </div>

                            {/* Paid By */}
                            <div className="w-24">
                                <div className="h-5 w-14 rounded-full bg-slate-200"></div>
                            </div>

                            {/* Docs */}
                            <div className="w-16">
                                <div className="h-3 w-8 rounded bg-slate-200"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ExpensesTable;
