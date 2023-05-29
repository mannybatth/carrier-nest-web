import classNames from 'classnames';
import { NextPageContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { LoadsTable, LoadsTableSkeleton } from '../../components/loads/LoadsTable';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad } from '../../interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { withServerAuth } from '../../lib/auth/server-auth';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { deleteLoadById, getLoadsExpanded } from '../../lib/rest/load';
import { useLocalStorage } from '../../lib/useLocalStorage';

export async function getServerSideProps(context: NextPageContext) {
    return withServerAuth(context, async (context) => {
        const { query } = context;
        const sort: Sort = sortFromQuery(query);
        const isBrowsing = query.show === 'all';

        return {
            props: {
                sort,
                isBrowsing,
                limit: Number(query.limit) || 10,
                offset: Number(query.offset) || 0,
            },
        };
    });
}

type Props = {
    sort: Sort;
    isBrowsing: boolean;
    limit: number;
    offset: number;
};

const LoadsPage: PageWithAuth<Props> = ({
    sort: sortProps,
    limit: limitProp,
    offset: offsetProp,
    isBrowsing,
}: Props) => {
    const [lastLoadsTableLimit, setLastLoadsTableLimit] = useLocalStorage('lastLoadsTableLimit', limitProp);

    const [loadingLoads, setLoadingLoads] = React.useState(true);
    const [tableLoading, setTableLoading] = React.useState(false);

    const [loadsList, setLoadsList] = React.useState<ExpandedLoad[]>([]);

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
        setLimit(limitProp);
        setOffset(offsetProp);
        reloadLoads({ sort, limit: limitProp, offset: offsetProp });
    }, [isBrowsing, limitProp, offsetProp]);

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
        reloadLoads({ sort, limit, offset, useTableLoading: true });
    };

    const reloadLoads = async ({
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
        !useTableLoading && setLoadingLoads(true);
        useTableLoading && setTableLoading(true);
        const { loads, metadata: metadataResponse } = await getLoadsExpanded({
            limit,
            offset,
            sort,
            currentOnly: !isBrowsing,
        });
        setLastLoadsTableLimit(loads.length !== 0 ? loads.length : lastLoadsTableLimit);
        setLoadsList(loads);
        setMetadata(metadataResponse);
        setLoadingLoads(false);
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
        reloadLoads({ sort, limit: metadata.prev.limit, offset: metadata.prev.offset, useTableLoading: true });
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
        reloadLoads({ sort, limit: metadata.next.limit, offset: metadata.next.offset, useTableLoading: true });
    };

    const deleteLoad = async (id: string) => {
        await deleteLoadById(id);

        notify({ title: 'Load deleted', message: 'Load deleted successfully' });
        reloadLoads({ sort, limit, offset, useTableLoading: true });
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">All Loads</h1>
                    <Link href="/loads/create">
                        <button
                            type="button"
                            className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            + Create Load
                        </button>
                    </Link>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">All Loads</h1>
                        <Link href="/loads/create">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                + Create Load
                            </button>
                        </Link>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <div className="block">
                        <div className="border-b border-gray-200">
                            <nav className="flex -mb-px md:space-x-4" aria-label="Tabs">
                                <a
                                    onClick={() => {
                                        router.push({
                                            pathname: router.pathname,
                                        });
                                    }}
                                    className={classNames(
                                        !isBrowsing
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                        'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm',
                                    )}
                                    aria-current={!isBrowsing ? 'page' : undefined}
                                >
                                    Current Loads
                                </a>
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
                                        'w-1/2 text-center md:text-left md:w-auto whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm',
                                    )}
                                    aria-current={isBrowsing ? 'page' : undefined}
                                >
                                    Browse All Loads
                                </a>
                            </nav>
                        </div>
                    </div>
                    <div className="py-2">
                        {loadingLoads ? (
                            <LoadsTableSkeleton limit={lastLoadsTableLimit} />
                        ) : (
                            <LoadsTable
                                loads={loadsList}
                                sort={sort}
                                changeSort={changeSort}
                                deleteLoad={deleteLoad}
                                loading={tableLoading}
                            />
                        )}
                    </div>
                    {loadsList.length !== 0 && !loadingLoads && (
                        <Pagination
                            metadata={metadata}
                            loading={loadingLoads || tableLoading}
                            onPrevious={() => previousPage()}
                            onNext={() => nextPage()}
                        ></Pagination>
                    )}
                </div>
            </div>
        </Layout>
    );
};

LoadsPage.authenticationEnabled = true;

export default LoadsPage;
