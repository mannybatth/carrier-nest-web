import { NextPageContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import DriversTable from '../../components/drivers/DriversTable';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import { ComponentWithAuth } from '../../interfaces/auth';
import { ExpandedDriver, PaginationMetadata, Sort } from '../../interfaces/models';
import { deleteDriverById, getAllDrivers } from '../../lib/rest/driver';

export async function getServerSideProps(context: NextPageContext) {
    const { query } = context;
    const data = await getAllDrivers({ limit: Number(query.limit) || 1, offset: Number(query.offset) || 0 });
    return { props: { drivers: data.drivers, metadata: data.metadata } };
}

type Props = {
    drivers: ExpandedDriver[];
    metadata: PaginationMetadata;
};

const DriversPage: ComponentWithAuth<Props> = ({ drivers, metadata: metadataProp }: Props) => {
    const [driversList, setDriversList] = React.useState(drivers);
    const [sort, setSort] = React.useState<Sort>(null);
    const [metadata, setMetadata] = React.useState<PaginationMetadata>(metadataProp);
    const router = useRouter();

    useEffect(() => {
        setDriversList(drivers);
        setMetadata(metadataProp);
    }, [drivers, metadataProp]);

    const reloadDrivers = async (sortData: Sort) => {
        setSort(sortData);
        const { drivers, metadata: metadataResponse } = await getAllDrivers({
            limit: metadata.currentLimit,
            offset: metadata.currentOffset,
            sort: sortData,
        });
        setDriversList(drivers);
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

    const deleteDriver = async (id: number) => {
        await deleteDriverById(id);

        notify({ title: 'Driver deleted', message: 'Driver deleted successfully' });
        reloadDrivers(sort);
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Drivers</h1>
                    <Link href="/drivers/create">
                        <button
                            type="button"
                            className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            + Create Driver
                        </button>
                    </Link>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Drivers</h1>
                        <Link href="/drivers/create">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                + Create Driver
                            </button>
                        </Link>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <DriversTable drivers={driversList} changeSort={reloadDrivers} deleteDriver={deleteDriver} />
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

DriversPage.authenticationEnabled = true;

export default DriversPage;
