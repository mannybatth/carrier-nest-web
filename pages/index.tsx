import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, CurrencyDollarIcon, MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Carrier } from '@prisma/client';
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
    const [carriers] = useUserContext();

    const [defaultCarrier, setDefaultCarrier] = React.useState<Carrier | null>(null);
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

    React.useEffect(() => {
        if (session) {
            const defaultCarrier = carriers.find((carrier) => carrier.id === session.user?.defaultCarrierId) || null;
            setDefaultCarrier(defaultCarrier);
        }
    }, [carriers]);

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
                        <span className="font-light text-black">
                            &nbsp;{session?.user?.name ? session?.user?.name + '!' : defaultCarrier?.name + '!'}
                        </span>
                    </h1>

                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-0 md:px-8 ">
                    {!loadsLoading && (
                        <>
                            {loadsList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center pb-10 h-[50vh]">
                                    <Image
                                        className="absolute top-18 -right-0 top-12 md:top-20"
                                        alt="Truck BG"
                                        src={'/truckcbg.jpeg'}
                                        height={150}
                                        width={150}
                                    />
                                    <div className="flex flex-col items-center p-6 mt-6 bg-white rounded w-80">
                                        <h1 className="mb-2 text-xl font-bold text-center">Create a New Load</h1>
                                        <p className="mb-6 text-sm text-center text-gray-600">
                                            Easily import a load using our
                                            <span className="px-1 m-1 italic font-bold border rounded shadow-sm whitespace-nowrap bg-slate-50 text-slate-700 border-slate-300">
                                                Rate Confirmation AI
                                            </span>
                                            click below to get started.
                                        </p>
                                        <Link href="/loads/create">
                                            <button
                                                type="button"
                                                className="flex w-full px-4 py-2 font-bold text-white transition-colors duration-200 ease-in-out bg-blue-600 rounded hover:bg-blue-700 focus:outline-none"
                                            >
                                                <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                                                <p className="w-full text-sm font-semibold text-center">
                                                    Create New Load
                                                </p>
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h3 className="px-5 mb-2 font-bold md:px-0">Upcoming & In Progress Loads</h3>
                                    <div className="flex pb-10 overflow-x-auto">
                                        <ul role="list" className="flex px-5 space-x-6 md:px-0 flex-nowrap">
                                            {loadsList.map((load, index) => (
                                                <li
                                                    key={index}
                                                    className="overflow-hidden border border-gray-200 rounded-xl w-80"
                                                >
                                                    <Link href={`/loads/${load.id}`}>
                                                        {load && load.routeEncoded && (
                                                            <Image
                                                                src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/path-5(${encodeURIComponent(
                                                                    load.routeEncoded,
                                                                )})/auto/900x300?padding=50,50,50,50&access_token=${
                                                                    process.env.NEXT_PUBLIC_MAPBOX_TOKEN
                                                                }`}
                                                                width={900}
                                                                height={300}
                                                                alt="Load Route"
                                                                loading="lazy"
                                                                className="w-full h-auto mb-1"
                                                            ></Image>
                                                        )}
                                                        {!(load && load.routeEncoded) && (
                                                            <div className="flex items-center p-6 border-b gap-x-4 border-gray-900/5 bg-gray-50"></div>
                                                        )}
                                                        <dl className="px-3 text-sm leading-6 divide-y divide-gray-100">
                                                            <div className="flex justify-between py-2 gap-x-4">
                                                                <dt className="text-gray-500">
                                                                    <div className="text-xs">{load.refNum}</div>
                                                                    <div className="font-medium text-gray-900">
                                                                        {load.customer.name}
                                                                    </div>
                                                                </dt>
                                                                <dd className="text-gray-700">
                                                                    <LoadStatusBadge load={load} />
                                                                </dd>
                                                            </div>
                                                            <div className="flex justify-between py-3 gap-x-4">
                                                                <ul role="list" className="flex-1">
                                                                    <li>
                                                                        <div className="relative z-auto pb-3">
                                                                            <span
                                                                                className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                                                                                aria-hidden="true"
                                                                            />
                                                                            <div className="relative flex items-center space-x-3">
                                                                                <div className="relative px-1">
                                                                                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full ring-8 ring-white">
                                                                                        <TruckIcon
                                                                                            className="w-5 h-5 text-green-800"
                                                                                            aria-hidden="true"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-xs text-gray-500">
                                                                                        <span className="text-sm font-medium text-gray-900">
                                                                                            {new Intl.DateTimeFormat(
                                                                                                'en-US',
                                                                                                {
                                                                                                    year: 'numeric',
                                                                                                    month: 'long',
                                                                                                    day: '2-digit',
                                                                                                },
                                                                                            ).format(
                                                                                                new Date(
                                                                                                    load.shipper.date,
                                                                                                ),
                                                                                            )}
                                                                                        </span>{' '}
                                                                                        @ {load.shipper.time}
                                                                                        <div>{load.shipper.name}</div>
                                                                                        <div>
                                                                                            {load.shipper.city},{' '}
                                                                                            {load.shipper.state}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                    {load.stops.length > 0 && (
                                                                        <li>
                                                                            <div className="relative pb-3">
                                                                                <span
                                                                                    className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                                                                                    aria-hidden="true"
                                                                                />
                                                                                <div className="relative flex items-center space-x-3">
                                                                                    <div className="relative px-1">
                                                                                        <div className="flex items-center justify-center w-8 h-8 ">
                                                                                            <div className="w-4 h-4 bg-gray-100 rounded-full ring-8 ring-white"></div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="text-xs text-gray-500">
                                                                                            <div>
                                                                                                {load.stops.length} stop
                                                                                                {load.stops.length >
                                                                                                    1 && 's'}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </li>
                                                                    )}
                                                                    <li>
                                                                        <div className="relative pb-2">
                                                                            <div className="relative flex items-center space-x-3">
                                                                                <div className="relative px-1">
                                                                                    <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full ring-8 ring-white">
                                                                                        <MapPinIcon
                                                                                            className="w-5 h-5 text-red-800"
                                                                                            aria-hidden="true"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-xs text-gray-500">
                                                                                        <span className="text-sm font-medium text-gray-900">
                                                                                            {new Intl.DateTimeFormat(
                                                                                                'en-US',
                                                                                                {
                                                                                                    year: 'numeric',
                                                                                                    month: 'long',
                                                                                                    day: '2-digit',
                                                                                                },
                                                                                            ).format(
                                                                                                new Date(
                                                                                                    load.receiver.date,
                                                                                                ),
                                                                                            )}
                                                                                        </span>{' '}
                                                                                        @ {load.receiver.time}
                                                                                        <div>{load.receiver.name}</div>
                                                                                        <div>
                                                                                            {load.receiver.city},{' '}
                                                                                            {load.receiver.state}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                        </dl>
                                                    </Link>
                                                    <dl className="px-3 text-sm leading-6 divide-y divide-gray-100">
                                                        <div></div>
                                                        <div className="flex justify-between py-3">
                                                            <dt className="">
                                                                <div className="text-xs text-gray-500">
                                                                    Driver details
                                                                </div>
                                                                <div>
                                                                    {load.driverAssignments?.length > 0 ? (
                                                                        load.driverAssignments.map(
                                                                            (assignment, index) => (
                                                                                <span
                                                                                    key={`${assignment.driver.id}-${index}`}
                                                                                >
                                                                                    <Link
                                                                                        href={`/drivers/${assignment.driver.id}`}
                                                                                        className="font-medium"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                        }}
                                                                                    >
                                                                                        {assignment.driver?.name}
                                                                                    </Link>
                                                                                    {index <
                                                                                    load.driverAssignments.length - 1
                                                                                        ? ', '
                                                                                        : ''}
                                                                                </span>
                                                                            ),
                                                                        )
                                                                    ) : (
                                                                        <div className="text-gray-400">
                                                                            No driver assigned
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </dt>
                                                            <dd className=""></dd>
                                                        </div>
                                                    </dl>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                    {loadsLoading && (
                        <>
                            <h3 className="px-5 mb-2 font-bold md:px-0">Upcoming & In Progress Loads</h3>
                            <div className="flex pb-10 overflow-x-scroll hide-scroll-bar">
                                <ul role="list" className="flex px-5 space-x-6 md:px-0 flex-nowrap">
                                    {[...Array(10)].map((_, index) => (
                                        <li
                                            key={index}
                                            className="overflow-hidden cursor-pointer rounded-xl w-80 h-96 animate-pulse"
                                        >
                                            <div className="w-full h-full bg-slate-200"></div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    )}

                    <div className="mx-4 mt-2 bg-gray-100 rounded-lg md:mx-0">
                        <div className="flex flex-row justify-between p-4 pb-2 mb-2 border-b place-items-baseline border-slate-200">
                            <h2 className="mb-4 text-lg font-bold leading-6 text-gray-700">Loads Activity Overview</h2>
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
