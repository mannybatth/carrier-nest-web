import classNames from 'classnames';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { formatValue } from 'react-currency-input-field';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import InvoicesTable from '../../components/invoices/InvoicesTable';
import Layout from '../../components/layout/Layout';
import { LoadsTableSkeleton } from '../../components/loads/LoadsTable';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import AccountingStatsSkeleton from '../../components/skeletons/AccountingStatsSkeleton';
import { PageWithAuth } from '../../interfaces/auth';
import {
    ExpandedInvoice,
    SimplifiedDriverInvoice,
    UIDriverInvoiceStatus,
    UIInvoiceStatus,
} from '../../interfaces/models';
import { AccountingStats, DriverInvoiceStats } from '../../interfaces/stats';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { useLocalStorage } from '../../lib/useLocalStorage';
import {
    deleteDriverInvoiceById,
    getDriverInvoiceById,
    getDriverInvoices,
    getDriverInvoiceStats,
    updateDriverInvoiceStatus,
} from 'lib/rest/driverinvoice';
import DriverInvoicesTable from 'components/driverinvoices/driverInvoicesTable';
import Link from 'next/link';
import { DriverInvoiceStatus } from '@prisma/client';
import { downloadDriverInvoice } from 'components/driverinvoices/driverInvoicePdf';
import { set } from 'date-fns';

