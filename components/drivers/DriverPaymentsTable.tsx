import React from 'react';
import { Prisma } from '@prisma/client';
import { Sort } from '../../interfaces/table';
import Table from '../Table';
import { ExpandedDriverPayment } from 'interfaces/models';
import Link from 'next/link';
import { formatCurrency } from 'lib/helpers/calculateDriverPay';
import { TrashIcon } from '@heroicons/react/24/outline';
import LoadPopover from 'components/LoadPopover';

interface DriverPaymentsTableProps {
    payments: ExpandedDriverPayment[];
    sort: Sort;
    changeSort: (sort: Sort) => void;
    loading: boolean;
    setPaymentToDelete: (payment: ExpandedDriverPayment) => void;
    setConfirmOpen: (open: boolean) => void;
}

const DriverPaymentsTable: React.FC<DriverPaymentsTableProps> = ({
    payments,
    sort,
    changeSort,
    loading,
    setPaymentToDelete,
    setConfirmOpen,
}) => {
    const headers = [
        { key: 'load.refNum', title: 'Load/Order #' },
        { key: 'paymentDate', title: 'Payment Date' },
        { key: 'amount', title: 'Amount' },
        { key: 'notes', title: 'Notes' },
        { key: 'actions', title: 'Actions' },
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
                                <div className="flex items-center">
                                    {driverPayment.assignmentPayments.map((payment, index) => (
                                        <React.Fragment key={payment.id}>
                                            {payment.load ? (
                                                <LoadPopover
                                                    trigger={
                                                        <Link
                                                            href={`/loads/${payment.loadId}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {payment.load.refNum}
                                                        </Link>
                                                    }
                                                    assignment={payment.driverAssignment}
                                                    load={payment.load}
                                                />
                                            ) : (
                                                <span className="text-gray-500">Deleted Load</span>
                                            )}
                                            {index < driverPayment.assignmentPayments.length - 1 && (
                                                <span className="mr-1">,</span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </>
                        ),
                    },
                    { value: new Date(driverPayment.paymentDate).toLocaleDateString() },
                    { value: formatCurrency(new Prisma.Decimal(driverPayment.amount).toNumber()) },
                    { value: driverPayment.notes || '' },
                    {
                        node: (
                            <button
                                type="button"
                                className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPaymentToDelete(driverPayment);
                                    setConfirmOpen(true);
                                }}
                                disabled={loading}
                            >
                                <TrashIcon className="flex-shrink-0 w-4 h-4 text-gray-800" />
                            </button>
                        ),
                    },
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
