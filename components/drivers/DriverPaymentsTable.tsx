import React from 'react';
import { Prisma } from '@prisma/client';
import { Sort } from '../../interfaces/table';
import Table from '../Table';
import { ExpandedDriverPayment } from 'interfaces/models';
import Link from 'next/link';
import { formatCurrency } from 'lib/helpers/calculateDriverPay';

interface DriverPaymentsTableProps {
    payments: ExpandedDriverPayment[];
    sort: Sort;
    changeSort: (sort: Sort) => void;
    loading: boolean;
}

const DriverPaymentsTable: React.FC<DriverPaymentsTableProps> = ({ payments, sort, changeSort, loading }) => {
    const headers = [
        { key: 'load.refNum', title: 'Load/Order #' },
        { key: 'paymentDate', title: 'Payment Date' },
        { key: 'amount', title: 'Amount' },
        { key: 'notes', title: 'Notes' },
    ];

    return (
        <Table
            loading={loading}
            headers={headers}
            rows={payments.map((driverPayment) => ({
                id: driverPayment.id,
                items: [
                    {
                        node: (
                            <>
                                {driverPayment.assignmentPayments.map((payment, index) => (
                                    <React.Fragment key={payment.id}>
                                        <Link href={`/loads/${payment.loadId}`} onClick={(e) => e.stopPropagation()}>
                                            {payment.load.refNum}
                                        </Link>
                                        {index < driverPayment.assignmentPayments.length - 1 && ', '}
                                    </React.Fragment>
                                ))}
                            </>
                        ),
                    },
                    { value: new Date(driverPayment.paymentDate).toLocaleDateString() },
                    { value: formatCurrency(new Prisma.Decimal(driverPayment.amount).toNumber()) },
                    { value: driverPayment.notes || '' },
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

export default DriverPaymentsTable;
