'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PencilIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Prisma } from '@prisma/client';
import { ExpandedExpense } from '../../../interfaces/models';
import ExpenseStatusBadge from '../../expenses/ExpenseStatusBadge';
import ExpensePaidByBadge from '../../expenses/ExpensePaidByBadge';

type LoadExpensesSectionProps = {
    expenses: ExpandedExpense[];
    loadId: string;
};

const LoadExpensesSection: React.FC<LoadExpensesSectionProps> = ({ expenses, loadId }) => {
    const router = useRouter();
    const [showAll, setShowAll] = useState(false);
    const maxVisibleExpenses = 5;

    const sortedExpenses = useMemo(() => {
        return [...expenses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [expenses]);

    const shouldShowMore = sortedExpenses.length > maxVisibleExpenses;
    const visibleExpenses = showAll ? sortedExpenses : sortedExpenses.slice(0, maxVisibleExpenses);
    const hiddenCount = sortedExpenses.length - maxVisibleExpenses;

    const formatCurrency = (amount: number | string | Prisma.Decimal | null | undefined, currencyCode = 'USD') => {
        const numAmount = typeof amount === 'number' ? amount : parseFloat(amount?.toString() || '0');
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
        }).format(numAmount);
    };

    const formatDate = (dateString: string | Date) => {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100/50 backdrop-blur-sm">
            <div className="px-6 py-6 border-b border-gray-100/80 bg-gradient-to-r from-gray-50/50 to-white">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Load Expenses</h2>
                        {expenses.length > 0 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            type="button"
                            className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50/70 hover:bg-blue-100/80 backdrop-blur-sm rounded-xl border border-blue-200/50 hover:border-blue-300/60 focus:ring-2 focus:ring-blue-300/20 focus:ring-offset-1 transition-all duration-200 shadow-sm shadow-blue-300/10 hover:shadow-md hover:shadow-blue-300/15"
                            onClick={() => router.push(`/expenses/create?loadId=${loadId}`)}
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Expense
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6">
                {expenses.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">No expenses yet</h3>
                        <p className="text-sm text-gray-500 mb-6">Get started by adding an expense for this load.</p>
                        <button
                            type="button"
                            className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50/70 hover:bg-blue-100/80 rounded-xl border border-blue-200/50 hover:border-blue-300/60 transition-all duration-200"
                            onClick={() => router.push(`/expenses/create?loadId=${loadId}`)}
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add First Expense
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="overflow-hidden bg-white rounded-xl border border-gray-100/80 shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100/60">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Category
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Description
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Amount
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Paid By
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100/60">
                                        {visibleExpenses.map((expense) => (
                                            <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {expense.category?.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {expense.category?.group}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-900 max-w-xs truncate">
                                                        {expense.description || 'No description'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    {formatDate(expense.createdAt)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {formatCurrency(expense.amount, expense.currencyCode)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <ExpensePaidByBadge paidBy={expense.paidBy} />
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <ExpenseStatusBadge status={expense.approvalStatus} />
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex items-center space-x-1">
                                                        <Link
                                                            href={`/expenses/${expense.id}`}
                                                            className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-1"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </Link>
                                                        <Link
                                                            href={`/expenses/${expense.id}/edit`}
                                                            className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:ring-offset-1"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {shouldShowMore && !showAll && (
                            <div className="text-center">
                                <button
                                    onClick={() => setShowAll(true)}
                                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors duration-200"
                                >
                                    Show {hiddenCount} more expense{hiddenCount > 1 ? 's' : ''}
                                </button>
                            </div>
                        )}

                        {showAll && shouldShowMore && (
                            <div className="text-center">
                                <button
                                    onClick={() => setShowAll(false)}
                                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors duration-200"
                                >
                                    Show less
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoadExpensesSection;
