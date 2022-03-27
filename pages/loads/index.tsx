import { NextPageContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import LoadsTable from '../../components/loads/LoadsTable';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad, PaginationMetadata, Sort } from '../../interfaces/models';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { deleteLoadById, getLoadsExpanded } from '../../lib/rest/load';

export async function getServerSideProps(context: NextPageContext) {
    const { query } = context;
    const sort: Sort = sortFromQuery(query);

    const data = await getLoadsExpanded({
        limit: Number(query.limit) || 1,
        offset: Number(query.offset) || 0,
        sort,
    });
    return { props: { loads: data.loads, metadata: data.metadata, sort } };
}

type Props = {
    loads: ExpandedLoad[];
    metadata: PaginationMetadata;
    sort: Sort;
};

const LoadsPage: PageWithAuth<Props> = ({ loads, metadata: metadataProp, sort: sortProps }: Props) => {
    const [loadsList, setLoadsList] = React.useState(loads);
    const [sort, setSort] = React.useState<Sort>(sortProps);
    const [metadata, setMetadata] = React.useState<PaginationMetadata>(metadataProp);
    const router = useRouter();

    useEffect(() => {
        setLoadsList(loads);
        setMetadata(metadataProp);
    }, [loads, metadataProp]);

    useEffect(() => {
        setSort(sortProps);
    }, [sortProps]);

    const changeSort = (sort: Sort) => {
        router.push({
            pathname: router.pathname,
            query: queryFromSort(sort, router.query),
        });
    };

    const reloadLoads = async () => {
        const { loads, metadata: metadataResponse } = await getLoadsExpanded({
            limit: metadata.currentLimit,
            offset: metadata.currentOffset,
            sort,
        });
        setLoadsList(loads);
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

    const deleteLoad = async (id: number) => {
        await deleteLoadById(id);

        notify({ title: 'Load deleted', message: 'Load deleted successfully' });
        reloadLoads();
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
                    <LoadsTable loads={loadsList} sort={sort} changeSort={changeSort} deleteLoad={deleteLoad} />
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

LoadsPage.authenticationEnabled = true;

export default LoadsPage;
