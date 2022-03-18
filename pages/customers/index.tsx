import { NextPageContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import CustomersTable from '../../components/customers/CustomersTable';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import { ComponentWithAuth } from '../../interfaces/auth';
import { ExpandedCustomer, PaginationMetadata, Sort } from '../../interfaces/models';
import { deleteCustomerById, getAllCustomers } from '../../lib/rest/customer';

export async function getServerSideProps(context: NextPageContext) {
    const { query } = context;
    const data = await getAllCustomers({ limit: Number(query.limit) || 1, offset: Number(query.offset) || 0 });
    return { props: { customers: data.customers, metadata: data.metadata } };
}

type Props = {
    customers: ExpandedCustomer[];
    metadata: PaginationMetadata;
};

const CustomersPage: ComponentWithAuth<Props> = ({ customers, metadata: metadataProp }: Props) => {
    const [customersList, setCustomersList] = React.useState(customers);
    const [sort, setSort] = React.useState<Sort>(null);
    const [metadata, setMetadata] = React.useState<PaginationMetadata>(metadataProp);
    const router = useRouter();

    useEffect(() => {
        setCustomersList(customers);
        setMetadata(metadataProp);
    }, [customers, metadataProp]);

    const reloadCustomers = async (sortData: Sort) => {
        setSort(sortData);
        const { customers, metadata: metadataResponse } = await getAllCustomers({
            limit: metadata.currentLimit,
            offset: metadata.currentOffset,
            sort: sortData,
        });
        setCustomersList(customers);
        setMetadata(metadataResponse);
    };

    const previousPage = async () => {
        router.push({
            pathname: router.pathname,
            query: {
                ...router.query,
                offset: metadata.prev.offset,
                limit: metadata.prev.limit,
            },
        });
    };

    const nextPage = async () => {
        router.push({
            pathname: router.pathname,
            query: {
                ...router.query,
                offset: metadata.next.offset,
                limit: metadata.next.limit,
            },
        });
    };

    const deleteCustomer = async (id: number) => {
        await deleteCustomerById(id);

        notify({ title: 'Customer deleted', message: 'Customer deleted successfully' });
        reloadCustomers(sort);
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
                    <CustomersTable
                        customers={customersList}
                        changeSort={reloadCustomers}
                        deleteCustomer={deleteCustomer}
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

CustomersPage.authenticationEnabled = true;

export default CustomersPage;
