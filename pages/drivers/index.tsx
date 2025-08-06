import { Driver } from '@prisma/client';
import { useUserContext } from 'components/context/UserContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import React, { useEffect } from 'react';
import { CustomersTableSkeleton } from '../../components/customers/CustomersTable';
import ActivateDriverDialog from '../../components/dialogs/ActivateDriverDialog';
import DeactivateDriverDialog from '../../components/dialogs/DeactivateDriverDialog';
import DriversTable from '../../components/drivers/DriversTable';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import { PageWithAuth } from '../../interfaces/auth';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { getAllDrivers, deactivateDriver, activateDriver } from '../../lib/rest/driver';
import { useLocalStorage } from '../../lib/useLocalStorage';
import { calculateAvailableSeats } from '../../lib/driver/subscription-utils';

const DriversPage: PageWithAuth = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const { isProPlan, isLoadingCarrier, defaultCarrier } = useUserContext();
    const searchParams = new URLSearchParams(router.query as any);
    const sortProps = sortFromQuery({
        sortBy: searchParams.get('sortBy'),
        sortOrder: searchParams.get('sortOrder'),
    });
    const limitProp = Number(searchParams.get('limit')) || 20;
    const offsetProp = Number(searchParams.get('offset')) || 0;

    const [lastDriversTableLimit, setLastDriversTableLimit] = useLocalStorage('lastDriversTableLimit', limitProp);

    const [loadingDrivers, setLoadingDrivers] = React.useState(true);
    const [tableLoading, setTableLoading] = React.useState(false);

    const [openDeactivateDriverDialog, setOpenDeactivateDriverDialog] = React.useState(false);
    const [driverToDeactivate, setDriverToDeactivate] = React.useState<{
        id: string;
        name: string;
        phone: string;
    } | null>(null);

    const [openActivateDriverDialog, setOpenActivateDriverDialog] = React.useState(false);
    const [driverToActivate, setDriverToActivate] = React.useState<{
        id: string;
        name: string;
        phone: string;
    } | null>(null);

    const [driversList, setDriversList] = React.useState<Driver[]>([]);

    const [sort, setSort] = React.useState<Sort>(sortProps);
    const [limit, setLimit] = React.useState(limitProp);
    const [offset, setOffset] = React.useState(offsetProp);
    const [metadata, setMetadata] = React.useState<PaginationMetadata>({
        total: 0,
        currentOffset: offsetProp,
        currentLimit: limitProp,
    });

    useEffect(() => {
        setLimit(limitProp);
        setOffset(offsetProp);
        reloadDrivers({ sort, limit: limitProp, offset: offsetProp });
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
        reloadDrivers({ sort, limit, offset, useTableLoading: true });
    };

    const reloadDrivers = async ({
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
        !useTableLoading && setLoadingDrivers(true);
        useTableLoading && setTableLoading(true);
        const { drivers, metadata: metadataResponse } = await getAllDrivers({
            limit,
            offset,
            sort,
        });
        setLastDriversTableLimit(drivers.length !== 0 ? drivers.length : lastDriversTableLimit);
        setDriversList(drivers);
        setMetadata(metadataResponse);
        setLoadingDrivers(false);
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
        reloadDrivers({ sort, limit: metadata.prev.limit, offset: metadata.prev.offset, useTableLoading: true });
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
        reloadDrivers({ sort, limit: metadata.next.limit, offset: metadata.next.offset, useTableLoading: true });
    };

    const handleDeactivateDriver = (id: string, name: string, phone: string) => {
        setDriverToDeactivate({ id, name, phone });
        setOpenDeactivateDriverDialog(true);
    };

    const confirmDeactivateDriver = async () => {
        if (!driverToDeactivate) return;

        try {
            await deactivateDriver(driverToDeactivate.id);

            // Update local state immediately for better UX
            setDriversList((prevDrivers) =>
                prevDrivers.map((driver) =>
                    driver.id === driverToDeactivate.id ? { ...driver, active: false } : driver,
                ),
            );

            notify({
                title: 'Driver deactivated',
                message: `${driverToDeactivate.name} has been deactivated successfully`,
                type: 'success',
            });

            setOpenDeactivateDriverDialog(false);
            setDriverToDeactivate(null);

            // Reload drivers data to ensure consistency
            reloadDrivers({ sort, limit, offset, useTableLoading: false });
        } catch (error) {
            notify({ title: 'Error Deactivating Driver', message: error.message, type: 'error' });
            throw error; // Re-throw to let the dialog handle the error
        }
    };

    const handleActivateDriver = (id: string, name: string, phone: string) => {
        setDriverToActivate({ id, name, phone });
        setOpenActivateDriverDialog(true);

        // Debug: log the seat calculation using shared utility
        const seatInfo = calculateAvailableSeats(driversList, defaultCarrier);
        console.log(`[Drivers List Page] Using shared calculation:`, seatInfo);
    };

    const confirmActivateDriver = async () => {
        if (!driverToActivate) return;

        const driver = driversList.find((d) => d.id === driverToActivate.id);

        // Optimistically update the UI
        setDriversList((prevDrivers) =>
            prevDrivers.map((d) => (d.id === driverToActivate.id ? { ...d, active: true } : d)),
        );

        try {
            await activateDriver(driverToActivate.id);
            notify({
                title: 'Driver activated',
                message: `${driverToActivate.name} has been activated successfully`,
                type: 'success',
            });

            setOpenActivateDriverDialog(false);
            setDriverToActivate(null);

            // Reload drivers data to ensure consistency
            reloadDrivers({ sort, limit, offset, useTableLoading: false });
        } catch (error) {
            // Revert the optimistic update if API call failed
            setDriversList((prevDrivers) =>
                prevDrivers.map((d) => (d.id === driverToActivate.id ? { ...d, active: false } : d)),
            );
            notify({ title: 'Error Activating Driver', message: error.message, type: 'error' });
            throw error; // Re-throw to let the dialog handle the error
        }
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
            <>
                <DeactivateDriverDialog
                    open={openDeactivateDriverDialog}
                    onClose={() => {
                        setOpenDeactivateDriverDialog(false);
                        setDriverToDeactivate(null);
                    }}
                    onConfirm={confirmDeactivateDriver}
                    driverName={driverToDeactivate?.name || ''}
                    driverPhone={driverToDeactivate?.phone || ''}
                />

                <ActivateDriverDialog
                    open={openActivateDriverDialog}
                    onClose={() => {
                        setOpenActivateDriverDialog(false);
                        setDriverToActivate(null);
                    }}
                    onConfirm={confirmActivateDriver}
                    driverName={driverToActivate?.name || ''}
                    driverPhone={driverToActivate?.phone || ''}
                    availableSeats={calculateAvailableSeats(driversList, defaultCarrier).availableSeats}
                    totalSeats={calculateAvailableSeats(driversList, defaultCarrier).totalSeats}
                />

                <div className="py-2 mx-auto max-w-7xl">
                    {!isProPlan && !isLoadingCarrier && (
                        <div className="mx-5 my-4 mb-6 sm:mx-6 md:mx-8">
                            <div className="p-6 border border-blue-100 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-medium text-blue-900">
                                            Add more drivers to your plan
                                        </h3>
                                        <p className="mt-1 text-sm text-blue-700">
                                            Upgrade to Pro and select the number of drivers you need for your fleet.
                                            Scale your driver management as your business grows.
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
                    <div className="hidden px-5 my-4 md:block sm:px-2 md:px-4 mx-8 py-4 pb-5 -mb-2 mt-0 bg-white shadow-md  border-gray-200  border-t border-l border-r rounded-tl-lg rounded-tr-lg">
                        <div className="flex flex-col md:flex-row items-center justify-between">
                            <h1 className=" flex-1 text-xl font-bold text-gray-800">Drivers</h1>
                            <Link href="/drivers/create">
                                <button
                                    type="button"
                                    className="inline-flex items-center px-3.5 h-full py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    + Create Driver
                                </button>
                            </Link>
                        </div>
                    </div>
                    <div className="px-5 sm:px-6 md:px-8">
                        {loadingDrivers ? (
                            <CustomersTableSkeleton limit={lastDriversTableLimit} />
                        ) : (
                            <DriversTable
                                drivers={driversList}
                                sort={sort}
                                changeSort={changeSort}
                                deactivateDriver={handleDeactivateDriver}
                                activateDriver={handleActivateDriver}
                                loading={tableLoading}
                            />
                        )}

                        {driversList.length !== 0 && !loadingDrivers && (
                            <Pagination
                                metadata={metadata}
                                loading={loadingDrivers || tableLoading}
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

DriversPage.authenticationEnabled = true;

export default DriversPage;
