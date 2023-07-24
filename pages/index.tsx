import { LocationMarkerIcon, TruckIcon } from '@heroicons/react/outline';
import { Carrier } from '@prisma/client';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { useUserContext } from '../components/context/UserContext';
import Layout from '../components/layout/Layout';
import { PageWithAuth } from '../interfaces/auth';
import { ExpandedLoad } from '../interfaces/models';
import { loadStatus } from '../lib/load/load-utils';
import { getLoadsExpanded } from '../lib/rest/load';

const Dashboard: PageWithAuth = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const [carriers] = useUserContext();

    const [defaultCarrier, setDefaultCarrier] = React.useState<Carrier | null>(null);
    const [loadsLoading, setLoadsLoading] = React.useState(true);
    const [loadsList, setLoadsList] = React.useState<ExpandedLoad[]>([]);

    // Get loads on page load
    React.useEffect(() => {
        reloadLoads({ limit: 10, offset: 0 });
    }, []);

    React.useEffect(() => {
        if (session) {
            const defaultCarrier = carriers.find((carrier) => carrier.id === session.user?.defaultCarrierId) || null;
            setDefaultCarrier(defaultCarrier);
        }
    }, [carriers]);

    const reloadLoads = async ({ limit, offset }: { limit: number; offset: number }) => {
        const { loads, metadata: metadataResponse } = await getLoadsExpanded({
            limit,
            offset,
            expand: 'customer,shipper,receiver,driver,stops',
        });
        setLoadsList(loads);
        setLoadsLoading(false);
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Dashboard</h1>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl text-gray-900">
                        Welcome back
                        <span className="font-semibold">
                            &nbsp;{session?.user?.name ? session?.user?.name : defaultCarrier?.name}
                        </span>
                        !
                    </h1>

                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-0 md:px-8">
                    {!loadsLoading && (
                        <>
                            {loadsList.length === 0 ? (
                                <div className="flex justify-center">
                                    <Link href="/loads/create">
                                        <button
                                            type="button"
                                            className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            + Create Load
                                        </button>
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <h3 className="px-5 mb-2 font-bold md:px-0">Todays Load Schedule</h3>
                                    <div className="flex pb-10 overflow-x-scroll hide-scroll-bar">
                                        <ul role="list" className="flex px-5 space-x-6 md:px-0 flex-nowrap">
                                            {loadsList.map((load) => (
                                                <Link key={load.id} href={`/loads/${load.id}`}>
                                                    <li className="overflow-hidden border border-gray-200 cursor-pointer rounded-xl w-80">
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
                                                        <dl className="px-3 py-3 -my-3 text-sm leading-6 divide-y divide-gray-100">
                                                            <div className="flex justify-between py-2 gap-x-4">
                                                                <dt className="text-gray-500">
                                                                    <div className="text-xs">{load.refNum}</div>
                                                                    <div className="font-medium text-gray-900">
                                                                        {load.customer.name}
                                                                    </div>
                                                                </dt>
                                                                <dd className="text-gray-700">
                                                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md">
                                                                        {loadStatus(load)}
                                                                    </span>
                                                                </dd>
                                                            </div>
                                                            <div className="flex justify-between py-3 gap-x-4">
                                                                <ul role="list" className="-mb-8">
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
                                                                        <div className="relative pb-8">
                                                                            <div className="relative flex items-center space-x-3">
                                                                                <div className="relative px-1">
                                                                                    <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full ring-8 ring-white">
                                                                                        <LocationMarkerIcon
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
                                                            <div className="flex justify-between py-3 gap-x-4">
                                                                <dt className="">
                                                                    <div className="text-xs text-gray-500">
                                                                        Driver details
                                                                    </div>
                                                                    <div>
                                                                        {load.driver && (
                                                                            <Link
                                                                                href={`/drivers/${load.driver.id}`}
                                                                                className="font-medium"
                                                                            >
                                                                                {load.driver?.name}
                                                                            </Link>
                                                                        )}
                                                                    </div>
                                                                </dt>
                                                                <dd className=""></dd>
                                                            </div>
                                                        </dl>
                                                    </li>
                                                </Link>
                                            ))}
                                        </ul>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                    {loadsLoading && (
                        <div className="flex pb-10 overflow-x-scroll hide-scroll-bar">
                            <ul role="list" className="flex space-x-6 flex-nowrap">
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
                    )}
                </div>
            </div>
        </Layout>
    );
};

Dashboard.authenticationEnabled = true;

export default Dashboard;
