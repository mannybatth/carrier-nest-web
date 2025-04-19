import React from 'react';
import Link from 'next/link';
import { formatValue } from 'react-currency-input-field';
import LoadStatusBadge from '../LoadStatusBadge';
import { DownloadInvoicePDFButton } from 'components/invoices/invoicePdf';
import { useLoadContext } from 'components/context/LoadContext';

type LoadDetailsInfoProps = {
    //
};

const LoadDetailsInfo: React.FC<LoadDetailsInfoProps> = () => {
    const [load, setLoad] = useLoadContext();
    return (
        <div>
            <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <div className="flex justify-between py-3 space-x-2 text-sm font-medium border-b border-gray-200">
                    <dt className="text-gray-500">Order #</dt>
                    <dd className="text-right text-gray-900">{load.refNum}</dd>
                </div>
                <div className="flex justify-between py-3 space-x-2 text-sm font-medium border-b border-gray-200">
                    <dt className="text-gray-500">Status</dt>
                    <dd className="text-right text-gray-900">
                        <LoadStatusBadge load={load} />
                    </dd>
                </div>
                <div className="flex justify-between py-3 space-x-2 text-sm font-medium border-b border-gray-200">
                    <dt className="text-gray-500">Customer</dt>
                    <dd className="text-right text-gray-900">
                        {load.customer && (
                            <Link
                                className="font-medium text-blue-500 hover:underline"
                                href={`/customers/${load.customer.id}`}
                            >
                                {load.customer?.name}
                            </Link>
                        )}
                    </dd>
                </div>

                <div className="flex justify-between py-3 space-x-2 text-sm font-medium border-b border-gray-200">
                    <dt className="text-gray-500">Rate</dt>
                    <dd className="text-right text-gray-900">
                        {formatValue({
                            value: load.rate.toString(),
                            groupSeparator: ',',
                            decimalSeparator: '.',
                            prefix: '$',
                            decimalScale: 2,
                        })}
                    </dd>
                </div>
                <div className="flex justify-between py-3 space-x-2 text-sm font-medium border-b border-gray-200">
                    <dt className="text-gray-500">Created At</dt>
                    <dd className="text-right text-gray-900">
                        {new Date(load.createdAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: 'numeric',
                            minute: 'numeric',
                            second: 'numeric',
                            hour12: true,
                        })}
                    </dd>
                </div>
                <div className="flex justify-between py-3 space-x-2 text-sm font-medium border-b border-gray-200">
                    <dt className="text-gray-500">Load #</dt>
                    <dd className="text-right text-gray-900">{load.loadNum}</dd>
                </div>
                <div className="flex justify-between py-3 space-x-2 text-sm font-medium border-b border-gray-200">
                    <dt className="text-gray-500">Drivers</dt>
                    <dd className="text-right text-gray-900">
                        {load.driverAssignments &&
                            (load.driverAssignments?.length > 0 ? (
                                Array.from(
                                    new Map(
                                        load.driverAssignments.map((assignment) => [assignment.driver.id, assignment]),
                                    ).values(),
                                ).map((assignment, index, uniqueAssignments) => (
                                    <span key={`${assignment.driver.id}-${index}`}>
                                        <Link
                                            href={`/drivers/${assignment.driver.id}`}
                                            className="font-medium text-blue-500 hover:underline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            {assignment.driver?.name}
                                        </Link>
                                        {index < uniqueAssignments.length - 1 ? ', ' : ''}
                                    </span>
                                ))
                            ) : (
                                <div className="text-gray-400">No driver assigned</div>
                            ))}
                    </dd>
                </div>
                <div className="border-b border-gray-200">
                    <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                        <dt className="text-gray-500">Invoice</dt>
                        <dd className="text-right text-gray-900">
                            {load.invoice ? (
                                <Link
                                    className="font-medium text-blue-500 hover:underline"
                                    href={`/invoices/${load.invoice.id}`}
                                    passHref
                                >
                                    # {load.invoice?.invoiceNum}
                                </Link>
                            ) : (
                                <Link href={`/invoices/create-invoice/${load.id}`}>Create Invoice</Link>
                            )}
                        </dd>
                    </div>
                    {load.invoice && (
                        <div className="mb-2 border border-gray-200 divide-y divide-gray-200 rounded-md">
                            <DownloadInvoicePDFButton
                                invoice={load.invoice}
                                customer={load.customer}
                                load={load}
                                fileName={`invoice-${load.invoice.invoiceNum}.pdf`}
                            />
                        </div>
                    )}
                </div>
            </dl>
        </div>
    );
};

export default LoadDetailsInfo;
