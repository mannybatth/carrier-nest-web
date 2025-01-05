import React from 'react';
import { Prisma } from '@prisma/client';
import { Sort } from '../../interfaces/table';
import Table from '../Table';
import { ExpandedAssignmentPayment } from 'interfaces/models';
import Link from 'next/link';

const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

interface AssignmentPaymentsTableProps {
    payments: ExpandedAssignmentPayment[];
    sort: Sort;
    changeSort: (sort: Sort) => void;
    loading: boolean;
}

const AssignmentPaymentsTable: React.FC<AssignmentPaymentsTableProps> = ({ payments, sort, changeSort, loading }) => {
    const headers = [
        { key: 'load.refNum', title: 'Load/Order #' },
        { key: 'paymentDate', title: 'Payment Date' },
        { key: 'amount', title: 'Amount' },
    ];

    return (
        <Table
            loading={loading}
            headers={headers}
            rows={payments.map((payment) => ({
                id: payment.id,
                items: [
                    {
                        node: (
                            <Link href={`/loads/${payment.loadId}`} onClick={(e) => e.stopPropagation()}>
                                {payment.load.refNum}
                            </Link>
                        ),
                    },
                    { value: new Date(payment.paymentDate).toLocaleDateString() },
                    { value: formatCurrency(new Prisma.Decimal(payment.amount).toNumber()) },
                ],
            }))}
            sort={sort}
            changeSort={changeSort}
            emptyState={
                <div className="my-5 text-center">
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No assignment payments to show on this page.
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating new assignment payments.</p>
                </div>
            }
        />
    );
};

export default AssignmentPaymentsTable;
