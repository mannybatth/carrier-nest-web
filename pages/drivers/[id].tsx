import { Menu, Transition } from '@headlessui/react';
import {
    ChevronDownIcon,
    CurrencyDollarIcon,
    EnvelopeIcon,
    PhoneIcon,
    TruckIcon,
    PencilIcon,
    TrashIcon,
    EllipsisHorizontalIcon,
    DevicePhoneMobileIcon,
    CheckCircleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { useRouter } from 'next/router';
import React, { Fragment, useEffect, useState } from 'react';
import { useUserContext } from 'components/context/UserContext';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import ActivateDriverDialog from '../../components/dialogs/ActivateDriverDialog';
import DeactivateDriverDialog from '../../components/dialogs/DeactivateDriverDialog';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { LoadsTable, LoadsTableSkeleton } from '../../components/loads/LoadsTable';
import { notify } from '../../components/notifications/Notification';
import Pagination from '../../components/Pagination';
import CustomerDetailsSkeleton from '../../components/skeletons/CustomerDetailsSkeleton';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedDriver, ExpandedDriverAssignment, ExpandedDriverPayment, ExpandedLoad } from '../../interfaces/models';
import { Driver } from '@prisma/client';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { deleteDriverById, getDriverById, activateDriver, deactivateDriver } from '../../lib/rest/driver';
import { deleteLoadById, getLoadsExpanded } from '../../lib/rest/load';
import { useLocalStorage } from '../../lib/useLocalStorage';
import { calculateAvailableSeats, getAllDriversForSeatCalculation } from '../../lib/driver/subscription-utils';
import EquipmentsTable from '../../components/equipments/EquipmentsTable';
import { deleteEquipmentById } from '../../lib/rest/equipment';
import { getChargeTypeLabel } from 'lib/driver/driver-utils';
import { deleteDriverPayment, getDriverPayments } from '../../lib/rest/driver-payment';
import DriverPaymentsTable from '../../components/drivers/DriverPaymentsTable';
import { getAllAssignments } from 'lib/rest/assignment';
import { AssignmentsTableSkeleton, DriverAssignmentsTable } from 'components/loads/DriverAssignmentsTable';
import AssignmentsTable from 'components/assignment/AssignmentsTable';
import { RouteLegStatus } from '@prisma/client';
import { updateRouteLegStatus } from 'lib/rest/routeLeg';
import { formatPhoneNumber } from 'lib/helpers/format';

