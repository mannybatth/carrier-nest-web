import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, EnvelopeIcon, PhoneIcon, TruckIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { Fragment, useEffect } from 'react';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { LoadsTable, LoadsTableSkeleton } from '../../components/loads/LoadsTable';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import CustomerDetailsSkeleton from '../../components/skeletons/CustomerDetailsSkeleton';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedDriver, ExpandedLoad } from '../../interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { deleteDriverById, getDriverById } from '../../lib/rest/driver';
import { deleteLoadById, getLoadsExpanded } from '../../lib/rest/load';
import { useLocalStorage } from '../../lib/useLocalStorage';

type ActionsDropdownProps = {
    driver: ExpandedDriver;
    disabled?: boolean;
    deleteDriver: (id: string) => void;
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({ driver, disabled, deleteDriver }) => {
    const router = useRouter();

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button
                    className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
                    disabled={disabled}
                >
                    Actions
                    <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" aria-hidden="true" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/drivers/edit/${driver.id}`);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Edit
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteDriver(driver.id);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Delete
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

const DriverDetailsPage: PageWithAuth = () => {
    const searchParams = useSearchParams();
    const sortProps = sortFromQuery({
        sortBy: searchParams.get('sortBy'),
        sortOrder: searchParams.get('sortOrder'),
    });
    const limitProp = Number(searchParams.get('limit')) || 10;
    const offsetProp = Number(searchParams.get('offset')) || 0;
    const driverId = searchParams.get('id') || '';

    const [lastLoadsTableLimit, setLastLoadsTableLimit] = useLocalStorage('lastLoadsTableLimit', limitProp);

    const [loadingDriver, setLoadingDriver] = React.useState(true);
    const [loadingLoads, setLoadingLoads] = React.useState(true);
    const [tableLoading, setTableLoading] = React.useState(false);

    const [driver, setDriver] = React.useState<ExpandedDriver | null>(null);
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
        reloadDriver();
    }, [driverId]);

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

    const reloadDriver = async () => {
        setLoadingDriver(true);
        const driver = await getDriverById(driverId);
        setDriver(driver);
        setLoadingDriver(false);
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
            driverId,
            limit,
            offset,
            sort,
        });
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

    const deleteDriver = async (id: string) => {
        await deleteDriverById(id);

        notify({ title: 'Driver deleted', message: 'Driver deleted successfully' });

        router.push('/drivers');
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">{driver?.name}</h1>
                    <ActionsDropdown driver={driver} disabled={!driver} deleteDriver={deleteDriver}></ActionsDropdown>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Driver',
                            href: '/drivers',
                        },
                        {
                            label: driver ? `${driver.name}` : '',
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">{driver?.name}</h1>
                        <ActionsDropdown
                            driver={driver}
                            disabled={!driver}
                            deleteDriver={deleteDriver}
                        ></ActionsDropdown>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <div className="grid grid-cols-12 gap-5">
                        {driver ? (
                            <div className="col-span-12">
                                <div role="list" className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
                                    <div className="flex p-3">
                                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ">
                                            <TruckIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900">Total Loads</p>
                                            <p className="text-sm text-gray-500">{metadata?.total || '--'}</p>
                                        </div>
                                    </div>
                                    <div className="flex p-3">
                                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ">
                                            <EnvelopeIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900">Email</p>
                                            <p className="text-sm text-gray-500">{driver.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex p-3">
                                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                                            <PhoneIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900">Phone</p>
                                            <p className="text-sm text-gray-500">{driver.phone}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <CustomerDetailsSkeleton></CustomerDetailsSkeleton>
                        )}

                        <div className="col-span-12">
                            <h3 className="mb-2">Loads Assigned to Driver</h3>
                            {loadingLoads ? (
                                <LoadsTableSkeleton limit={lastLoadsTableLimit} />
                            ) : (
                                <LoadsTable
                                    loads={loadsList}
                                    headers={[
                                        'refNum',
                                        'status',
                                        'shipper.date',
                                        'receiver.date',
                                        'shipper.city',
                                        'receiver.city',
                                        'rate',
                                    ]}
                                    sort={sort}
                                    changeSort={changeSort}
                                    deleteLoad={deleteLoad}
                                    loading={tableLoading}
                                ></LoadsTable>
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
                </div>
            </div>
        </Layout>
    );
};

DriverDetailsPage.authenticationEnabled = true;

export default DriverDetailsPage;
