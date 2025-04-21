import { Menu, Transition } from '@headlessui/react';
import {
    ChevronDownIcon,
    CurrencyDollarIcon,
    MapPinIcon,
    TruckIcon,
    ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/solid';
import classNames from 'classnames';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import React, { Fragment } from 'react';
import { formatValue } from 'react-currency-input-field';
import { useUserContext } from '../components/context/UserContext';
import Layout from '../components/layout/Layout';
import LoadStatusBadge from '../components/loads/LoadStatusBadge';
import { PageWithAuth } from '../interfaces/auth';
import { ExpandedLoad } from '../interfaces/models';
import { DashboardStats, DashboardStatsTimeFrameType } from '../interfaces/stats';
import { getDashboardStats, getUpcomingLoads } from '../lib/rest/dashboard';
import LoadViewToggle from 'components/loads/loadviewtoggle';
import Spinner from 'components/Spinner';

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
}) => {
    return (
        <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-none">
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <props.icon className="w-6 h-6 text-gray-400" aria-hidden="true" />
                    </div>
                    <div className="flex-1 w-0 ml-5">
                        <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">{props.title}</dt>
                            <dd>
                                <div className="text-lg font-medium text-gray-900">{props.value}</div>
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard: PageWithAuth = () => {
    const { data: session } = useSession();
    const { defaultCarrier } = useUserContext();

    const [loadsLoading, setLoadsLoading] = React.useState(true);
    const [loadsList, setLoadsList] = React.useState<ExpandedLoad[]>([]);

    const [loadingStats, setLoadingStats] = React.useState(true);
    const [stats, setStats] = React.useState<DashboardStats>(null);
    const [statsTimeFrame, setStatsTimeFrame] = React.useState<DashboardStatsTimeFrameType>(
        DashboardStatsTimeFrameType.ONE_WEEK,
    );

    // Get loads on page load
    React.useEffect(() => {
        reloadLoads();
        getStats();
    }, []);

    const reloadLoads = async () => {
        const loads = await getUpcomingLoads();

        setLoadsList(loads);
        setLoadsLoading(false);
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

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Dashboard</h1>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl ">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8 ">
                    <h1 className="text-2xl font-bold text-slate-700">
                        Welcome back
                        <span className="font-light text-black cappitalize">
                            &nbsp;{session?.user?.name ? session?.user?.name + '!' : defaultCarrier?.name + '!'}
                        </span>
                    </h1>

                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-0 md:px-8  ">
                    <>
                        {!loadsLoading && loadsList.length === 0 ? (
                            <div className="relative mx-5 mb-4 overflow-hidden border border-gray-200 shadow-sm md:mx-0 bg-gradient-to-b from-blue-50 to-white rounded-xl">
                                <div className="flex flex-col items-center max-w-2xl px-6 py-16 mx-auto text-center">
                                    <div className="flex items-center justify-center p-3 mb-6 bg-blue-100 rounded-full">
                                        <ClipboardDocumentCheckIcon
                                            className="w-8 h-8 text-blue-600"
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <h2 className="mt-2 text-2xl font-semibold text-gray-900">No Upcoming Loads</h2>
                                    <p className="max-w-sm mt-2 text-gray-500">
                                        You don&rsquo;t have any upcoming or in-progress loads at the moment. Ready to
                                        add your next load?
                                    </p>
                                    <div className="flex flex-col items-center mt-8 gap-y-6">
                                        <Link href="/loads/create" className="w-full sm:w-auto">
                                            <button
                                                type="button"
                                                className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-white transition duration-150 ease-in-out bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                                            >
                                                <PlusIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                                                Create New Load
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <LoadViewToggle loadsList={loadsLoading ? [] : loadsList} />
                        )}
                    </>

                    <div className="mx-4 mt-2 bg-slate-50 border border-gray-200 rounded-lg md:mx-0">
                        <div className="flex flex-row justify-between p-4 pb-2 mb-2 border-b place-items-baseline border-slate-200">
                            <h2 className="mb-4 text-base font-medium leading-6 text-gray-700">
                                Loads Activity Overview
                            </h2>
                            <div className="relative inline-flex rounded-md shadow-sm">
                                <button
                                    type="button"
                                    className="relative inline-flex items-center px-3 py-2 text-sm text-gray-900 bg-white font-base rounded-l-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
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

                        <div className="grid grid-cols-1 gap-5 p-4 mt-2 sm:grid-cols-2 lg:grid-cols-3 ">
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
                                    ></StatBox>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

Dashboard.authenticationEnabled = true;

export default Dashboard;