type ActionsDropdownProps = {
    driver: ExpandedDriver;
    disabled?: boolean;
    deleteDriver: (id: string) => void;
    openActivateDialog: () => void;
    openDeactivateDialog: () => void;
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({
    driver,
    disabled,
    deleteDriver,
    openActivateDialog,
    openDeactivateDialog,
}) => {
    const router = useRouter();

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabled}
                >
                    <span>Actions</span>
                    <ChevronDownIcon className="w-3.5 h-3.5" aria-hidden="true" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="transform opacity-0 scale-95 translate-y-1"
                enterTo="transform opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-100"
                leaveFrom="transform opacity-100 scale-100 translate-y-0"
                leaveTo="transform opacity-0 scale-95 translate-y-1"
            >
                <Menu.Items className="absolute right-0 z-50 w-44 mt-1 origin-top-right bg-white border border-gray-200 divide-y divide-gray-100 rounded-lg shadow-lg ring-1 ring-black/5 focus:outline-none overflow-hidden">
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/drivers/edit/${driver.id}`);
                                    }}
                                    className={classNames(
                                        active ? 'bg-blue-50 text-blue-700' : 'text-gray-700',
                                        'group flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition-colors duration-150',
                                    )}
                                >
                                    <PencilIcon
                                        className={classNames(
                                            active ? 'text-blue-600' : 'text-gray-400',
                                            'w-4 h-4 transition-colors duration-150',
                                        )}
                                    />
                                    <span>Edit</span>
                                </button>
                            )}
                        </Menu.Item>
                    </div>
                    <div className="py-1">
                        {driver && driver.active ? (
                            <Menu.Item>
                                {({ active }) => (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openDeactivateDialog();
                                        }}
                                        className={classNames(
                                            active ? 'bg-orange-50 text-orange-700' : 'text-gray-700',
                                            'group flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition-colors duration-150',
                                        )}
                                    >
                                        <XCircleIcon
                                            className={classNames(
                                                active ? 'text-orange-600' : 'text-gray-400',
                                                'w-4 h-4 transition-colors duration-150',
                                            )}
                                        />
                                        <span>Deactivate</span>
                                    </button>
                                )}
                            </Menu.Item>
                        ) : driver ? (
                            <Menu.Item>
                                {({ active }) => (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openActivateDialog();
                                        }}
                                        className={classNames(
                                            active ? 'bg-green-50 text-green-700' : 'text-gray-700',
                                            'group flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition-colors duration-150',
                                        )}
                                    >
                                        <CheckCircleIcon
                                            className={classNames(
                                                active ? 'text-green-600' : 'text-gray-400',
                                                'w-4 h-4 transition-colors duration-150',
                                            )}
                                        />
                                        <span>Activate</span>
                                    </button>
                                )}
                            </Menu.Item>
                        ) : null}
                    </div>
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteDriver(driver.id);
                                    }}
                                    className={classNames(
                                        active ? 'bg-red-50 text-red-700' : 'text-gray-700',
                                        'group flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition-colors duration-150',
                                    )}
                                >
                                    <TrashIcon
                                        className={classNames(
                                            active ? 'text-red-600' : 'text-gray-400',
                                            'w-4 h-4 transition-colors duration-150',
                                        )}
                                    />
                                    <span>Delete</span>
                                </button>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

const DriverDetailsPage: PageWithAuth = () => {
    const router = useRouter();
    const { defaultCarrier } = useUserContext();
    const searchParams = new URLSearchParams(router.query as any);
    const sortProps = sortFromQuery({
        sortBy: searchParams.get('sortBy'),
        sortOrder: searchParams.get('sortOrder'),
    });
    const equipmentSortProps = sortFromQuery({
        sortBy: searchParams.get('equipmentSortBy'),
        sortOrder: searchParams.get('equipmentSortOrder'),
    });
    const limitProp = Number(searchParams.get('limit')) || 10;
    const offsetProp = Number(searchParams.get('offset')) || 0;
    const driverId = router.query.id as string;

    const [driverToActivate, setDriverToActivate] = useState<{
        id: string;
        name: string;
        phone: string;
    } | null>(null);
    const [driverToDeactivate, setDriverToDeactivate] = useState<{
        id: string;
        name: string;
        phone: string;
    } | null>(null);
    const [subscriptionSeats, setSubscriptionSeats] = useState<{
        availableSeats: number;
        totalSeats: number;
        usedSeats: number;
    } | null>(null);

    const [allDriversForSeatCalculation, setAllDriversForSeatCalculation] = useState<Driver[]>([]);

    const [lastLoadsTableLimit, setLastLoadsTableLimit] = useLocalStorage('lastLoadsTableLimit', limitProp);
    const [lastPaymentsTableLimit, setLastPaymentsTableLimit] = useLocalStorage('lastPaymentsTableLimit', limitProp);

    const [loadingDriver, setLoadingDriver] = React.useState(true);
    const [loadingAssignments, setLoadingAssignments] = React.useState(true);
    const [tableLoading, setTableLoading] = React.useState(false);

    const [openDeleteDriverConfirmation, setOpenDeleteDriverConfirmation] = React.useState(false);
    const [openDeleteLoadConfirmation, setOpenDeleteLoadConfirmation] = React.useState(false);
    const [openDeleteEquipmentConfirmation, setOpenDeleteEquipmentConfirmation] = React.useState(false);
    const [loadIdToDelete, setLoadIdToDelete] = React.useState<string | null>(null);
    const [equipmentIdToDelete, setEquipmentIdToDelete] = React.useState<string | null>(null);

    const [driver, setDriver] = React.useState<ExpandedDriver | null>(null);
    const [loadsList, setLoadsList] = React.useState<ExpandedLoad[]>([]);
    const [assignmentsList, setAssignmentsList] = React.useState<ExpandedDriverAssignment[]>([]);

    const [sort, setSort] = React.useState<Sort>(sortProps);
    const [equipmentSort, setEquipmentSort] = React.useState<Sort>(equipmentSortProps);
    const [limit, setLimit] = React.useState(limitProp);
    const [offset, setOffset] = React.useState(offsetProp);
    const [metadata, setMetadata] = React.useState<PaginationMetadata>({
        total: 0,
        currentOffset: offsetProp,
        currentLimit: limitProp,
    });

    const [driverPayments, setDriverPayments] = React.useState<ExpandedDriverPayment[]>([]);
    const [driverPaymentsMetadata, setDriverPaymentsMetadata] = React.useState<PaginationMetadata>({
        total: 0,
        currentOffset: 0,
        currentLimit: 10,
    });
    const [loadingDriverPayments, setLoadingDriverPayments] = React.useState(true);
    const [deletePaymentConfirmOpen, setDeletePaymentConfirmOpen] = React.useState(false);
    const [paymentToDelete, setPaymentToDelete] = React.useState<ExpandedDriverPayment | null>(null);
    const [isDetailsExpanded, setIsDetailsExpanded] = React.useState(false);

    // Dialog states for activation/deactivation
    const [isActivateDialogOpen, setIsActivateDialogOpen] = React.useState(false);
    const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = React.useState(false);

    useEffect(() => {
        if (driverId) {
            reloadDriver();
            reloadDriverPayments();
        }
    }, [driverId]);

    useEffect(() => {
        setLimit(limitProp);
        setOffset(offsetProp);
        reloadAssignments({ sort, limit: limitProp, offset: offsetProp });
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
        reloadAssignments({ sort, limit, offset, useTableLoading: true });
    };

    const changeEquipmentSort = (sort: Sort) => {
        router.push(
            {
                pathname: router.pathname,
                query: queryFromSort(sort, router.query, 'equipmentSortBy', 'equipmentSortOrder'),
            },
            undefined,
            { shallow: true },
        );
        setEquipmentSort(sort);
        reloadDriver();
    };

    const reloadDriver = async () => {
        setLoadingDriver(true);
        const driver = await getDriverById(driverId, 'equipments(100)');
        setDriver(driver);
        setLoadingDriver(false);
    };

    const reloadAssignments = async ({
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
        !useTableLoading && setLoadingAssignments(true);
        useTableLoading && setTableLoading(true);
        const { assignments, metadata: metadataResponse } = await getAllAssignments({
            driverIds: [driverId],
            limit,
            offset,
            sort,
        });

        setAssignmentsList(assignments);
        setMetadata(metadataResponse);
        setLoadingAssignments(false);
        setTableLoading(false);
    };

    const reloadDriverPayments = async (offset = 0, limit = 10) => {
        setLoadingDriverPayments(true);
        const response = await getDriverPayments(driverId, limit, offset);
        setDriverPayments(response.driverPayments);
        setDriverPaymentsMetadata(response.metadata);
        setLoadingDriverPayments(false);
        setLastPaymentsTableLimit(
            response.driverPayments.length !== 0 ? response.driverPayments.length : lastPaymentsTableLimit,
        );
    };

    const previousDriverPaymentsPage = async () => {
        const newOffset = Math.max(0, driverPaymentsMetadata.currentOffset - driverPaymentsMetadata.currentLimit);
        await reloadDriverPayments(newOffset, driverPaymentsMetadata.currentLimit);
    };

    const nextDriverPaymentsPage = async () => {
        const newOffset = driverPaymentsMetadata.currentOffset + driverPaymentsMetadata.currentLimit;
        await reloadDriverPayments(newOffset, driverPaymentsMetadata.currentLimit);
    };

    // Function to fetch fresh subscription seat data
    const fetchSubscriptionInfo = async () => {
        try {
            // Use the same approach as drivers listing page - fetch all drivers and calculate
            const allDrivers = await getAllDriversForSeatCalculation();
            setAllDriversForSeatCalculation(allDrivers);

            // Calculate seats the same way as drivers listing page
            const seatInfo = calculateAvailableSeats(allDrivers, defaultCarrier);

            setSubscriptionSeats(seatInfo);
        } catch (error) {
            console.error('Failed to fetch drivers for seat calculation:', error);
            // Fallback to conservative values
            const totalSeats = defaultCarrier?.subscription?.numberOfDrivers || 1;
            setSubscriptionSeats({
                availableSeats: 0, // Conservative fallback
                totalSeats: totalSeats,
                usedSeats: totalSeats, // Assume all seats are used as fallback
            });
        }
    };
    const handleActivateDriver = (id: string, name: string, phone: string) => {
        setDriverToActivate({ id, name, phone });
        setIsActivateDialogOpen(true);
        // Fetch fresh subscription data after dialog is opened
        fetchSubscriptionInfo();

        // Debug: log what we would calculate using UserContext like the drivers listing page
        const totalSeats = defaultCarrier?.subscription?.numberOfDrivers || 1;
    };

    const confirmActivateDriver = async () => {
        if (!driverToActivate) return;

        try {
            await activateDriver(driverToActivate.id);
            notify({
                title: 'Driver activated',
                message: `${driverToActivate.name} has been activated successfully`,
                type: 'success',
            });

            setIsActivateDialogOpen(false);
            setDriverToActivate(null);
            setSubscriptionSeats(null); // Clear stale subscription data

            // Reload driver data
            reloadDriver();
        } catch (error) {
            // If subscription limit error, refresh the subscription info to show updated count
            if (error.message.includes('subscription') || error.message.includes('limit')) {
                fetchSubscriptionInfo();
            }
            notify({ title: 'Error Activating Driver', message: error.message, type: 'error' });
            throw error; // Re-throw to let the dialog handle the error
        }
    };

    const openDeactivateDialog = () => {
        if (driver) {
            setDriverToDeactivate({
                id: driver.id,
                name: driver.name,
                phone: driver.phone,
            });
            setIsDeactivateDialogOpen(true);
        }
    };

    const confirmDeactivateDriver = async () => {
        if (!driverToDeactivate) return;

        try {
            await deactivateDriver(driverToDeactivate.id);
            notify({
                title: 'Driver deactivated',
                message: `${driverToDeactivate.name} has been deactivated successfully`,
                type: 'success',
            });

            setIsDeactivateDialogOpen(false);
            setDriverToDeactivate(null);

            // Reload driver data
            reloadDriver();
        } catch (error) {
            notify({ title: 'Error Deactivating Driver', message: error.message, type: 'error' });
            throw error; // Re-throw to let the dialog handle the error
        }
    };

    const handleDeletePayment = async () => {
        if (paymentToDelete) {
            setLoadingDriverPayments(true);
            try {
                const driverId = paymentToDelete.driverId;

                if (driverId) {
                    await deleteDriverPayment(driverId, paymentToDelete.id);

                    notify({ title: 'Payment deleted', message: 'Payment deleted successfully' });

                    setPaymentToDelete(null);
                    setDeletePaymentConfirmOpen(false);
                    reloadDriverPayments();
                } else {
                    console.error('Driver ID not found for the payment to be deleted.');
                    setLoadingDriverPayments(false);
                }
            } catch (error) {
                console.error('Error deleting payment:', error);
                setLoadingDriverPayments(false);
            }
        }
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
        reloadAssignments({ sort, limit: metadata.prev.limit, offset: metadata.prev.offset, useTableLoading: true });
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
        reloadAssignments({ sort, limit: metadata.next.limit, offset: metadata.next.offset, useTableLoading: true });
    };

    const deleteLoad = async (id: string) => {
        await deleteLoadById(id);

        notify({ title: 'Load deleted', message: 'Load deleted successfully' });
        reloadAssignments({ sort, limit, offset, useTableLoading: true });
    };

    const deleteDriver = async (id: string) => {
        await deleteDriverById(id);

        notify({ title: 'Driver deleted', message: 'Driver deleted successfully' });

        router.push('/drivers');
    };

    const deleteEquipment = async (id: string) => {
        try {
            await deleteEquipmentById(id);
            notify({ title: 'Equipment deleted', message: 'Equipment deleted successfully' });
            reloadDriver();
        } catch (error) {
            notify({ title: 'Error', message: error.message, type: 'error' });
        }
    };

    const updateAssignmentsList = (assignments, newRouteLeg) => {
        return assignments.map((assignment) => {
            if (assignment.routeLegId === newRouteLeg.routeLegId) {
                return {
                    ...newRouteLeg,
                };
            }
            return assignment;
        });
    };

    const changeLegStatusClicked = async (legStatus: RouteLegStatus, routeLegId: string) => {
        try {
            const { loadStatus, routeLeg: newRouteLeg } = await updateRouteLegStatus(routeLegId, legStatus);

            // Insert the updated route leg into the
            assignmentsList.find((assignment) => assignment.routeLeg.id === routeLegId).routeLeg.status =
                newRouteLeg.status;
            const updatedAssignmentsList = updateAssignmentsList(assignmentsList, newRouteLeg);

            // Update the load context with the updated route legs
            setAssignmentsList(updatedAssignmentsList);

            notify({ title: 'Load Assignment Status', message: 'Load assignment successfully updated' });
        } catch (error) {
            // Check if the error is related to inactive driver
            const errorMessage = error.message || 'Unknown error occurred';
            if (errorMessage.includes('Driver account is inactive')) {
                notify({
                    title: 'Assignment Update Failed',
                    message: 'Cannot update assignment status: Driver account is inactive',
                    type: 'error',
                });
            } else {
                notify({
                    title: 'Error Updating Load Assignment',
                    message: errorMessage,
                    type: 'error',
                });
            }
        }
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">{driver?.name}</h1>
                    <ActionsDropdown
                        driver={driver}
                        disabled={!driver}
                        deleteDriver={() => setOpenDeleteDriverConfirmation(true)}
                        openActivateDialog={() => driver && handleActivateDriver(driver.id, driver.name, driver.phone)}
                        openDeactivateDialog={() => openDeactivateDialog()}
                    ></ActionsDropdown>
                </div>
            }
        >
            <>
                <SimpleDialog
                    show={openDeleteDriverConfirmation}
                    title="Delete driver"
                    description="Are you sure you want to delete this driver?"
                    primaryButtonText="Delete"
                    primaryButtonAction={() => deleteDriver(driver.id)}
                    secondaryButtonAction={() => setOpenDeleteDriverConfirmation(false)}
                    onClose={() => setOpenDeleteDriverConfirmation(false)}
                ></SimpleDialog>
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
                <SimpleDialog
                    show={openDeleteEquipmentConfirmation}
                    title="Delete equipment"
                    description="Are you sure you want to delete this equipment?"
                    primaryButtonText="Delete"
                    primaryButtonAction={() => {
                        if (equipmentIdToDelete) {
                            deleteEquipment(equipmentIdToDelete);
                        }
                    }}
                    secondaryButtonAction={() => {
                        setOpenDeleteEquipmentConfirmation(false);
                        setEquipmentIdToDelete(null);
                    }}
                    onClose={() => {
                        setOpenDeleteEquipmentConfirmation(false);
                        setEquipmentIdToDelete(null);
                    }}
                ></SimpleDialog>
                <SimpleDialog
                    show={deletePaymentConfirmOpen}
                    onClose={() => setDeletePaymentConfirmOpen(false)}
                    title="Delete Payment"
                    description="Are you sure you want to delete this payment? This action cannot be undone."
                    primaryButtonText="Delete"
                    primaryButtonAction={handleDeletePayment}
                    secondaryButtonText="Cancel"
                />
                <div className="py-2 mx-auto max-w-7xl">
                    <BreadCrumb
                        className="sm:px-6 md:px-8"
                        paths={[
                            {
                                label: 'Drivers',
                                href: '/drivers',
                            },
                            {
                                label: driver ? `${driver.name}` : '',
                            },
                        ]}
                    ></BreadCrumb>

                    {/* Apple-style Driver Profile Header */}
                    <div className="px-5 sm:px-6 md:px-8 mt-4">
                        {driver ? (
                            <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 rounded-2xl border border-gray-200/80 shadow-lg backdrop-blur-sm">
                                {/* Header Background Pattern */}
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-600/5 rounded-2xl"></div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-3xl transform translate-x-20 -translate-y-20 pointer-events-none"></div>

                                {/* Content */}
                                <div className="relative px-6 py-6 z-10">
                                    {/* Header Section */}
                                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                        {/* Driver Identity */}
                                        <div className="flex flex-col sm:flex-row items-start gap-4 min-w-0 flex-1">
                                            {/* Avatar */}
                                            <div className="relative flex-shrink-0">
                                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg flex items-center justify-center ring-2 ring-white/50">
                                                    <span className="text-lg font-bold text-white tracking-tight">
                                                        {driver.name
                                                            .split(' ')
                                                            .map((n) => n[0])
                                                            .join('')
                                                            .toUpperCase()}
                                                    </span>
                                                </div>
                                                {/* Active Status Indicator */}
                                                <div
                                                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${
                                                        driver.active ? 'bg-green-500' : 'bg-gray-400'
                                                    }`}
                                                >
                                                    {driver.active ? (
                                                        <svg
                                                            className="w-3 h-3 text-white"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                    ) : (
                                                        <svg
                                                            className="w-3 h-3 text-white"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Driver Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                                        {driver.name}
                                                    </h1>
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${
                                                            driver.active
                                                                ? 'bg-green-100 text-green-800 ring-1 ring-green-200'
                                                                : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                                                        }`}
                                                    >
                                                        {driver.active ? (
                                                            <>
                                                                <svg
                                                                    className="w-2.5 h-2.5 mr-1.5"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 20 20"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                                Active
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg
                                                                    className="w-2.5 h-2.5 mr-1.5"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 20 20"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                                Inactive
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 font-medium mb-1">
                                                    {driver.type
                                                        ?.replace('_', ' ')
                                                        .toLowerCase()
                                                        .replace(/\b\w/g, (l) => l.toUpperCase()) || 'Driver'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {metadata?.total || 0}{' '}
                                                    {driver.type === 'DRIVER' ? ' Assignments' : ' Loads'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex-shrink-0">
                                            <ActionsDropdown
                                                driver={driver}
                                                disabled={!driver}
                                                deleteDriver={() => setOpenDeleteDriverConfirmation(true)}
                                                openActivateDialog={() =>
                                                    driver && handleActivateDriver(driver.id, driver.name, driver.phone)
                                                }
                                                openDeactivateDialog={() => openDeactivateDialog()}
                                            />
                                        </div>
                                    </div>

                                    {/* Driver Details Toggle - Minimalistic */}
                                    <div className="mt-3">
                                        <button
                                            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                                            className="flex items-center justify-between w-full px-2 py-2 text-left hover:bg-gray-50/50 rounded-lg transition-all duration-150 group"
                                        >
                                            <span className="text-xs font-medium text-gray-500 tracking-wide uppercase">
                                                {isDetailsExpanded ? 'Hide Details' : 'Show Details'}
                                            </span>
                                            <ChevronDownIcon
                                                className={`w-3 h-3 text-gray-300 transition-all duration-150 group-hover:text-gray-400 ${
                                                    isDetailsExpanded ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Driver Details Grid - Collapsible - Simplified */}
                                    {isDetailsExpanded && (
                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 opacity-90">
                                            {/* Contact Information */}
                                            <div className="bg-gray-50/70 rounded-lg p-3 border border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <PhoneIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                                                        <p className="text-xs text-gray-700 font-medium truncate">
                                                            {formatPhoneNumber(driver.phone) || 'Not provided'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50/70 rounded-lg p-3 border border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <EnvelopeIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-500 mb-0.5">Email</p>
                                                        <p className="text-xs text-gray-700 font-medium truncate">
                                                            {driver.email || 'Not provided'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Load Statistics */}
                                            <div className="bg-gray-50/70 rounded-lg p-3 border border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <TruckIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-500 mb-0.5">
                                                            {driver.type === 'DRIVER'
                                                                ? 'Total Assignments'
                                                                : 'Total Loads'}
                                                        </p>
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {metadata?.total || 0}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment Information */}
                                            <div className="bg-gray-50/70 rounded-lg p-3 border border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <CurrencyDollarIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-500 mb-0.5">Pay Type</p>
                                                        <p className="text-xs text-gray-700 font-medium">
                                                            {getChargeTypeLabel(driver.defaultChargeType)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Base Guarantee Amount */}
                                            {driver.baseGuaranteeAmount && (
                                                <div className="bg-gray-50/70 rounded-lg p-3 border border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <CurrencyDollarIcon className="w-3.5 h-3.5 text-green-500" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-gray-500 mb-0.5">
                                                                Base Guarantee
                                                            </p>
                                                            <p className="text-xs text-green-700 font-semibold">
                                                                $
                                                                {Number(driver.baseGuaranteeAmount).toLocaleString(
                                                                    'en-US',
                                                                    {
                                                                        minimumFractionDigits: 2,
                                                                        maximumFractionDigits: 2,
                                                                    },
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Driver App Status */}
                                            <div className="bg-gray-50/70 rounded-lg p-3 border border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <DevicePhoneMobileIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-500 mb-0.5">Driver App</p>
                                                        <div className="flex items-center gap-1.5">
                                                            <div
                                                                className={`w-1.5 h-1.5 rounded-full ${
                                                                    driver.hasDriverApp ? 'bg-green-400' : 'bg-gray-300'
                                                                }`}
                                                            ></div>
                                                            <p
                                                                className={`text-xs font-medium ${
                                                                    driver.hasDriverApp
                                                                        ? 'text-green-600'
                                                                        : 'text-gray-500'
                                                                }`}
                                                            >
                                                                {driver.hasDriverApp ? 'Connected' : 'Not Connected'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <CustomerDetailsSkeleton />
                        )}
                    </div>

                    <div className="px-5 sm:px-6 md:px-8">
                        <div className="grid grid-cols-12 gap-5">
                            <div className="col-span-12">
                                <div className="  px-5 md:block sm:px-2 md:px-4 my-8 py-4 pb-5 -mb-2   bg-white shadow-md  border-gray-200  border-t border-l border-r rounded-tl-lg rounded-tr-lg">
                                    <div className="flex flex-col md:flex-row items-center justify-between">
                                        <h3 className=" flex-1 text-xl font-bold text-gray-800">Load assignments</h3>
                                    </div>
                                </div>
                                <div className=" px-0">
                                    {loadingAssignments ? (
                                        <AssignmentsTableSkeleton limit={lastLoadsTableLimit} />
                                    ) : (
                                        <DriverAssignmentsTable
                                            assignments={assignmentsList}
                                            headers={[
                                                'load.refNum',
                                                'routeLeg.scheduledDate',
                                                'routeLeg.locations',
                                                'routeLeg.driverInstructions',
                                                'routeLeg.status',
                                                'actions',
                                            ]}
                                            deleteAssignment={(id: string) => {
                                                setOpenDeleteLoadConfirmation(true);
                                                setLoadIdToDelete(id);
                                            }}
                                            loading={tableLoading}
                                            changeLegStatusClicked={changeLegStatusClicked}
                                            driver={driver}
                                        />
                                    )}

                                    {assignmentsList.length !== 0 && !loadingAssignments && (
                                        <Pagination
                                            metadata={metadata}
                                            loading={loadingAssignments || tableLoading}
                                            onPrevious={() => previousPage()}
                                            onNext={() => nextPage()}
                                        ></Pagination>
                                    )}
                                </div>

                                <div className="my-8 px-0">
                                    <div className="  px-5 md:block sm:px-2 md:px-4 my-8 py-4 pb-5 -mb-2   bg-white shadow-md  border-gray-200  border-t border-l border-r rounded-tl-lg rounded-tr-lg">
                                        <h3 className="flex flex-col md:flex-row items-center justify-between">
                                            Assigned Equipment
                                        </h3>
                                    </div>
                                    <div className="  px-5 md:block sm:px-2 md:px-4   py-4 pb-5 -mb-2 bg-white shadow-md  border-gray-200  border-l border-r border-b rounded-bl-lg rounded-br-lg">
                                        {loadingDriver ? (
                                            <LoadsTableSkeleton limit={lastLoadsTableLimit} />
                                        ) : (
                                            <EquipmentsTable
                                                equipments={driver.equipments || []}
                                                sort={equipmentSort}
                                                loading={false}
                                                changeSort={changeEquipmentSort}
                                                deleteEquipment={(id: string) => {
                                                    setOpenDeleteEquipmentConfirmation(true);
                                                    setEquipmentIdToDelete(id);
                                                }}
                                                hideDriversColumn={true}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Driver Activation/Deactivation Dialogs */}
                <ActivateDriverDialog
                    open={isActivateDialogOpen}
                    onClose={() => {
                        setIsActivateDialogOpen(false);
                        setDriverToActivate(null);
                        setSubscriptionSeats(null); // Clear subscription data when closing
                    }}
                    onConfirm={confirmActivateDriver}
                    driverName={driverToActivate?.name || ''}
                    driverPhone={driverToActivate?.phone || ''}
                    availableSeats={subscriptionSeats?.availableSeats ?? 0}
                    totalSeats={subscriptionSeats?.totalSeats ?? (defaultCarrier?.subscription?.numberOfDrivers || 1)}
                />

                <DeactivateDriverDialog
                    open={isDeactivateDialogOpen}
                    onClose={() => {
                        setIsDeactivateDialogOpen(false);
                        setDriverToDeactivate(null);
                    }}
                    onConfirm={confirmDeactivateDriver}
                    driverName={driverToDeactivate?.name || ''}
                    driverPhone={driverToDeactivate?.phone || ''}
                />
            </>
        </Layout>
    );
};

DriverDetailsPage.authenticationEnabled = true;

export default DriverDetailsPage;
