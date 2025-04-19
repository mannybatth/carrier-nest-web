import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import Layout from '../../components/layout/Layout';
import { LoadsTable, LoadsTableSkeleton } from '../../components/loads/LoadsTable';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad } from '../../interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { deleteLoadById, getLoadsExpanded } from '../../lib/rest/load';
import { useLocalStorage } from '../../lib/useLocalStorage';
import { useUserContext } from 'components/context/UserContext';

const LoadsPage: PageWithAuth = () => {
    const router = useRouter();
    const { isProPlan, isLoadingCarrier } = useUserContext();
    const searchParams = new URLSearchParams(router.query as any);
    const sortProps = sortFromQuery({
        sortBy: searchParams.get('sortBy'),
        sortOrder: searchParams.get('sortOrder'),
    });
    const limitProp = Number(searchParams.get('limit')) || 20;
    const offsetProp = Number(searchParams.get('offset')) || 0;

    const [lastLoadsTableLimit, setLastLoadsTableLimit] = useLocalStorage('lastLoadsTableLimit', limitProp);

    const [loadingLoads, setLoadingLoads] = React.useState(true);
    const [tableLoading, setTableLoading] = React.useState(false);

    const [loadsList, setLoadsList] = React.useState<ExpandedLoad[]>([]);

    const [openDeleteLoadConfirmation, setOpenDeleteLoadConfirmation] = React.useState(false);
    const [loadIdToDelete, setLoadIdToDelete] = React.useState<string | null>(null);

    const [sort, setSort] = React.useState<Sort>(sortProps);
    const [limit, setLimit] = React.useState(limitProp);
    const [offset, setOffset] = React.useState(offsetProp);
    const [metadata, setMetadata] = React.useState<PaginationMetadata>({
        total: 0,
        currentOffset: offsetProp,
        currentLimit: limitProp,
    });

    useEffect(() => {
        setLimit(limitProp);
        setOffset(offsetProp);
        reloadLoads({ sort, limit: limitProp, offset: offsetProp });
    }, [limitProp, offsetProp]);

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
        });

        console.log('loads', loads);
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

        setLoadIdToDelete(null);
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
            <>
                <SimpleDialog
                    show={openDeleteLoadConfirmation}
                    title="Delete load"
                    description="Are you sure you want to delete this load?"
                    primaryButtonText="Delete"
                    primaryButtonAction={() => {
                        if (loadIdToDelete) {
                            deleteLoad(loadIdToDelete);
                        }
                    }}
                    secondaryButtonAction={() => {
                        setOpenDeleteLoadConfirmation(false);
                        setLoadIdToDelete(null);
                    }}
                    onClose={() => {
                        setOpenDeleteLoadConfirmation(false);
                        setLoadIdToDelete(null);
                    }}
                ></SimpleDialog>
                <div className="py-2 mx-auto max-w-7xl">
                    {!isProPlan && !isLoadingCarrier && (
                        <div className="mx-5 my-4 mb-6 sm:mx-6 md:mx-8">
                            <div className="p-6 border border-blue-100 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-medium text-blue-900">Unlock unlimited loads</h3>
                                        <p className="mt-1 text-sm text-blue-700">
                                            Upgrade to Pro and get unlimited loads for your business. Manage as many
                                            loads as you need without restrictions.
                                        </p>
                                    </div>
                                    <div className="ml-6">
                                        <Link href="/billing">
                                            <button
                                                type="button"
                                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                Upgrade Plan
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
                        {loadingLoads ? (
                            <LoadsTableSkeleton limit={lastLoadsTableLimit} />
                        ) : (
                            <LoadsTable
                                loads={loadsList}
                                sort={sort}
                                changeSort={changeSort}
                                deleteLoad={(id: string) => {
                                    setOpenDeleteLoadConfirmation(true);
                                    setLoadIdToDelete(id);
                                }}
                                loading={tableLoading}
                            />
                        )}
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
            </>
        </Layout>
    );
};

LoadsPage.authenticationEnabled = true;

export default LoadsPage;
