import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { formatValue } from 'react-currency-input-field';
import { Sort } from '../../interfaces/table';
import Table from '../Table';
import { SimplifiedDriverInvoice } from 'app/api/driverinvoices/route';

type Props = {
    invoices: SimplifiedDriverInvoice[];
    headers?: string[];
    sort: Sort;
    loading: boolean;
    changeSort: (sort: Sort) => void;
    deleteInvoice: (id: string) => void;
    changeStatus: (id: string, status: string) => void;
    downloadInvoicePDF: (id: string) => void;
};

const defaultHeaders = ['invoiceNum', 'driver', 'status', 'assignments', 'invoicedAt', 'totalAmount'];

const DriverInvoicesTable: React.FC<Props> = ({
    invoices,
    changeSort,
    sort,
    loading,
    headers = defaultHeaders,
    deleteInvoice,
    changeStatus,
    downloadInvoicePDF,
}) => {
    const router = useRouter();

    const invoiceStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-semibold bg-yellow-200 text-gray-600">
                        Pending
                    </span>
                );
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        Approved
                    </span>
                );
            case 'PAID':
                return (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-semibold bg-green-600 text-white">
                        Paid
                    </span>
                );
            case 'PARTIALLY_PAID':
                return (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-semibold bg-green-200 text-green-800">
                        Partially Paid
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                        Unknown
                    </span>
                );
        }
    };

    return (
        <Table
            loading={loading}
            headers={[
                ...[headers.includes('invoiceNum') ? { key: 'invoiceNum', title: 'Invoice Num' } : null],
                ...[headers.includes('driver') ? { key: 'driver', title: 'Driver', disableSort: true } : null],
                ...[headers.includes('status') ? { key: 'status', title: 'Status', disableSort: true } : null],
                ...[headers.includes('assignments') ? { key: 'assignments', title: 'Assignment Count' } : null],
                ...[headers.includes('invoicedAt') ? { key: 'invoicedAt', title: 'Invoice Date' } : null],
                ...[headers.includes('totalAmount') ? { key: 'totalAmount', title: 'Amount' } : null],
            ].filter((x) => x)}
            rows={invoices.map((invoice) => ({
                id: invoice.id,
                items: [
                    ...[headers.includes('invoiceNum') ? { value: `${invoice.invoiceNum}` } : null],
                    ...[headers.includes('driver') ? { value: invoice.driver.name } : null],
                    ...[headers.includes('status') ? { node: invoiceStatusBadge(invoice.status) } : null],
                    ...[
                        headers.includes('assignments')
                            ? {
                                  value: invoice.assignmentCount.toString(),
                              }
                            : null,
                    ],
                    ...[
                        headers.includes('invoicedAt')
                            ? {
                                  value: new Intl.DateTimeFormat('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: '2-digit',
                                  }).format(new Date(invoice.createdAt)),
                              }
                            : null,
                    ],
                    ...[
                        headers.includes('totalAmount')
                            ? {
                                  node: (
                                      <div className="text-sm leading-5 text-gray-900">
                                          {formatValue({
                                              value: invoice.totalAmount.toString(),
                                              groupSeparator: ',',
                                              decimalSeparator: '.',
                                              prefix: '$',
                                              decimalScale: 2,
                                          })}
                                      </div>
                                  ),
                              }
                            : null,
                    ],
                ].filter((x) => x),
                menuItems: [
                    {
                        title: 'Edit',
                        onClick: () => {
                            router.push(`/driverinvoices/${invoice.id}/edit`);
                        },
                    },
                    invoice.status === 'APPROVED' || invoice.status === 'PENDING'
                        ? {
                              title: invoice.status === 'PENDING' ? 'Mark as Approved' : 'Mark as Pending',
                              onClick: () =>
                                  changeStatus(invoice.id, invoice.status === 'PENDING' ? 'APPROVED' : 'PENDING'),
                          }
                        : null,
                    {
                        title: 'Download PDF',
                        onClick: () => downloadInvoicePDF(invoice.id),
                    },
                    {
                        title: 'Delete',
                        onClick: () => deleteInvoice(invoice.id),
                    },
                ],
            }))}
            rowLink={(id) => `/driverinvoices/${id}`}
            sort={sort}
            changeSort={changeSort}
            emptyState={
                <div className="my-0 bg-white text-center border border-gray-200 rounded-lg shadow-sm p-6">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-12 h-12 mx-auto text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices to show on this page.</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating an invoice for a driver.</p>
                    <div className="mt-6">
                        <Link href="/driverinvoices/create-invoice">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Create Driver Invoice
                            </button>
                        </Link>
                    </div>
                </div>
            }
        />
    );
};

export default DriverInvoicesTable;