const DriverInvoicesPage: PageWithAuth = () => {
    const router = useRouter();
    const searchParams = new URLSearchParams(router.query as any);
    const sortProps = sortFromQuery({
        sortBy: searchParams.get('sortBy'),
        sortOrder: searchParams.get('sortOrder'),
    });
    const limitProp = Number(searchParams.get('limit')) || 10;
    const offsetProp = Number(searchParams.get('offset')) || 0;
    const isBrowsing = searchParams.get('show') === 'all';
    const withStatus = searchParams.get('status')
        ? (searchParams.get('status') as UIDriverInvoiceStatus)
        : UIDriverInvoiceStatus.PENDING;

    const [lastInvoicesTableLimit, setLastInvoicesTableLimit] = useLocalStorage('lastInvoicesTableLimit', limitProp);

    const [loadingStats, setLoadingStats] = React.useState(true);
    const [loadingInvoices, setLoadingInvoices] = React.useState(true);
    const [tableLoading, setTableLoading] = React.useState(false);

    const [openDeleteInvoiceConfirmation, setOpenDeleteInvoiceConfirmation] = React.useState(false);
    const [invoiceIdToDelete, setInvoiceIdToDelete] = React.useState<string | null>(null);

    const [stats, setStats] = React.useState<DriverInvoiceStats>({
        approvedBalance: 0,
        payableBalance: 0,
        totalPaidThisMonth: 0,
    });
    const [invoicesList, setInvoicesList] = React.useState<SimplifiedDriverInvoice[]>([]);

    const [deletingInvoice, setDeletingInvoice] = React.useState(false);

    const [updatingStatus, setUpdatingStatus] = React.useState(false);
    const [updateStatusForInvoiceID, setUpdateStatusForInvoiceID] = React.useState<string>('');

    const [sort, setSort] = React.useState<Sort>(sortProps);
    const [limit, setLimit] = React.useState(limitProp);
    const [offset, setOffset] = React.useState(offsetProp);
    const [metadata, setMetadata] = React.useState<PaginationMetadata>({
        total: 0,
        currentOffset: offsetProp,
        currentLimit: limitProp,
    });

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        setLimit(limitProp);
        setOffset(offsetProp);
        reloadInvoices({ sort, limit: limitProp, offset: offsetProp });
    }, [limitProp, offsetProp, withStatus, isBrowsing]);

    const changeSort = (sort: Sort) => {
        router.push(
            {
                pathname: router.pathname,
                query: queryFromSort(sort, router.query),
            },
            undefined,
            { shallow: true },
        );
        setSort(sort);
        reloadInvoices({ sort, limit, offset, useTableLoading: true });
    };

    const loadStats = async () => {
        setLoadingStats(true);
        const stats = await getDriverInvoiceStats();
        setStats({
            approvedBalance: stats.approvedBalance,
            payableBalance: stats.payableBalance,
            totalPaidThisMonth: stats.totalPaidThisMonth,
        });
        setLoadingStats(false);
    };

    const reloadInvoices = async ({
        sort,
        limit,
        offset,
        useTableLoading = false,
    }: {
        sort?: Sort;
        limit: number;
        offset: number;
        useTableLoading?: boolean;
    }) => {
        !useTableLoading && setLoadingInvoices(true);
        useTableLoading && setTableLoading(true);
        const { invoices, metadata: metadataResponse } = await getDriverInvoices({
            limit,
            offset,
            sort,
            status: !isBrowsing ? withStatus : null,
        });
        setLastInvoicesTableLimit(invoices.length !== 0 ? invoices.length : lastInvoicesTableLimit);
        setInvoicesList(invoices);
        setMetadata(metadataResponse);
        setLoadingInvoices(false);
        setTableLoading(false);
    };

    const previousPage = async () => {
        router.push(
            {
                pathname: router.pathname,
                query: queryFromPagination(metadata.prev, router.query),
            },
            undefined,
            { shallow: true },
        );
        setLimit(metadata.prev.limit);
        setOffset(metadata.prev.offset);
        reloadInvoices({ sort, limit: metadata.prev.limit, offset: metadata.prev.offset, useTableLoading: true });
    };

    const nextPage = async () => {
        router.push(
            {
                pathname: router.pathname,
                query: queryFromPagination(metadata.next, router.query),
            },
            undefined,
            { shallow: true },
        );
        setLimit(metadata.next.limit);
        setOffset(metadata.next.offset);
        reloadInvoices({ sort, limit: metadata.next.limit, offset: metadata.next.offset, useTableLoading: true });
    };

    const handleDeleteInvoice = async (id: string) => {
        setDeletingInvoice(true);
        setTableLoading(true);
        try {
            // In a real app, this would call an API to delete the invoice
            const message = await deleteDriverInvoiceById(id);
            notify({
                type: 'success',
                title: 'Invoice deleted successfully',
                message: message,
            });
            const filteredInvoices = invoicesList.filter((invoice) => invoice.id !== id);
            setMetadata((prev) => ({
                ...prev,
                total: prev.total - 1,
            }));
            if (filteredInvoices.length === 0) {
                setOffset((prev) => Math.max(prev - limit, 0));
            }
            reloadInvoices({ sort, limit, offset, useTableLoading: true });
            loadStats();
        } catch (error) {
            console.error('Error deleting invoice:', error);
            notify({
                type: 'error',
                title: 'Error deleting invoice',
                message: error.message,
            });
        }
        setDeletingInvoice(false);
        setOpenDeleteInvoiceConfirmation(false);
        setTableLoading(false);
        // Redirect to invoices list would happen here
    };

    const handleStatusChange = async (invoiceId: string, status: DriverInvoiceStatus) => {
        setUpdatingStatus(true);
        setTableLoading(true);
        try {
            const response = await updateDriverInvoiceStatus(invoiceId, status);

            // update invoice in the list
            const updatedInvoices = invoicesList.map((invoice) => {
                if (invoice.id === invoiceId) {
                    return {
                        ...invoice,
                        status: status,
                    };
                }
                return invoice;
            });
            setInvoicesList(updatedInvoices);
            loadStats();

            notify({
                type: 'success',
                title: 'Status changed successfully',
            });
        } catch (error) {
            console.error('Error changing status:', error);
            notify({
                type: 'error',
                title: 'Error changing status',
                message: error.message,
            });
        }
        setUpdatingStatus(false);
        setTableLoading(false);
    };

    const handleDownloadInvoice = async (invoiceId: string) => {
        setTableLoading(true);
        // Simulate download
        const invoice = await getDriverInvoiceById(invoiceId);

        if (!invoice) {
            notify({
                type: 'error',
                title: 'Error downloading invoice',
                message: 'Invoice not found',
            });
            return;
        }
        // Call the download function

        downloadDriverInvoice(
            invoice,
            `${invoice.driver.name}-${invoice.invoiceNum}-${invoice.createdAt.toString().split('T')[0]}.pdf`,
        );
        setTableLoading(false);
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Driver Invoices</h1>
                    <Link href="/driverinvoices/create-invoice">
                        <button
                            type="button"
                            className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            + Create Driver Invoice
                        </button>
                    </Link>
                </div>
            }
        >
            <>
                <SimpleDialog
                    show={openDeleteInvoiceConfirmation}
                    title="Delete Invoice"
                    description="Are you sure you want to delete this invoice?"
                    primaryButtonText="Delete"
                    primaryButtonAction={() => {
                        if (invoiceIdToDelete) {
                            handleDeleteInvoice(invoiceIdToDelete);
                        }
                    }}
                    secondaryButtonAction={() => {
                        setOpenDeleteInvoiceConfirmation(false);
                        setInvoiceIdToDelete(null);
                    }}
                    onClose={() => {
                        setOpenDeleteInvoiceConfirmation(false);
                        setInvoiceIdToDelete(null);
                    }}
                ></SimpleDialog>
                <div className="py-2 mx-auto max-w-7xl">
                    <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                        <div className="flex flex-row justify-between items-center">
                            <div>
                                <div className="flex">
                                    <h1 className="flex-1 text-2xl font-semibold text-gray-900">Driver Invoices</h1>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">
                                    Manage and view all your driver invoices, including their statuses and payment
                                    details.
                                </p>
                            </div>
                            <Link href="/driverinvoices/create-invoice">
                                <button
                                    type="button"
                                    className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    + Create Driver Invoice
                                </button>
                            </Link>
                        </div>

                        <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                    </div>
                    <div className="mb-6 px-7 sm:px-6 md:px-8">
                        {loadingStats ? (
                            <AccountingStatsSkeleton></AccountingStatsSkeleton>
                        ) : (
                            <dl className="grid grid-cols-1 gap-5 mt-5 sm:grid-cols-3">
                                <div className="px-4 py-2 overflow-hidden bg-white rounded-lg shadow sm:py-5">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Payable Balance</dt>
                                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                        {formatValue({
                                            value: stats?.payableBalance?.toString(),
                                            groupSeparator: ',',
                                            decimalSeparator: '.',
                                            prefix: '$',
                                            decimalScale: 2,
                                        })}
                                    </dd>
                                </div>
                                <div className="px-4 py-2 overflow-hidden bg-white rounded-lg shadow sm:py-5">
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Approved Invoice(s) Total
                                    </dt>
                                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                        {formatValue({
                                            value: stats?.approvedBalance?.toString(),
                                            groupSeparator: ',',
                                            decimalSeparator: '.',
                                            prefix: '$',
                                            decimalScale: 2,
                                        })}
                                    </dd>
                                </div>
                                <div className="px-4 py-2 overflow-hidden bg-white rounded-lg shadow sm:py-5">
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Balance Paid This Month
                                    </dt>
                                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                        {formatValue({
                                            value: stats?.totalPaidThisMonth?.toString(),
                                            groupSeparator: ',',
                                            decimalSeparator: '.',
                                            prefix: '$',
                                            decimalScale: 2,
                                        })}
                                    </dd>
                                </div>
                            </dl>
                        )}
                    </div>
                    <div className="px-5 sm:px-6 md:px-8">
                        <div className="items-center border-b border-gray-200 lg:space-x-4 lg:flex">
                            <h2 className="mb-3 text-md font-semibold leading-6 text-gray-700 lg:mb-0 lg:flex-1">
                                {isBrowsing ? 'All' : null}
                                {!isBrowsing && withStatus === UIDriverInvoiceStatus.PENDING ? 'Pending' : null}
                                {withStatus === UIDriverInvoiceStatus.APPROVED ? 'Sent To Driver' : null}
                                {withStatus === UIDriverInvoiceStatus.PARTIALLY_PAID ? 'Partially Paid' : null}
                                {withStatus === UIDriverInvoiceStatus.PAID ? 'Fully Paid' : null} Invoices
                            </h2>
                            <nav className="flex -mb-px md:space-x-4" aria-label="Tabs">
                                <a
                                    onClick={() => {
                                        router.push({
                                            pathname: router.pathname,
                                            query: { show: 'all' },
                                        });
                                    }}
                                    className={classNames(
                                        isBrowsing
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                        'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-2 md:px-4 border-b-2 font-medium text-sm',
                                    )}
                                    aria-current={isBrowsing ? 'page' : undefined}
                                >
                                    Browse All
                                </a>

                                <a
                                    onClick={() => {
                                        router.push({
                                            pathname: router.pathname,
                                            query: { status: UIDriverInvoiceStatus.PENDING },
                                        });
                                    }}
                                    className={classNames(
                                        withStatus === UIDriverInvoiceStatus.PENDING && !isBrowsing
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                        'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-2 md:px-4 border-b-2 font-medium text-sm',
                                    )}
                                    aria-current={withStatus === UIDriverInvoiceStatus.PENDING ? 'page' : undefined}
                                >
                                    Pending
                                </a>

                                <a
                                    onClick={() => {
                                        router.push({
                                            pathname: router.pathname,
                                            query: { status: UIDriverInvoiceStatus.APPROVED },
                                        });
                                    }}
                                    className={classNames(
                                        withStatus === UIDriverInvoiceStatus.APPROVED
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                        'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-2 md:px-4 border-b-2 font-medium text-sm',
                                    )}
                                    aria-current={withStatus === UIDriverInvoiceStatus.APPROVED ? 'page' : undefined}
                                >
                                    Approved
                                </a>

                                <a
                                    onClick={() => {
                                        router.push({
                                            pathname: router.pathname,
                                            query: { status: UIDriverInvoiceStatus.PARTIALLY_PAID },
                                        });
                                    }}
                                    className={classNames(
                                        withStatus === UIDriverInvoiceStatus.PARTIALLY_PAID
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                        'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-2 md:px-4 border-b-2 font-medium text-sm',
                                    )}
                                    aria-current={
                                        withStatus === UIDriverInvoiceStatus.PARTIALLY_PAID ? 'page' : undefined
                                    }
                                >
                                    Partially Paid
                                </a>

                                <a
                                    onClick={() => {
                                        router.push({
                                            pathname: router.pathname,
                                            query: { status: UIDriverInvoiceStatus.PAID },
                                        });
                                    }}
                                    className={classNames(
                                        withStatus === UIDriverInvoiceStatus.PAID
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                        'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-2 md:px-4 border-b-2 font-medium text-sm',
                                    )}
                                    aria-current={withStatus === UIDriverInvoiceStatus.PAID ? 'page' : undefined}
                                >
                                    Paid
                                </a>
                            </nav>
                        </div>
                        {loadingInvoices ? (
                            <LoadsTableSkeleton limit={lastInvoicesTableLimit} />
                        ) : (
                            <DriverInvoicesTable
                                invoices={invoicesList}
                                sort={sort}
                                changeSort={changeSort}
                                changeStatus={handleStatusChange}
                                deleteInvoice={(id: string) => {
                                    setOpenDeleteInvoiceConfirmation(true);
                                    setInvoiceIdToDelete(id);
                                }}
                                downloadInvoicePDF={handleDownloadInvoice}
                                loading={tableLoading}
                            />
                        )}
                        {invoicesList.length !== 0 && !loadingInvoices && (
                            <Pagination
                                metadata={metadata}
                                loading={loadingInvoices || tableLoading}
                                onPrevious={() => previousPage()}
                                onNext={() => nextPage()}
                            ></Pagination>
                        )}
                    </div>
                </div>
            </>
        </Layout>
    );
};

DriverInvoicesPage.authenticationEnabled = true;

export default DriverInvoicesPage;
