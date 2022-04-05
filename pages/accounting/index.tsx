import classNames from 'classnames';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import safeJsonStringify from 'safe-json-stringify';
import InvoicesTable from '../../components/invoices/InvoicesTable';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedInvoice, UIInvoiceStatus, PaginationMetadata, Sort } from '../../interfaces/models';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { deleteInvoiceById, getInvoicesExpanded } from '../../lib/rest/invoice';
import { getInvoices } from '../api/invoices';
import { getInvoiceStats } from '../api/invoices/stats';

export async function getServerSideProps(context: NextPageContext) {
    const { query } = context;
    const sort: Sort = sortFromQuery(query);
    const withStatus = query.status ? (query.status as UIInvoiceStatus) : UIInvoiceStatus.NOT_PAID;

    const [{ data: invoicesData }, { data: statsData }] = await Promise.all([
        getInvoices({
            req: context.req,
            query: {
                expand: 'load',
                limit: query.limit || '10',
                offset: query.offset || '0',
                sortBy: sort?.key,
                sortDir: sort?.order,
                status: withStatus,
            },
        }),
        getInvoiceStats({
            req: context.req,
        }),
    ]);

    return {
        props: {
            invoices: JSON.parse(safeJsonStringify(invoicesData.invoices)),
            metadata: invoicesData.metadata,
            sort,
            withStatus,
            stats: statsData.stats,
        },
    };
}

type Props = {
    invoices: ExpandedInvoice[];
    metadata: PaginationMetadata;
    sort: Sort;
    withStatus: UIInvoiceStatus;
    stats: {
        totalPaid: number;
        totalUnpaid: number;
        totalOverdue: number;
    };
};

const AccountingPage: PageWithAuth<Props> = ({
    invoices,
    metadata: metadataProp,
    sort: sortProps,
    withStatus,
    stats,
}: Props) => {
    const [invoicesList, setInvoicesList] = React.useState(invoices);
    const [sort, setSort] = React.useState<Sort>(sortProps);
    const [metadata, setMetadata] = React.useState<PaginationMetadata>(metadataProp);
    const router = useRouter();

    useEffect(() => {
        setInvoicesList(invoices);
        setMetadata(metadataProp);
    }, [invoices, metadataProp]);

    useEffect(() => {
        setSort(sortProps);
    }, [sortProps]);

    const changeSort = (sort: Sort) => {
        router.push({
            pathname: router.pathname,
            query: queryFromSort(sort, router.query),
        });
    };

    const reloadInvoices = async () => {
        const { invoices, metadata: metadataResponse } = await getInvoicesExpanded({
            limit: metadata.currentLimit,
            offset: metadata.currentOffset,
            sort,
            status: withStatus,
        });
        setInvoicesList(invoices);
        setMetadata(metadataResponse);
    };

    const previousPage = async () => {
        router.push({
            pathname: router.pathname,
            query: queryFromPagination(metadata.prev, router.query),
        });
    };

    const nextPage = async () => {
        router.push({
            pathname: router.pathname,
            query: queryFromPagination(metadata.next, router.query),
        });
    };

    const deleteInvoice = async (id: number) => {
        await deleteInvoiceById(id);

        notify({ title: 'Invoice deleted', message: 'Invoice deleted successfully' });
        reloadInvoices();
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
                    <dl className="grid grid-cols-1 gap-5 mt-5 sm:grid-cols-3">
                        <div className="px-4 py-5 overflow-hidden bg-white rounded-lg shadow sm:p-6">
                            <dt className="text-sm font-medium text-gray-500 truncate">Paid This Month</dt>
                            <dd className="mt-1 text-3xl font-semibold text-gray-900">${stats.totalPaid}</dd>
                        </div>
                        <div className="px-4 py-5 overflow-hidden bg-white rounded-lg shadow sm:p-6">
                            <dt className="text-sm font-medium text-gray-500 truncate">Total Unpaid</dt>
                            <dd className="mt-1 text-3xl font-semibold text-gray-900">${stats.totalUnpaid}</dd>
                        </div>
                        <div className="px-4 py-5 overflow-hidden bg-white rounded-lg shadow sm:p-6">
                            <dt className="text-sm font-medium text-gray-500 truncate">Total Overdue</dt>
                            <dd className="mt-1 text-3xl font-semibold text-gray-900">${stats.totalOverdue}</dd>
                        </div>
                    </dl>
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <div className="items-center border-b border-gray-200 lg:space-x-4 lg:flex">
                        <h2 className="mb-3 text-lg font-medium leading-6 text-gray-900 lg:mb-0 lg:flex-1">
                            {withStatus === UIInvoiceStatus.NOT_PAID ? 'Pending' : null}
                            {withStatus === UIInvoiceStatus.PARTIALLY_PAID ? 'Partially Paid' : null}
                            {withStatus === UIInvoiceStatus.OVERDUE ? 'Overdue' : null}
                            {withStatus === UIInvoiceStatus.PAID ? 'Completed' : null} Invoices
                        </h2>
                        <nav className="flex -mb-px md:space-x-4" aria-label="Tabs">
                            <a
                                onClick={() => {
                                    router.push({
                                        pathname: router.pathname,
                                    });
                                }}
                                className={classNames(
                                    withStatus === UIInvoiceStatus.NOT_PAID
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                    'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm',
                                )}
                                aria-current={withStatus === UIInvoiceStatus.NOT_PAID ? 'page' : undefined}
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
                                    'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm',
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
                                    'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm',
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
                                    'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm',
                                )}
                                aria-current={UIInvoiceStatus.PAID ? 'page' : undefined}
                            >
                                Completed
                            </a>
                        </nav>
                    </div>
                    <InvoicesTable
                        invoices={invoicesList}
                        sort={sort}
                        changeSort={changeSort}
                        deleteInvoice={deleteInvoice}
                    />
                    <Pagination
                        metadata={metadata}
                        onPrevious={() => previousPage()}
                        onNext={() => nextPage()}
                    ></Pagination>
                </div>
            </div>
        </Layout>
    );
};

AccountingPage.authenticationEnabled = true;

export default AccountingPage;
