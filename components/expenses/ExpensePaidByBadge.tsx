import React from 'react';
import classNames from 'classnames';

interface Props {
    paidBy: 'COMPANY' | 'DRIVER';
}

const ExpensePaidByBadge: React.FC<Props> = ({ paidBy }) => {
    const getStyles = (paidBy: string) => {
        switch (paidBy) {
            case 'COMPANY':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'DRIVER':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const getText = (paidBy: string) => {
        switch (paidBy) {
            case 'COMPANY':
                return 'Company';
            case 'DRIVER':
                return 'Driver';
            default:
                return 'Unknown';
        }
    };

    return (
        <span
            className={classNames(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                getStyles(paidBy),
            )}
        >
            {getText(paidBy)}
        </span>
    );
};

export default ExpensePaidByBadge;
