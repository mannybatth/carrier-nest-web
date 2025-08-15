import React from 'react';
import classNames from 'classnames';

interface Props {
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const ExpenseStatusBadge: React.FC<Props> = ({ status }) => {
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'REJECTED':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'PENDING':
            default:
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'Approved';
            case 'REJECTED':
                return 'Rejected';
            case 'PENDING':
            default:
                return 'Pending';
        }
    };

    const getStatusDotColor = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-green-500';
            case 'REJECTED':
                return 'bg-red-500';
            case 'PENDING':
            default:
                return 'bg-yellow-500';
        }
    };

    return (
        <div
            className={classNames(
                'inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-medium',
                getStatusStyles(status),
            )}
        >
            <div className={classNames('w-1.5 h-1.5 rounded-full mr-1.5', getStatusDotColor(status))}></div>
            <span className="whitespace-nowrap">{getStatusText(status)}</span>
        </div>
    );
};

export default ExpenseStatusBadge;
