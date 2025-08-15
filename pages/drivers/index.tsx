import { Driver } from '@prisma/client';
import { useUserContext } from 'components/context/UserContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import React, { useEffect, Fragment } from 'react';
import { CustomersTableSkeleton } from '../../components/customers/CustomersTable';
import ActivateDriverDialog from '../../components/dialogs/ActivateDriverDialog';
import DeactivateDriverDialog from '../../components/dialogs/DeactivateDriverDialog';
import DriversTable from '../../components/drivers/DriversTable';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/notifications/Notification';
import Pagination from '../../components/Pagination';
import { PageWithAuth } from '../../interfaces/auth';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { getAllDrivers, deactivateDriver, activateDriver } from '../../lib/rest/driver';
import { useLocalStorage } from '../../lib/useLocalStorage';
import { calculateAvailableSeats } from '../../lib/driver/subscription-utils';
import {
    TruckIcon,
    UsersIcon,
    PlusIcon,
    PhoneIcon,
    EnvelopeIcon,
    EllipsisHorizontalIcon,
    PencilIcon,
    CheckCircleIcon,
    XCircleIcon,
    CurrencyDollarIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    UserIcon,
    ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { getChargeTypeLabel } from 'lib/driver/driver-utils';
import { formatPhoneNumber } from 'lib/helpers/format';

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
    const [driverFilter, setDriverFilter] = React.useState<'active' | 'inactive'>('active');

    const [sort, setSort] = React.useState<Sort>(sortProps);
    const [limit, setLimit] = React.useState(limitProp);
    const [offset, setOffset] = React.useState(offsetProp);
    const [metadata, setMetadata] = React.useState<PaginationMetadata>({
        total: 0,
        currentOffset: offsetProp,
        currentLimit: limitProp,
    });

    // Filter drivers based on selected tab
    const filteredDrivers = React.useMemo(() => {
        switch (driverFilter) {
            case 'active':
                return driversList.filter((driver) => driver.active);
            case 'inactive':
                return driversList.filter((driver) => !driver.active);
            default:
                return driversList;
        }
    }, [driversList, driverFilter]);

    // Driver Filter Tab Component
    const DriverFilterTabs: React.FC = () => {
        const tabs = [
            { id: 'active' as const, label: 'Active', count: driversList.filter((d) => d.active).length },
            { id: 'inactive' as const, label: 'Inactive', count: driversList.filter((d) => !d.active).length },
        ];

        return (
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setDriverFilter(tab.id)}
                        className={`relative flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                            driverFilter === tab.id
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span
                            className={`inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full ${
                                driverFilter === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                            }`}
                        >
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>
        );
    };

    // Driver Card Component
    const DriverCard: React.FC<{ driver: Driver }> = ({ driver }) => {
        return (
            <div className="group relative bg-white rounded-2xl border-2 border-gray-100 hover:border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                {/* Card Header */}
                <div className="p-6 pb-4">
                    <div className="flex items-start justify-between">
                        <Link
                            href={`/drivers/${driver.id}`}
                            className="flex items-center space-x-4 flex-1 cursor-pointer"
                        >
                            <div
                                className={`flex items-center justify-center w-12 h-12 rounded-xl shadow-lg ${
                                    driver.active
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                }`}
                            >
                                <UserIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-150 truncate">
                                    {driver.name}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                            driver.active
                                                ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200'
                                                : 'bg-red-100 text-red-700 ring-1 ring-red-200'
                                        }`}
                                    >
                                        {driver.active ? (
                                            <>
                                                <CheckCircleIcon className="w-3 h-3 mr-1" />
                                                Active
                                            </>
                                        ) : (
                                            <>
                                                <XCircleIcon className="w-3 h-3 mr-1" />
                                                Inactive
                                            </>
                                        )}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ring-1 ring-gray-200">
                                        {driver.type === 'OWNER_OPERATOR' ? 'Owner Operator' : 'Driver'}
                                    </span>
                                </div>
                            </div>
                        </Link>

                        {/* Actions Menu */}
                        <Menu as="div" className="relative z-50">
                            <Menu.Button className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-150">
                                <EllipsisHorizontalIcon className="w-5 h-5" />
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
                                <Menu.Items className="absolute right-0 z-50 mt-2 w-48 origin-top-right bg-white rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100">
                                    <div className="py-1">
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    onClick={() => router.push(`/drivers/edit/${driver.id}`)}
                                                    className={`${
                                                        active ? 'bg-gray-50' : ''
                                                    } group flex items-center px-4 py-2 text-sm text-gray-700 w-full text-left transition-colors duration-150`}
                                                >
                                                    <PencilIcon className="w-4 h-4 mr-3 text-gray-400" />
                                                    Edit Driver
                                                </button>
                                            )}
                                        </Menu.Item>
                                        {driver.active && (
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() =>
                                                            router.push(`/expenses/create?driverId=${driver.id}`)
                                                        }
                                                        className={`${
                                                            active ? 'bg-gray-50' : ''
                                                        } group flex items-center px-4 py-2 text-sm text-gray-700 w-full text-left transition-colors duration-150`}
                                                    >
                                                        <ReceiptPercentIcon className="w-4 h-4 mr-3 text-gray-400" />
                                                        Add Expense
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        )}
                                        {driver.active ? (
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() =>
                                                            handleDeactivateDriver(driver.id, driver.name, driver.phone)
                                                        }
                                                        className={`${
                                                            active ? 'bg-red-50' : ''
                                                        } group flex items-center px-4 py-2 text-sm text-red-600 w-full text-left transition-colors duration-150`}
                                                    >
                                                        <XCircleIcon className="w-4 h-4 mr-3 text-red-400" />
                                                        Deactivate
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        ) : (
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() =>
                                                            handleActivateDriver(driver.id, driver.name, driver.phone)
                                                        }
                                                        className={`${
                                                            active ? 'bg-green-50' : ''
                                                        } group flex items-center px-4 py-2 text-sm text-green-600 w-full text-left transition-colors duration-150`}
                                                    >
                                                        <CheckCircleIcon className="w-4 h-4 mr-3 text-green-400" />
                                                        Activate
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        )}
                                    </div>
                                </Menu.Items>
                            </Transition>
                        </Menu>
                    </div>
                </div>

                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"></div>

                {/* Card Body - Also clickable */}
                <Link href={`/drivers/${driver.id}`} className="block cursor-pointer">
                    <div className="px-6 pb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                                    <EnvelopeIcon className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                                    <p className="text-sm font-medium text-gray-900 truncate">{driver.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                                    <PhoneIcon className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {formatPhoneNumber(driver.phone)}
                                    </p>
                                </div>
                            </div>

                            <div
                                className={`flex items-center space-x-3 p-3 rounded-xl ${
                                    driver.active ? 'bg-blue-50' : 'bg-gray-50'
                                }`}
                            >
                                <div
                                    className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                                        driver.active ? 'bg-blue-100' : 'bg-gray-100'
                                    }`}
                                >
                                    <CurrencyDollarIcon
                                        className={`w-4 h-4 ${driver.active ? 'text-blue-600' : 'text-gray-600'}`}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Default Pay Type
                                    </p>
                                    <p
                                        className={`text-sm font-semibold ${
                                            driver.active ? 'text-blue-900' : 'text-gray-900'
                                        }`}
                                    >
                                        {getChargeTypeLabel(driver.defaultChargeType)}
                                    </p>
                                </div>
                            </div>

                            {/* Pay Rate Fields - Only show non-null values */}
                            {driver.perMileRate && (
                                <div
                                    className={`flex items-center space-x-3 p-3 rounded-xl ${
                                        driver.active ? 'bg-blue-50' : 'bg-gray-50'
                                    }`}
                                >
                                    <div
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                                            driver.active ? 'bg-blue-100' : 'bg-gray-100'
                                        }`}
                                    >
                                        <CurrencyDollarIcon
                                            className={`w-4 h-4 ${driver.active ? 'text-blue-600' : 'text-gray-600'}`}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Per Mile Rate
                                        </p>
                                        <p
                                            className={`text-sm font-semibold ${
                                                driver.active ? 'text-blue-900' : 'text-gray-900'
                                            }`}
                                        >
                                            $
                                            {parseFloat(driver.perMileRate.toString()).toLocaleString('en-US', {
                                                minimumFractionDigits: 2,
                                            })}
                                            /mile
                                        </p>
                                    </div>
                                </div>
                            )}

                            {driver.perHourRate && (
                                <div
                                    className={`flex items-center space-x-3 p-3 rounded-xl ${
                                        driver.active ? 'bg-blue-50' : 'bg-gray-50'
                                    }`}
                                >
                                    <div
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                                            driver.active ? 'bg-blue-100' : 'bg-gray-100'
                                        }`}
                                    >
                                        <CurrencyDollarIcon
                                            className={`w-4 h-4 ${driver.active ? 'text-blue-600' : 'text-gray-600'}`}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Per Hour Rate
                                        </p>
                                        <p
                                            className={`text-sm font-semibold ${
                                                driver.active ? 'text-blue-900' : 'text-gray-900'
                                            }`}
                                        >
                                            $
                                            {parseFloat(driver.perHourRate.toString()).toLocaleString('en-US', {
                                                minimumFractionDigits: 2,
                                            })}
                                            /hour
                                        </p>
                                    </div>
                                </div>
                            )}

                            {driver.defaultFixedPay && (
                                <div
                                    className={`flex items-center space-x-3 p-3 rounded-xl ${
                                        driver.active ? 'bg-blue-50' : 'bg-gray-50'
                                    }`}
                                >
                                    <div
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                                            driver.active ? 'bg-blue-100' : 'bg-gray-100'
                                        }`}
                                    >
                                        <CurrencyDollarIcon
                                            className={`w-4 h-4 ${driver.active ? 'text-blue-600' : 'text-gray-600'}`}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Fixed Rate
                                        </p>
                                        <p
                                            className={`text-sm font-semibold ${
                                                driver.active ? 'text-blue-900' : 'text-gray-900'
                                            }`}
                                        >
                                            $
                                            {parseFloat(driver.defaultFixedPay.toString()).toLocaleString('en-US', {
                                                minimumFractionDigits: 2,
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {driver.takeHomePercent && (
                                <div
                                    className={`flex items-center space-x-3 p-3 rounded-xl ${
                                        driver.active ? 'bg-blue-50' : 'bg-gray-50'
                                    }`}
                                >
                                    <div
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                                            driver.active ? 'bg-blue-100' : 'bg-gray-100'
                                        }`}
                                    >
                                        <CurrencyDollarIcon
                                            className={`w-4 h-4 ${driver.active ? 'text-blue-600' : 'text-gray-600'}`}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Take Home %
                                        </p>
                                        <p
                                            className={`text-sm font-semibold ${
                                                driver.active ? 'text-blue-900' : 'text-gray-900'
                                            }`}
                                        >
                                            {parseFloat(driver.takeHomePercent.toString()).toLocaleString('en-US', {
                                                minimumFractionDigits: 1,
                                                maximumFractionDigits: 1,
                                            })}
                                            %
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Base Guarantee Amount */}
                            {driver.baseGuaranteeAmount && (
                                <div
                                    className={`flex items-center space-x-3 p-3 rounded-xl border ${
                                        driver.active ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                                    }`}
                                >
                                    <div
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                                            driver.active ? 'bg-blue-100' : 'bg-gray-100'
                                        }`}
                                    >
                                        <CurrencyDollarIcon
                                            className={`w-4 h-4 ${driver.active ? 'text-blue-600' : 'text-gray-600'}`}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Base Guarantee
                                        </p>
                                        <p
                                            className={`text-sm font-bold ${
                                                driver.active ? 'text-blue-900' : 'text-gray-900'
                                            }`}
                                        >
                                            $
                                            {parseFloat(driver.baseGuaranteeAmount.toString()).toLocaleString('en-US', {
                                                minimumFractionDigits: 2,
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Link>
            </div>
        );
    };

    // Custom Pagination Component
    const CustomPagination: React.FC<{
        metadata: PaginationMetadata;
        loading: boolean;
        onPrevious: () => void;
        onNext: () => void;
    }> = ({ metadata, loading, onPrevious, onNext }) => {
        const startItem = metadata.currentOffset + 1;
        const endItem = Math.min(metadata.currentOffset + metadata.currentLimit, metadata.total);

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                    Showing <span className="font-medium">{startItem}</span> to{' '}
                    <span className="font-medium">{endItem}</span> of{' '}
                    <span className="font-medium">{metadata.total}</span> drivers
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={onPrevious}
                        disabled={!metadata.prev || loading}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                        <ChevronLeftIcon className="w-4 h-4 mr-1" />
                        Previous
                    </button>

                    <button
                        onClick={onNext}
                        disabled={!metadata.next || loading}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                        Next
                        <ChevronRightIcon className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </div>
        );
    };

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
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Driver Management</h1>
                    <Link href="/drivers/create">
                        <button
                            type="button"
                            className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <PlusIcon className="w-4 h-4 mr-1" />
                            Create Driver
                        </button>
                    </Link>
                </div>
            }
        >
            <>
                {/* Responsive Mobile-First Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
                    {/* Background Elements */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-blue-700/95 to-indigo-800/90"></div>
                    <div className="absolute inset-0">
                        <div className="absolute top-0 left-1/4 w-16 h-16 xs:w-24 xs:h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 right-1/4 w-12 h-12 xs:w-16 xs:h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-48 lg:h-48 bg-white/5 rounded-full blur-3xl"></div>
                    </div>

                    <div className="relative max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
                        {/* Mobile-First Unified Header */}
                        <div className="py-4 sm:py-5 md:py-6 lg:py-8">
                            {/* Header Top Section */}
                            <div className="flex flex-col space-y-3 sm:space-y-4 md:space-y-5">
                                {/* Title and Stats Row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 sm:space-x-3 py-4">
                                        <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 bg-white/20 backdrop-blur-lg rounded-lg sm:rounded-xl border border-white/20 shadow-lg">
                                            <TruckIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 lg:w-6 lg:h-6 text-white" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-2xl xl:text-3xl font-bold text-white tracking-tight">
                                                <span className="block md:hidden">Drivers</span>
                                                <span className="hidden md:block">Driver Management</span>
                                            </h1>
                                            <p className="text-xs sm:text-sm md:text-sm text-blue-100 leading-relaxed mt-0.5">
                                                <span className="block md:hidden">Manage drivers</span>
                                                <span className="hidden md:block">
                                                    Manage your fleet drivers and operations
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats and Action Row */}
                                    <div className="flex items-center space-x-3 sm:space-x-4">
                                        {/* Stats Section - Compact Badges */}
                                        <div className="hidden lg:flex items-center space-x-2 sm:space-x-3">
                                            {/* Total Drivers Badge */}
                                            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 px-3 py-2 sm:px-4 sm:py-2.5">
                                                <div className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-md flex-shrink-0">
                                                    <UsersIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                                </div>
                                                <div className="-my-1">
                                                    <p className="text-xs sm:text-sm font-semibold text-white leading-none">
                                                        {driversList.length}
                                                    </p>
                                                    <p className="text-xs text-blue-200 leading-none mt-0.5">
                                                        <span className="block sm:hidden">Total</span>
                                                        <span className="hidden sm:block">Total Drivers</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Active Drivers Badge */}
                                            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 px-3 py-2 sm:px-4 sm:py-2.5">
                                                <div className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-green-500/20 rounded-md flex-shrink-0">
                                                    <CheckCircleIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-200" />
                                                </div>
                                                <div className="-my-1">
                                                    <p className="text-xs sm:text-sm font-semibold text-white leading-none">
                                                        {driversList.filter((d) => d.active).length}
                                                    </p>
                                                    <p className="text-xs text-blue-200 leading-none mt-0.5">
                                                        <span className="block sm:hidden">Active</span>
                                                        <span className="hidden sm:block">Active Drivers</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <Link href="/drivers/create">
                                            <button className="hidden md:inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 md:px-4 md:py-2.5 lg:px-5 lg:py-3 text-xs sm:text-sm font-semibold text-blue-700 bg-white/95 backdrop-blur-lg rounded-lg border border-white/20 shadow-lg hover:bg-white hover:shadow-xl active:scale-95 transition-all duration-200">
                                                <PlusIcon className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                                <span>Create Driver</span>
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

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

                <div className="relative mt-4 sm:-mt-8 pb-24">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {!isProPlan && !isLoadingCarrier && (
                            <div className="mb-6">
                                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center space-x-4 flex-1">
                                            <div className="text-left">
                                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                    Scale Your Fleet Management
                                                </h3>
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    Upgrade to Pro for unlimited driver management capabilities and
                                                    advanced features.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <Link href="/billing">
                                                <button
                                                    type="button"
                                                    className="group relative inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                                    <span className="relative">Upgrade to Pro</span>
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Drivers Cards Section */}
                        <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-xl overflow-hidden">
                            <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">All Drivers</h2>
                                        <p className="text-gray-600 mt-1">
                                            Manage your fleet drivers and their information
                                        </p>
                                    </div>

                                    {/* Driver Filter Tabs */}
                                    <DriverFilterTabs />
                                </div>
                            </div>

                            <div className="p-8">
                                {loadingDrivers ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {Array.from({ length: 4 }).map((_, index) => (
                                            <div
                                                key={index}
                                                className="bg-gray-100 rounded-2xl h-48 animate-pulse"
                                            ></div>
                                        ))}
                                    </div>
                                ) : filteredDrivers.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-gray-100 rounded-2xl">
                                            <TruckIcon className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                                            {driverFilter === 'active' ? 'No active drivers' : 'No inactive drivers'}
                                        </h3>
                                        <p className="text-gray-600 mb-8">
                                            {driverFilter === 'active'
                                                ? 'All drivers are currently inactive.'
                                                : 'All drivers are currently active.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {filteredDrivers.map((driver) => (
                                            <DriverCard key={driver.id} driver={driver} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Custom Pagination Footer */}
                            {filteredDrivers.length !== 0 && !loadingDrivers && (
                                <CustomPagination
                                    metadata={metadata}
                                    loading={loadingDrivers || tableLoading}
                                    onPrevious={() => previousPage()}
                                    onNext={() => nextPage()}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </>
        </Layout>
    );
};

DriversPage.authenticationEnabled = true;

export default DriversPage;
