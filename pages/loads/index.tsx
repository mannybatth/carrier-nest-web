import { NextPageContext } from 'next';
import Link from 'next/link';
import React from 'react';
import Layout from '../../components/layout/Layout';
import LoadsTable from '../../components/loads/LoadsTable';
import { notify } from '../../components/Notification';
import { ComponentWithAuth } from '../../interfaces/auth';
import { ExpandedLoad, Sort } from '../../interfaces/models';
import { deleteLoadById, getAllLoadsWithCustomer } from '../../lib/rest/load';

export async function getServerSideProps(context: NextPageContext) {
    const loads = await getAllLoadsWithCustomer();
    return { props: { loads } };
}

type Props = {
    loads: ExpandedLoad[];
};

const LoadsPage: ComponentWithAuth<Props> = ({ loads }: Props) => {
    const [loadsList, setLoadsList] = React.useState(loads);

    const reloadLoads = async (sort: Sort) => {
        const loads = await getAllLoadsWithCustomer(sort);
        setLoadsList(loads);
    };

    const deleteLoad = async (id: number) => {
        await deleteLoadById(id);

        notify({ title: 'Load deleted', message: 'Load deleted successfully' });

        const loads = await getAllLoadsWithCustomer();
        setLoadsList(loads);
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
                    <LoadsTable loads={loadsList} changeSort={reloadLoads} deleteLoad={deleteLoad} />
                </div>
            </div>
        </Layout>
    );
};

LoadsPage.authenticationEnabled = true;

export default LoadsPage;
