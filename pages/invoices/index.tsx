import classNames from 'classnames';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { formatValue } from 'react-currency-input-field';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import InvoicesTable from '../../components/invoices/InvoicesTable';
import Layout from '../../components/layout/Layout';
import { LoadsTableSkeleton } from '../../components/loads/LoadsTable';
import { notify } from '../../components/notifications/Notification';
import Pagination from '../../components/Pagination';
import AccountingStatsSkeleton from '../../components/skeletons/AccountingStatsSkeleton';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedInvoice, UIInvoiceStatus } from '../../interfaces/models';
import { AccountingStats } from '../../interfaces/stats';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { deleteInvoiceById, getAccountingStats, getInvoicesExpanded } from '../../lib/rest/invoice';
import { useLocalStorage } from '../../lib/useLocalStorage';

const InvoicesPage: PageWithAuth = () => {
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
        ? (searchParams.get('status') as UIInvoiceStatus)
        : UIInvoiceStatus.NOT_PAID;

    const [lastInvoicesTableLimit, setLastInvoicesTableLimit] = useLocalStorage('lastInvoicesTableLimit', limitProp);

    const [loadingStats, setLoadingStats] = React.useState(true);
    const [loadingInvoices, setLoadingInvoices] = React.useState(true);
    const [tableLoading, setTableLoading] = React.useState(false);

    const [openDeleteInvoiceConfirmation, setOpenDeleteInvoiceConfirmation] = React.useState(false);
    const [invoiceIdToDelete, setInvoiceIdToDelete] = React.useState<string | null>(null);

    const [stats, setStats] = React.useState<AccountingStats>({
        totalPaid: 0,
        totalUnpaid: 0,
        totalOverdue: 0,
    });
    const [invoicesList, setInvoicesList] = React.useState<ExpandedInvoice[]>([]);

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
        const stats = await getAccountingStats();
        setStats(stats);
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
        const { invoices, metadata: metadataResponse } = await getInvoicesExpanded({
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

    const deleteInvoice = async (id: string) => {
        await deleteInvoiceById(id);

        notify({ title: 'Invoice deleted', message: 'Invoice deleted successfully' });
        reloadInvoices({ sort, limit, offset, useTableLoading: true });
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Invoices</h1>
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
                            deleteInvoice(invoiceIdToDelete);
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
                        <div className="flex">
                            <h1 className="flex-1 text-2xl font-semibold text-gray-900">Invoices</h1>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage and view all your invoices, including their statuses and payment details.
                        </p>
                        <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                    </div>
                    <div className="mb-6 px-7 sm:px-6 md:px-8">
                        {loadingStats ? (
                            <AccountingStatsSkeleton></AccountingStatsSkeleton>
                        ) : (
                            <dl className="grid grid-cols-1 gap-5 mt-5 sm:grid-cols-3">
                                <div className="px-4 py-2 overflow-hidden bg-white rounded-lg shadow sm:py-5">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Paid This Month</dt>
                                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                        {formatValue({
                                            value: stats.totalPaid.toString(),
                                            groupSeparator: ',',
                                            decimalSeparator: '.',
                                            prefix: '$',
                                            decimalScale: 2,
                                        })}
                                    </dd>
                                </div>
                                <div className="px-4 py-2 overflow-hidden bg-white rounded-lg shadow sm:py-5">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Unpaid</dt>
                                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                        {formatValue({
                                            value: stats.totalUnpaid.toString(),
                                            groupSeparator: ',',
                                            decimalSeparator: '.',
                                            prefix: '$',
                                            decimalScale: 2,
                                        })}
                                    </dd>
                                </div>
                                <div className="px-4 py-2 overflow-hidden bg-white rounded-lg shadow sm:py-5">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Overdue</dt>
                                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                        {formatValue({
                                            value: stats.totalOverdue.toString(),
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
                    <div className="px-5 sm:px-6 md:px-8 ">
                        <div className="items-center lg:space-x-4 lg:flex border  px-5 my-4 md:block sm:px-2 md:px-4 mx-0 py-4 pb-5 -mb-2 mt-0 bg-white shadow-md  border-gray-200  border-t border-l border-r rounded-tl-lg rounded-tr-lg ">
                            <h2 className="flex-1 text-xl font-bold text-gray-600 mb-3   leading-6  lg:mb-0 lg:flex-1">
                                {isBrowsing ? 'All' : null}
                                {!isBrowsing && withStatus === UIInvoiceStatus.NOT_PAID ? 'Pending' : null}
                                {withStatus === UIInvoiceStatus.PARTIALLY_PAID ? 'Partially Paid' : null}
                                {withStatus === UIInvoiceStatus.OVERDUE ? 'Overdue' : null}
                                {withStatus === UIInvoiceStatus.PAID ? 'Fully Paid' : null} Invoices
                            </h2>
                            <nav className="flex -mb-px md:space-x-4 overflow-x-auto" aria-label="Tabs">
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
                                        });
                                    }}
                                    className={classNames(
                                        !isBrowsing && withStatus === UIInvoiceStatus.NOT_PAID
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                        'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-2 md:px-4 border-b-2 font-medium text-sm',
                                    )}
                                    aria-current={
                                        !isBrowsing && withStatus === UIInvoiceStatus.NOT_PAID ? 'page' : undefined
                                    }
                                >
                                    Pending
                                </a>
                                <a
                                    onClick={() => {
                                        router.push({
                                            pathname: router.pathname,
                                            query: { status: UIInvoiceStatus.PARTIALLY_PAID },
                                        });
                                    }}
                                    className={classNames(
                                        withStatus === UIInvoiceStatus.PARTIALLY_PAID
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                        'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-2 md:px-4 border-b-2 font-medium text-sm',
                                    )}
                                    aria-current={withStatus === UIInvoiceStatus.PARTIALLY_PAID ? 'page' : undefined}
                                >
                                    Partially Paid
                                </a>
                                <a
                                    onClick={() => {
                                        router.push({
                                            pathname: router.pathname,
                                            query: { status: UIInvoiceStatus.OVERDUE },
                                        });
                                    }}
                                    className={classNames(
                                        withStatus === UIInvoiceStatus.OVERDUE
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                        'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-2 md:px-4 border-b-2 font-medium text-sm',
                                    )}
                                    aria-current={withStatus === UIInvoiceStatus.OVERDUE ? 'page' : undefined}
                                >
                                    Overdue
                                </a>
                                <a
                                    onClick={() => {
                                        router.push({
                                            pathname: router.pathname,
                                            query: { status: UIInvoiceStatus.PAID },
                                        });
                                    }}
                                    className={classNames(
                                        withStatus === UIInvoiceStatus.PAID
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                        'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-2 md:px-4 border-b-2 font-medium text-sm',
                                    )}
                                    aria-current={UIInvoiceStatus.PAID ? 'page' : undefined}
                                >
                                    Fully Paid
                                </a>
                            </nav>
                        </div>
                        {loadingInvoices ? (
                            <LoadsTableSkeleton limit={lastInvoicesTableLimit} />
                        ) : (
                            <InvoicesTable
                                invoices={invoicesList}
                                sort={sort}
                                changeSort={changeSort}
                                deleteInvoice={(id: string) => {
                                    setOpenDeleteInvoiceConfirmation(true);
                                    setInvoiceIdToDelete(id);
                                }}
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

InvoicesPage.authenticationEnabled = true;

export default InvoicesPage;
