import { Customer } from '@prisma/client';
import { NextPageContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import CustomersTable, { CustomersTableSkeleton } from '../../components/customers/CustomersTable';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import { PageWithAuth } from '../../interfaces/auth';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { withServerAuth } from '../../lib/auth/server-auth';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { deleteCustomerById, getAllCustomers } from '../../lib/rest/customer';
import { useLocalStorage } from '../../lib/useLocalStorage';

export async function getServerSideProps(context: NextPageContext) {
    return withServerAuth(context, async (context) => {
        const { query } = context;
        const sort: Sort = sortFromQuery(query);

        return {
            props: {
                sort,
                limit: Number(query.limit) || 10,
                offset: Number(query.offset) || 0,
            },
        };
    });
}

type Props = {
    sort: Sort;
    limit: number;
    offset: number;
};

const CustomersPage: PageWithAuth<Props> = ({ sort: sortProps, limit: limitProp, offset: offsetProp }: Props) => {
    const [lastCustomersTableLimit, setLastCustomersTableLimit] = useLocalStorage('lastCustomersTableLimit', limitProp);

    const [loadingCustomers, setLoadingCustomers] = React.useState(true);
    const [tableLoading, setTableLoading] = React.useState(false);

    const [customersList, setCustomersList] = React.useState<Customer[]>([]);

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
        reloadCustomers({ sort, limit: limitProp, offset: offsetProp });
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
        reloadCustomers({ sort, limit, offset, useTableLoading: true });
    };

    const reloadCustomers = async ({
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
        !useTableLoading && setLoadingCustomers(true);
        useTableLoading && setTableLoading(true);
        const { customers, metadata: metadataResponse } = await getAllCustomers({
            limit,
            offset,
            sort,
        });
        setLastCustomersTableLimit(customers.length !== 0 ? customers.length : lastCustomersTableLimit);
        setCustomersList(customers);
        setMetadata(metadataResponse);
        setLoadingCustomers(false);
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
        reloadCustomers({ sort, limit: metadata.prev.limit, offset: metadata.prev.offset, useTableLoading: true });
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
        reloadCustomers({ sort, limit: metadata.next.limit, offset: metadata.next.offset, useTableLoading: true });
    };

    const deleteCustomer = async (id: string) => {
        await deleteCustomerById(id);

        notify({ title: 'Customer deleted', message: 'Customer deleted successfully' });
        reloadCustomers({ sort, limit, offset, useTableLoading: true });
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Customers</h1>
                    <Link href="/customers/create">
                        <button
                            type="button"
                            className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            + Create Customer
                        </button>
                    </Link>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Customers</h1>
                        <Link href="/customers/create">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                + Create Customer
                            </button>
                        </Link>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <div className="py-2">
                        {loadingCustomers ? (
                            <CustomersTableSkeleton limit={lastCustomersTableLimit} />
                        ) : (
                            <CustomersTable
                                customers={customersList}
                                sort={sort}
                                changeSort={changeSort}
                                deleteCustomer={deleteCustomer}
                                loading={tableLoading}
                            />
                        )}
                    </div>
                    {customersList.length !== 0 && !loadingCustomers && (
                        <Pagination
                            metadata={metadata}
                            loading={loadingCustomers || tableLoading}
                            onPrevious={() => previousPage()}
                            onNext={() => nextPage()}
                        ></Pagination>
                    )}
                </div>
            </div>
        </Layout>
    );
};

CustomersPage.authenticationEnabled = true;

export default CustomersPage;
