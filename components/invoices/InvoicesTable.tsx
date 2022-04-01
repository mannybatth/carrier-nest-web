import { useRouter } from 'next/router';
import React from 'react';
import { ExpandedInvoice, Sort } from '../../interfaces/models';
import { invoiceStatus } from '../../lib/invoice/invoice-utils';
import Table from '../Table';

type Props = {
    invoices: ExpandedInvoice[];
    headers?: string[];
    sort: Sort;
    changeSort: (sort: Sort) => void;
    deleteInvoice: (id: number) => void;
};

const defaultHeaders = ['id', 'load.customer.name', 'status', 'invoicedAt', 'totalAmount'];

const InvoicesTable: React.FC<Props> = ({
    invoices,
    changeSort,
    sort,
    headers = defaultHeaders,
    deleteInvoice,
}: Props) => {
    const router = useRouter();

    return (
        <Table
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
                    ...[headers.includes('totalAmount') ? { value: `$${invoice.totalAmount}` } : null],
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
        />
    );
};

export default InvoicesTable;
