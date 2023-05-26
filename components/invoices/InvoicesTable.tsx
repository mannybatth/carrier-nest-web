import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { ExpandedInvoice } from '../../interfaces/models';
import { Sort } from '../../interfaces/table';
import { invoiceStatus } from '../../lib/invoice/invoice-utils';
import Table from '../Table';
import { formatValue } from 'react-currency-input-field';

type Props = {
    invoices: ExpandedInvoice[];
    headers?: string[];
    sort: Sort;
    loading: boolean;
    changeSort: (sort: Sort) => void;
    deleteInvoice: (id: number) => void;
};

const defaultHeaders = ['id', 'load.customer.name', 'status', 'invoicedAt', 'totalAmount'];

const InvoicesTable: React.FC<Props> = ({
    invoices,
    changeSort,
    sort,
    loading,
    headers = defaultHeaders,
    deleteInvoice,
}) => {
    const router = useRouter();

    return (
        <Table
            loading={loading}
            headers={[
                ...[headers.includes('id') ? { key: 'id', title: 'Invoice Id' } : null],
                ...[headers.includes('load.customer.name') ? { key: 'load.customer.name', title: 'Customer' } : null],
                ...[headers.includes('status') ? { key: 'status', title: 'Status', disableSort: true } : null],
                ...[headers.includes('invoicedAt') ? { key: 'invoicedAt', title: 'Invoice Date' } : null],
                ...[headers.includes('totalAmount') ? { key: 'totalAmount', title: 'Amount' } : null],
            ].filter((x) => x)}
            rows={invoices.map((invoice) => ({
                id: invoice.id,
                items: [
                    ...[headers.includes('id') ? { value: `${invoice.id}` } : null],
                    ...[headers.includes('load.customer.name') ? { value: invoice.load?.customer?.name } : null],
                    ...[
                        headers.includes('status')
                            ? {
                                  node: (
                                      <div className="text-xs leading-5 text-gray-900">
                                          <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 uppercase bg-green-100 rounded-full">
                                              {invoiceStatus(invoice)}
                                          </span>
                                      </div>
                                  ),
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
                                  }).format(new Date(invoice.invoicedAt)),
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
                            router.push(`/accounting/invoices/edit/${invoice.id}`);
                        },
                    },
                    {
                        title: 'Delete',
                        onClick: () => deleteInvoice(invoice.id),
                    },
                ],
            }))}
            onRowClick={(id, index) => {
                router.push(`/accounting/invoices/${id}`);
            }}
            sort={sort}
            changeSort={changeSort}
            emptyState={
                <div className="my-5 text-center">
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
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a invoice for a load.</p>
                    <div className="mt-6">
                        <Link href="/loads">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                View Loads
                            </button>
                        </Link>
                    </div>
                </div>
            }
        />
    );
};

export default InvoicesTable;
