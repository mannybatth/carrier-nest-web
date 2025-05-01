import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, Fragment } from 'react';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import Layout from '../../components/layout/Layout';
import { LoadsTableSkeleton } from '../../components/loads/LoadsTable';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad } from '../../interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { deleteLoadById, getLoadsExpanded } from '../../lib/rest/load';
import { useLocalStorage } from '../../lib/useLocalStorage';
import { useUserContext } from 'components/context/UserContext';
import { DashboardStats, DashboardStatsTimeFrameType } from 'interfaces/stats';
import { getDashboardStats } from 'lib/rest/dashboard';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, CurrencyDollarIcon, TruckIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';

import { formatValue } from 'react-currency-input-field';
import LoadsTableSortDropdown from 'components/loads/LoadsTableSortDropdown';
import { LoadsTableCompact } from 'components/loads/LoadsTableCompact';

const StatBoxSkeleton = () => {
    return (
        <div className="overflow-hidden rounded-lg">
            <div className="flex items-center">
                <div className="bg-slate-200 w-full h-[88px] animate-pulse"></div>
            </div>
        </div>
    );
};

const StatBox = (props: {
    title: string;
    value: string;
    icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
    valueColor?: string;
}) => {
    return (
        <div className="overflow-hidden bg-transparent border border-gray-200 rounded-lg shadow-sm">
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <props.icon className="w-6 h-6 text-gray-400" aria-hidden="true" />
                    </div>
                    <div className="flex-1 w-0 ml-5">
                        <dl>
                            <dt className="text-xs font-medium text-gray-500 truncate">{props.title}</dt>
                            <dd>
                                <div
                                    className={`text-lg font-medium ${
                                        props.valueColor ? `${props.valueColor}` : 'text-gray-800'
                                    } `}
                                >
                                    {props.value}
                                </div>
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
};

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

    const [loadingStats, setLoadingStats] = React.useState(true);
    const [stats, setStats] = React.useState<DashboardStats>(null);
    const [statsTimeFrame, setStatsTimeFrame] = React.useState<DashboardStatsTimeFrameType>(
        DashboardStatsTimeFrameType.ALL,
    );

    useEffect(() => {
        getStats();
    }, []);

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
            getDriverAssignments: true,
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

        setLoadIdToDelete(null);
    };

    const getStats = async (timeFrameSelected?: DashboardStatsTimeFrameType) => {
        const stats = await getDashboardStats(timeFrameSelected ?? statsTimeFrame);
        setStats(stats);
        setLoadingStats(false);
    };

    const changeStatsTimeFrame = async (timeFrameSelected: DashboardStatsTimeFrameType) => {
        setLoadingStats(true);
        setStatsTimeFrame(timeFrameSelected);
        getStats(timeFrameSelected);
    };

    const convertEnumValueToUIString = (enumValue: DashboardStatsTimeFrameType) => {
        switch (enumValue) {
            case DashboardStatsTimeFrameType.ONE_WEEK:
                return 'One Week';
                break;
            case DashboardStatsTimeFrameType.TWO_WEEK:
                return 'Two Week';
                break;
            case DashboardStatsTimeFrameType.MONTH:
                return 'Month';
                break;
            case DashboardStatsTimeFrameType.YEAR:
                return 'One Year';
                break;
            case DashboardStatsTimeFrameType.ALL:
                return 'All Time';
                break;
        }
    };

    const loadsTableHeaders = [
        'refNum',
        'customer.name',
        'loadNum',
        'status',
        'shipper.date',
        'receiver.date',
        'shipper.city',
        'receiver.city',
        'rate',
    ];
    // Create sort options from headers
    const sortOptions = [
        ...(loadsTableHeaders.includes('refNum') ? [{ key: 'refNum', title: 'Order #' }] : []),
        ...(loadsTableHeaders.includes('customer.name') ? [{ key: 'customer.name', title: 'Customer' }] : []),
        ...(loadsTableHeaders.includes('loadNum') ? [{ key: 'loadNum', title: 'Load #' }] : []),
        ...(loadsTableHeaders.includes('status') ? [{ key: 'status', title: 'Status' }] : []),
        ...(loadsTableHeaders.includes('shipper.date') ? [{ key: 'shipper.date', title: 'Pickup Date' }] : []),
        ...(loadsTableHeaders.includes('receiver.date') ? [{ key: 'receiver.date', title: 'Delivery Date' }] : []),
        ...(loadsTableHeaders.includes('shipper.city') ? [{ key: 'shipper.city', title: 'Pickup Location' }] : []),
        ...(loadsTableHeaders.includes('receiver.city') ? [{ key: 'receiver.city', title: 'Delivery Location' }] : []),
        ...(loadsTableHeaders.includes('rate') ? [{ key: 'rate', title: 'Rate' }] : []),
    ];

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">All Loads</h1>

                    <div className="flex gap-2">
                        <Link href="/loads/create">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 h-full py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                + Create Load
                            </button>
                        </Link>
                    </div>
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
                <div className="py-2 mx-auto max-w-7xl  ">
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
                    <div className="mt-2 md:mx-8  mx-6 mb-6 bg-slate-50 border border-gray-100 rounded-lg  ">
                        <div className="flex flex-col gap-2 sm:flex-row justify-between p-4 pb-2 mb-2  place-items-baseline  ">
                            <h2 className="text-lg font-semibold leading-6 text-gray-600">Loads Activity Overview</h2>
                            <div className="relative inline-flex rounded-md shadow-sm">
                                <button
                                    type="button"
                                    className="relative inline-flex items-center whitespace-nowrap px-3 py-2 text-sm text-gray-600 bg-gray-100 font-base rounded-l-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
                                >
                                    Past: {convertEnumValueToUIString(statsTimeFrame)}
                                </button>
                                <Menu as="div" className="block -ml-px">
                                    <Menu.Button className="relative inline-flex items-center h-full px-2 py-2 text-gray-400 bg-white rounded-r-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10">
                                        <span className="sr-only">Open options</span>
                                        <ChevronDownIcon className="w-5 h-5" aria-hidden="true" />
                                    </Menu.Button>
                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-100"
                                        enterFrom="transform opacity-0 scale-95"
                                        enterTo="transform opacity-100 scale-100"
                                        leave="transition ease-in duration-75"
                                        leaveFrom="transform opacity-100 scale-100"
                                        leaveTo="transform opacity-0 scale-95"
                                    >
                                        <Menu.Items
                                            key={'statsdropdownitems'}
                                            className="absolute left-0 z-10 mt-2 -mr-1 origin-top-right bg-white rounded-md shadow-lg w-36 md:right-0 md:left-auto ring-1 ring-black ring-opacity-5 focus:outline-none"
                                        >
                                            <div className="py-1" key={'statsdropdowndiv'}>
                                                {Object.keys(DashboardStatsTimeFrameType).map((key) => {
                                                    return (
                                                        <Menu.Item key={`${key}`}>
                                                            {({ active }) => (
                                                                <a
                                                                    onClick={() =>
                                                                        changeStatsTimeFrame(
                                                                            DashboardStatsTimeFrameType[
                                                                                key
                                                                            ] as DashboardStatsTimeFrameType,
                                                                        )
                                                                    }
                                                                    className={classNames(
                                                                        active
                                                                            ? 'bg-gray-100 text-gray-900'
                                                                            : 'text-gray-700',
                                                                        'block px-4 py-2 text-sm',
                                                                    )}
                                                                >
                                                                    {convertEnumValueToUIString(
                                                                        DashboardStatsTimeFrameType[key],
                                                                    )}
                                                                </a>
                                                            )}
                                                        </Menu.Item>
                                                    );
                                                })}
                                            </div>
                                        </Menu.Items>
                                    </Transition>
                                </Menu>
                            </div>
                        </div>

                        <div className="flex flex-col sm:grid gap-4 p-4 mt-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-3 max-lg:grid-cols-5 ">
                            {loadingStats ? (
                                <>
                                    <StatBoxSkeleton></StatBoxSkeleton>
                                    <StatBoxSkeleton></StatBoxSkeleton>
                                    <StatBoxSkeleton></StatBoxSkeleton>
                                    <StatBoxSkeleton></StatBoxSkeleton>
                                    <StatBoxSkeleton></StatBoxSkeleton>
                                </>
                            ) : (
                                <>
                                    {/* <StatBoxSkeleton></StatBoxSkeleton> */}
                                    <StatBox
                                        title={'Total Loads'}
                                        value={`${stats.totalLoads}`}
                                        icon={TruckIcon}
                                    ></StatBox>
                                    <StatBox
                                        title={'Loads in Progress'}
                                        value={`${stats.totalInProgress}`}
                                        icon={TruckIcon}
                                    ></StatBox>
                                    <StatBox
                                        title={'Ready for Invoicing'}
                                        value={`${stats.totalReadyToInvoice}`}
                                        icon={TruckIcon}
                                    ></StatBox>
                                    <StatBox
                                        title={'Total Revenue'}
                                        value={`${formatValue({
                                            value: stats.totalRevenue.toString(),
                                            groupSeparator: ',',
                                            decimalSeparator: '.',
                                            prefix: '$',
                                            decimalScale: 2,
                                        })}`}
                                        icon={CurrencyDollarIcon}
                                        valueColor="text-green-600"
                                    ></StatBox>
                                    <StatBox
                                        title={'Payments Received'}
                                        value={`${formatValue({
                                            value: stats.totalPaid.toString(),
                                            groupSeparator: ',',
                                            decimalSeparator: '.',
                                            prefix: '$',
                                            decimalScale: 2,
                                        })}`}
                                        icon={CurrencyDollarIcon}
                                        valueColor="text-green-600"
                                    ></StatBox>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="px-5 my-4 md:block  sm:px-2 md:px-4 mx-5 sm:mx-6 md:mx-8 py-4 pb-5 -mb-2 mt-0 bg-white shadow-sm  border-gray-200  border-t border-l border-r rounded-tl-lg rounded-tr-lg">
                        <div className="flex flex-row items-center justify-between">
                            <h1 className="flex-1 text-xl mb-2 sm:mb-0 font-bold text-gray-800">All Loads</h1>
                            <div className="flex gap-2">
                                <LoadsTableSortDropdown
                                    options={sortOptions}
                                    currentSort={sort}
                                    onChange={changeSort}
                                />
                                <Link className="hidden sm:block" href="/loads/create">
                                    <button
                                        type="button"
                                        className="inline-flex items-center px-3.5 h-full py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        + Create Load
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="px-5 sm:px-6 md:px-8">
                        {loadingLoads ? (
                            <LoadsTableSkeleton limit={lastLoadsTableLimit} />
                        ) : (
                            <LoadsTableCompact
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
