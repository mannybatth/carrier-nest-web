import classNames from 'classnames';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import InvoicesTable from '../../components/invoices/InvoicesTable';
import Layout from '../../components/layout/Layout';
import { LoadsTableSkeleton } from '../../components/loads/LoadsTable';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import AccountingStatsSkeleton from '../../components/skeletons/AccountingStatsSkeleton';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedInvoice, UIInvoiceStatus } from '../../interfaces/models';
import { AccountingStats } from '../../interfaces/stats';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { withServerAuth } from '../../lib/auth/server-auth';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { deleteInvoiceById, getAccountingStats, getInvoicesExpanded } from '../../lib/rest/invoice';
import { useLocalStorage } from '../../lib/useLocalStorage';
import { formatValue } from 'react-currency-input-field';

export async function getServerSideProps(context: NextPageContext) {
    return withServerAuth(context, async (context) => {
        const { query } = context;
        const sort: Sort = sortFromQuery(query);
        const withStatus = query.status ? (query.status as UIInvoiceStatus) : UIInvoiceStatus.NOT_PAID;
        const isBrowsing = query.show === 'all';

        return {
            props: {
                withStatus,
                isBrowsing,
                sort,
                limit: Number(query.limit) || 10,
                offset: Number(query.offset) || 0,
            },
        };
    });
}

type Props = {
    withStatus: UIInvoiceStatus;
    isBrowsing: boolean;
    sort: Sort;
    limit: number;
    offset: number;
};

const AccountingPage: PageWithAuth<Props> = ({
    withStatus,
    isBrowsing,
    sort: sortProps,
    limit: limitProp,
    offset: offsetProp,
}: Props) => {
    const [lastInvoicesTableLimit, setLastInvoicesTableLimit] = useLocalStorage('lastInvoicesTableLimit', limitProp);

    const [loadingStats, setLoadingStats] = React.useState(true);
    const [loadingInvoices, setLoadingInvoices] = React.useState(true);
    const [tableLoading, setTableLoading] = React.useState(false);

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
    const router = useRouter();

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
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Accounting</h1>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Accounting</h1>
                    </div>
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
                <div className="px-5 sm:px-6 md:px-8">
                    <div className="items-center border-b border-gray-200 lg:space-x-4 lg:flex">
                        <h2 className="mb-3 text-lg font-medium leading-6 text-gray-900 lg:mb-0 lg:flex-1">
                            {isBrowsing ? 'All' : null}
                            {!isBrowsing && withStatus === UIInvoiceStatus.NOT_PAID ? 'Pending' : null}
                            {withStatus === UIInvoiceStatus.PARTIALLY_PAID ? 'Partially Paid' : null}
                            {withStatus === UIInvoiceStatus.OVERDUE ? 'Overdue' : null}
                            {withStatus === UIInvoiceStatus.PAID ? 'Completed' : null} Invoices
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
                                Overdue Only
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
                                Completed
                            </a>
                        </nav>
                    </div>
                    <div className="py-2">
                        {loadingInvoices ? (
                            <LoadsTableSkeleton limit={lastInvoicesTableLimit} />
                        ) : (
                            <InvoicesTable
                                invoices={invoicesList}
                                sort={sort}
                                changeSort={changeSort}
                                deleteInvoice={deleteInvoice}
                                loading={tableLoading}
                            />
                        )}
                    </div>
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
        </Layout>
    );
};

AccountingPage.authenticationEnabled = true;

export default AccountingPage;
