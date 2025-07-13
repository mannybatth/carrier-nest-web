import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import React from 'react';
import { useUserContext } from '../components/context/UserContext';
import Layout from '../components/layout/Layout';
import { PageWithAuth } from '../interfaces/auth';
import { ExpandedLoad } from '../interfaces/models';
import { getUpcomingLoads } from '../lib/rest/dashboard';
import LoadViewToggle from '../components/loads/DashboardLoadViewToggle';
import DashboardStatsDigest from '../components/DashboardStatsDigest';
import SwitchWithLabel from '../components/switchWithLabel';

const Dashboard: PageWithAuth = () => {
    const { data: session } = useSession();
    const { defaultCarrier } = useUserContext();

    const [loadsLoading, setLoadsLoading] = React.useState(true);
    const [loadsList, setLoadsList] = React.useState<ExpandedLoad[]>([]);
    const [todayData, setTodayData] = React.useState<boolean>(localStorage.getItem('todayDataOnly') === 'true');

    // Get loads on page load
    React.useEffect(() => {
        reloadLoads();
    }, []);

    const reloadLoads = async (todayDataOnly?: boolean) => {
        setLoadsLoading(true);
        setLoadsList([]);
        const loads = await getUpcomingLoads(todayDataOnly ?? todayData);

        setLoadsList(loads);
        setLoadsLoading(false);

        // If no loads are found and today-only is enabled, automatically disable it after 1 second
        if (loads.length === 0 && (todayDataOnly ?? todayData)) {
            setTimeout(async () => {
                localStorage.setItem('todayDataOnly', 'false');
                setTodayData(false);

                // Reload with all data if we just disabled today-only
                if (todayDataOnly ?? todayData) {
                    setLoadsLoading(true);
                    const allLoads = await getUpcomingLoads(false);
                    setLoadsList(allLoads);
                    setLoadsLoading(false);
                }
            }, 1000);
        }
    };

    const handleTodaysDataOnlyToggled = () => {
        localStorage.setItem('todayDataOnly', (!todayData).toString());
        setTodayData(!todayData);
        reloadLoads(!todayData);
    };

    // update loadsList with new expanded load passed in
    const updateLoadStatus = (updatedLoad: ExpandedLoad) => {
        // sort loadslist by pickup date and priotize status as following booked, inProgress, delivered
        // set loadsList to be sorted by pickup date
        // remove the load from the list and add it to the end
        setLoadsList((prevLoads) => {
            const filteredLoads = prevLoads.filter((load) => load.id !== updatedLoad.id);
            const sortedLoads = [...filteredLoads, updatedLoad].sort((a, b) => {
                if (a.shipper.date < b.shipper.date) return -1;
                if (a.shipper.date > b.shipper.date) return 1;
                return 0;
            });
            // sort by status next
            sortedLoads.sort((a, b) => {
                const statusOrder = ['BOOKED', 'IN_PROGRESS', 'DELIVERED'];
                const aStatusIndex = statusOrder.indexOf(a.status);
                const bStatusIndex = statusOrder.indexOf(b.status);
                return aStatusIndex - bStatusIndex;
            });
            return sortedLoads;
        });
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
                <div className="px-6 md:px-8  ">
                    <>
                        {!loadsLoading && loadsList?.length === 0 ? (
                            <>
                                <div className="relative mx-5 mb-4 overflow-hidden border border-blue-100 shadow-md md:mx-0 bg-gradient-to-b from-blue-50 to-white rounded-xl">
                                    <div className="flex flex-col items-center justify-center max-w-2xl px-6 py-16 mx-auto text-center h-[88vh]">
                                        <div className="flex items-center justify-center p-3 mb-2 bg-blue-100 rounded-full">
                                            <ClipboardDocumentCheckIcon
                                                className="w-8 h-8 text-blue-600"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <h2 className="mt-2 text-2xl font-semibold text-gray-900">No Upcoming Loads</h2>
                                        <p className="max-w-sm mt-2 text-gray-500">
                                            You don&rsquo;t have any upcoming or in-progress loads at the moment. Ready
                                            to add your next load?
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
                            </>
                        ) : (
                            <LoadViewToggle
                                todayDataOnly={handleTodaysDataOnlyToggled}
                                loadsList={loadsLoading ? [] : loadsList}
                                updateLoadStatus={updateLoadStatus}
                            />
                        )}
                    </>

                    <DashboardStatsDigest data={loadsList} loading={loadsLoading} />
                </div>
            </div>
        </Layout>
    );
};

Dashboard.authenticationEnabled = true;

export default Dashboard;
