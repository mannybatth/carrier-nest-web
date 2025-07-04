import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, CurrencyDollarIcon, EnvelopeIcon, PhoneIcon, TruckIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { useRouter } from 'next/router';
import React, { Fragment, useEffect } from 'react';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { LoadsTable, LoadsTableSkeleton } from '../../components/loads/LoadsTable';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import CustomerDetailsSkeleton from '../../components/skeletons/CustomerDetailsSkeleton';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedDriver, ExpandedDriverAssignment, ExpandedDriverPayment, ExpandedLoad } from '../../interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { deleteDriverById, getDriverById } from '../../lib/rest/driver';
import { deleteLoadById, getLoadsExpanded } from '../../lib/rest/load';
import { useLocalStorage } from '../../lib/useLocalStorage';
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
    const router = useRouter();
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
            notify({ title: 'Error Updating Load Assignment ', type: 'error' });
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
                    <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                        <div className="flex">
                            <h1 className="flex-1 text-2xl font-semibold text-gray-900">{driver?.name}</h1>
                            <ActionsDropdown
                                driver={driver}
                                disabled={!driver}
                                deleteDriver={() => setOpenDeleteDriverConfirmation(true)}
                            ></ActionsDropdown>
                        </div>
                        <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                    </div>
                    <div className="px-5 sm:px-6 md:px-8">
                        <div className="grid grid-cols-12 gap-5">
                            {driver ? (
                                <div className="col-span-12">
                                    <div
                                        role="list"
                                        className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2 lg:grid-cols-4"
                                    >
                                        <div className="flex">
                                            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ">
                                                <TruckIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Total Loads</p>
                                                <p className="text-sm text-gray-500">{metadata?.total || '--'}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ">
                                                <EnvelopeIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Email</p>
                                                <p className="text-sm text-gray-500">{driver.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                                                <PhoneIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Phone</p>
                                                <p className="text-sm text-gray-500">{driver.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                                                <CurrencyDollarIcon
                                                    className="w-5 h-5 text-gray-500"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Default Pay Type</p>
                                                <p className="text-sm text-gray-500">
                                                    {getChargeTypeLabel(driver.defaultChargeType)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <CustomerDetailsSkeleton></CustomerDetailsSkeleton>
                            )}
                        </div>
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
                                ></DriverAssignmentsTable>
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
                            {loadingDriver ? (
                                <LoadsTableSkeleton limit={lastLoadsTableLimit} />
                            ) : (
                                driver.equipments?.length > 0 && (
                                    <>
                                        <div className="  px-5 md:block sm:px-2 md:px-4 my-8 py-4 pb-5 -mb-2   bg-white shadow-md  border-gray-200  border-t border-l border-r rounded-tl-lg rounded-tr-lg">
                                            <h3 className="flex flex-col md:flex-row items-center justify-between">
                                                Assigned Equipment
                                            </h3>
                                        </div>

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
                                    </>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </>
        </Layout>
    );
};

DriverDetailsPage.authenticationEnabled = true;

export default DriverDetailsPage;
