import type React from 'react';
import Link from 'next/link';
import { useLoadContext } from 'components/context/LoadContext';
import LoadStatusBadge from '../LoadStatusBadge';
import { DownloadInvoicePDFButton } from 'components/invoices/invoicePdf';

const LoadDetailsInfo: React.FC = () => {
    const { load } = useLoadContext();

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    return (
        <div className="px-4 sm:px-6 mt-2  bg-gray-50  mb-6 rounded-xl   overflow-hidden border border-gray-100">
            {/* Header with key information */}
            <div className="p-0 py-4 pb-2 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Order# {load.refNum}</h2>
                        <p className="mt-1 text-sm text-gray-500">Load# {load.loadNum}</p>
                    </div>
                    <LoadStatusBadge load={load} bigBadge />
                </div>
            </div>

            {/* Content */}
            <div className="py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left column */}
                    <div className="space-y-4">
                        {/* Customer */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-0">Customer</h3>
                            {load.customer ? (
                                <Link
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                    href={`/customers/${load.customer.id}`}
                                >
                                    {load.customer.name}
                                </Link>
                            ) : (
                                <p className="text-base text-gray-700">No customer assigned</p>
                            )}
                        </div>
                        {/* Drivers */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-0">Drivers</h3>
                            {load.driverAssignments && load.driverAssignments.length > 0 ? (
                                <div className="space-y-2">
                                    {Array.from(
                                        new Map(
                                            load.driverAssignments.map((assignment) => [
                                                assignment.driver.id,
                                                assignment,
                                            ]),
                                        ).values(),
                                    ).map((assignment, index) => (
                                        <div key={`${assignment.driver.id}-${index}`}>
                                            <Link
                                                href={`/drivers/${assignment.driver.id}`}
                                                className="text-base font-medium text-blue-600 hover:text-blue-800"
                                            >
                                                {assignment.driver.name}
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-base text-gray-700">No driver assigned</p>
                            )}
                        </div>

                        {/* Created At */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-0">Created</h3>
                            <p className="text-base text-gray-900">
                                {new Date(load.createdAt).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: 'numeric',
                                    hour12: true,
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">
                        {/* Rate */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-0">Rate</h3>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(Number(load.rate))}</p>
                        </div>

                        {/* Invoice */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-0">Invoice</h3>
                            {load.invoice ? (
                                <div className="space-y-3">
                                    <Link
                                        className="text-base font-medium text-blue-600 hover:text-blue-800"
                                        href={`/invoices/${load.invoice.id}`}
                                    >
                                        #{load.invoice.invoiceNum}
                                    </Link>
                                    <div className="mt-2 border bg-gray-100  border-white rounded-md">
                                        <DownloadInvoicePDFButton
                                            invoice={load.invoice}
                                            customer={load.customer}
                                            load={load}
                                            fileName={`invoice-${load.invoice.invoiceNum}.pdf`}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-base text-gray-700">No invoice</p>
                                    <Link
                                        href={`/invoices/create-invoice/${load.id}`}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Create Invoice
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadDetailsInfo;
