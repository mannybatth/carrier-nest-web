import React from 'react';
import { ClockIcon, CheckIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import { ExpandedExpense } from '../../interfaces/models';
import { getExpenseStatusInfo } from '../../lib/expenses/expense-operations';

interface ExpenseStatusInfoProps {
    expense: ExpandedExpense;
    showCompact?: boolean; // For table/list views
}

const ExpenseStatusInfo: React.FC<ExpenseStatusInfoProps> = ({ expense, showCompact = false }) => {
    const statusInfo = getExpenseStatusInfo(expense);

    if (showCompact) {
        // Compact version for table/list views
        return (
            <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center space-x-1">
                    {statusInfo.status === 'APPROVED' && <CheckIcon className="w-4 h-4 text-green-600" />}
                    {statusInfo.status === 'REJECTED' && <XMarkIcon className="w-4 h-4 text-red-600" />}
                    {statusInfo.status === 'PENDING' && <ClockIcon className="w-4 h-4 text-yellow-600" />}
                    <span
                        className={`font-medium ${
                            statusInfo.statusColor === 'green'
                                ? 'text-green-700'
                                : statusInfo.statusColor === 'red'
                                ? 'text-red-700'
                                : 'text-yellow-700'
                        }`}
                    >
                        {statusInfo.statusText}
                    </span>
                </div>

                {statusInfo.actionBy && (
                    <div className="flex items-center space-x-1 text-gray-500">
                        <UserIcon className="w-3 h-3" />
                        <span className="text-xs">{statusInfo.actionBy}</span>
                    </div>
                )}

                {statusInfo.reason && (
                    <div className="text-xs text-gray-600 italic max-w-32 truncate" title={statusInfo.reason}>
                        &quot;{statusInfo.reason}&quot;
                    </div>
                )}
            </div>
        );
    }

    // Full version for detail views
    return (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-3">
                <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        statusInfo.statusColor === 'green'
                            ? 'bg-green-100'
                            : statusInfo.statusColor === 'red'
                            ? 'bg-red-100'
                            : 'bg-yellow-100'
                    }`}
                >
                    {statusInfo.status === 'APPROVED' && <CheckIcon className="w-5 h-5 text-green-600" />}
                    {statusInfo.status === 'REJECTED' && <XMarkIcon className="w-5 h-5 text-red-600" />}
                    {statusInfo.status === 'PENDING' && <ClockIcon className="w-5 h-5 text-yellow-600" />}
                </div>
                <div>
                    <h3
                        className={`text-lg font-semibold ${
                            statusInfo.statusColor === 'green'
                                ? 'text-green-700'
                                : statusInfo.statusColor === 'red'
                                ? 'text-red-700'
                                : 'text-yellow-700'
                        }`}
                    >
                        {statusInfo.statusText}
                    </h3>
                    {statusInfo.actionBy && statusInfo.actionAt && (
                        <p className="text-sm text-gray-600">
                            by {statusInfo.actionBy} on{' '}
                            {new Date(statusInfo.actionAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    )}
                </div>
            </div>

            {statusInfo.reason && (
                <div className="mt-3 p-3 bg-white rounded border-l-4 border-red-300">
                    <div className="flex">
                        <div className="ml-3">
                            <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                            <p className="mt-1 text-sm text-red-700">{statusInfo.reason}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseStatusInfo;
