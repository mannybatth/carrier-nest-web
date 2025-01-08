import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import { ExpandedDriverAssignment } from '../../interfaces/models';
import Pagination from '../../components/Pagination';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { getAllAssignments } from 'lib/rest/assignment';
import AssignmentsTable from 'components/assignment/AssignmentsTable';
import { useSearchParams } from 'next/navigation';
import { useLocalStorage } from '../../lib/useLocalStorage';
import { CustomersTableSkeleton } from 'components/customers/CustomersTable';
import AssignmentPaymentsModal from 'components/assignment/assignment-payments-modal/AssignmentPaymentsModal';
import { Listbox, Transition } from '@headlessui/react';
import { getAllDrivers } from 'lib/rest/driver';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';

const AssignmentsPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sortProps = sortFromQuery({
        sortBy: searchParams.get('sortBy'),
        sortOrder: searchParams.get('sortOrder'),
    });
    const limitProp = Number(searchParams.get('limit')) || 20;
    const offsetProp = Number(searchParams.get('offset')) || 0;

    const [lastAssignmentsTableLimit, setLastAssignmentsTableLimit] = useLocalStorage(
        'lastAssignmentsTableLimit',
        limitProp,
    );

    const [assignments, setAssignments] = useState<ExpandedDriverAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssignments, setSelectedAssignments] = useState<ExpandedDriverAssignment[]>([]);
    const [singleSelectedAssignment, setSingleSelectedAssignment] = useState<ExpandedDriverAssignment | null>(null);
    const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
    const [drivers, setDrivers] = useState([]);
    const [selectedDrivers, setSelectedDrivers] = useState([]);

    const [sort, setSort] = useState<Sort>(sortProps);
    const [limit, setLimit] = useState(limitProp);
    const [offset, setOffset] = useState(offsetProp);
    const [metadata, setMetadata] = useState<PaginationMetadata>({
        total: 0,
        currentOffset: offsetProp,
        currentLimit: limitProp,
    });

    useEffect(() => {
        const fetchDrivers = async () => {
            const { drivers } = await getAllDrivers({ limit: 999, offset: 0 });
            setDrivers(drivers);
        };
        fetchDrivers();
    }, []);

    useEffect(() => {
        setLimit(limitProp);
        setOffset(offsetProp);
        reloadAssignments({ sort, limit: limitProp, offset: offsetProp, driverIds: selectedDrivers.map((d) => d.id) });
    }, [limitProp, offsetProp, showUnpaidOnly, selectedDrivers]);

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

    const reloadAssignments = async ({
        sort,
        limit,
        offset,
        useTableLoading = false,
        fromAssignmentPaymentsModal = false,
        driverIds,
    }: {
        sort?: Sort;
        limit: number;
        offset: number;
        useTableLoading?: boolean;
        fromAssignmentPaymentsModal?: boolean;
        driverIds?: string[];
    }) => {
        !useTableLoading && setLoading(true);
        useTableLoading && setTableLoading(true);
        try {
            const currentSelectedAssignmentIds = new Set(selectedAssignments.map((assignment) => assignment.id));
            const currentSingleSelectedAssignmentId = singleSelectedAssignment?.id;
            const { assignments, metadata: metadataResponse } = await getAllAssignments({
                limit,
                offset,
                sort,
                showUnpaidOnly,
                driverIds,
            });

            if (fromAssignmentPaymentsModal && assignments.length === 0) {
                // Reload the table with showUnpaidOnly off. This allows the modal to remain open on saves
                setShowUnpaidOnly(false);
            } else {
                setLastAssignmentsTableLimit(assignments.length !== 0 ? assignments.length : lastAssignmentsTableLimit);
                setAssignments(assignments);
                setMetadata(metadataResponse);

                if (currentSelectedAssignmentIds) {
                    setSelectedAssignments(
                        assignments.filter((assignment) => currentSelectedAssignmentIds.has(assignment.id)),
                    );
                }
                if (currentSingleSelectedAssignmentId) {
                    setSingleSelectedAssignment(
                        assignments.find((assignment) => assignment.id === currentSingleSelectedAssignmentId) ?? null,
                    );
                }
            }
        } catch (error) {
            notify({ title: 'Error', message: error.message, type: 'error' });
        } finally {
            setLoading(false);
            setTableLoading(false);
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

    const handleRowClick = (assignment: ExpandedDriverAssignment) => {
        setSingleSelectedAssignment(assignment);
        setIsModalOpen(true);
    };

    const handleCheckboxChange = (assignment: ExpandedDriverAssignment, isChecked: boolean) => {
        if (isChecked) {
            const newSelectedAssignments = [...selectedAssignments, assignment];
            newSelectedAssignments.sort((a, b) => {
                const indexA = assignments.findIndex((item) => item.id === a.id);
                const indexB = assignments.findIndex((item) => item.id === b.id);
                return indexA - indexB;
            });
            setSelectedAssignments(newSelectedAssignments);
        } else {
            setSelectedAssignments(selectedAssignments.filter((a) => a.id !== assignment.id));
        }
    };

    const paySelectedAssignments = () => {
        setIsModalOpen(true);
    };

    const unselectAllAssignments = () => {
        setSelectedAssignments([]);
    };

    const handleDriverChange = (drivers) => {
        setSelectedDrivers(drivers);
    };

    const clearSelectedDrivers = () => {
        setSelectedDrivers([]);
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Driver Assignments</h1>}>
            <div className="py-2 mx-auto max-w-7xl">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Driver Assignments</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Here you can see assignments for all drivers and manage their payments.
                    </p>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="relative px-5 sm:px-6 md:px-8">
                    <div className="top-0 z-10 flex flex-row mb-4 place-content-between md:sticky">
                        <div className="flex items-center space-x-4">
                            <span className="inline-flex rounded-md shadow-sm isolate">
                                <button
                                    type="button"
                                    className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-900 bg-white md:text-sm rounded-l-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 active:bg-gray-100 disabled:opacity-50"
                                    onClick={paySelectedAssignments}
                                    disabled={!selectedAssignments || selectedAssignments?.length < 2}
                                >
                                    Create Batch Payments ({selectedAssignments?.length})
                                </button>
                                <button
                                    type="button"
                                    className="relative inline-flex items-center px-3 py-2 -ml-px text-xs font-semibold text-gray-900 bg-white md:text-sm rounded-r-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 active:bg-gray-100 disabled:opacity-50"
                                    onClick={unselectAllAssignments}
                                    disabled={!selectedAssignments || selectedAssignments?.length === 0}
                                >
                                    Unselect All
                                </button>
                            </span>

                            <div className="flex items-center space-x-1">
                                <Listbox value={selectedDrivers} onChange={handleDriverChange} multiple by="id">
                                    <div className="relative">
                                        <Listbox.Button className="relative w-48 py-2 pl-3 pr-10 text-left bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer h-9 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <span className="block truncate">
                                                {selectedDrivers.length > 1
                                                    ? `${selectedDrivers.length} drivers`
                                                    : selectedDrivers.length === 1
                                                    ? selectedDrivers[0].name
                                                    : 'Filter by drivers'}
                                            </span>
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                                <ChevronUpDownIcon
                                                    className="w-5 h-5 text-gray-400"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        </Listbox.Button>
                                        <Transition
                                            as={React.Fragment}
                                            leave="transition ease-in duration-100"
                                            leaveFrom="opacity-100"
                                            leaveTo="opacity-0"
                                        >
                                            <Listbox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                                {drivers.map((driver) => (
                                                    <Listbox.Option
                                                        key={driver.id}
                                                        className={({ active }) =>
                                                            `cursor-pointer select-none relative py-2 pl-10 pr-4 ${
                                                                active ? 'text-white bg-blue-600' : 'text-gray-900'
                                                            }`
                                                        }
                                                        value={driver}
                                                    >
                                                        {({ selected, active }) => (
                                                            <>
                                                                <span
                                                                    className={`block truncate ${
                                                                        selected ? 'font-medium' : 'font-normal'
                                                                    }`}
                                                                >
                                                                    {driver.name}
                                                                </span>
                                                                {selected ? (
                                                                    <span
                                                                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                                                            active ? 'text-white' : 'text-blue-600'
                                                                        }`}
                                                                    >
                                                                        <CheckIcon
                                                                            className="w-5 h-5"
                                                                            aria-hidden="true"
                                                                        />
                                                                    </span>
                                                                ) : null}
                                                            </>
                                                        )}
                                                    </Listbox.Option>
                                                ))}
                                            </Listbox.Options>
                                        </Transition>
                                    </div>
                                </Listbox>
                                {selectedDrivers.length > 0 && (
                                    <button
                                        type="button"
                                        className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-900 bg-white rounded-md md:text-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 active:bg-gray-100"
                                        onClick={clearSelectedDrivers}
                                    >
                                        Show all drivers
                                    </button>
                                )}
                            </div>
                        </div>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600 focus:ring-2 focus:ring-offset-2"
                                checked={showUnpaidOnly}
                                onChange={(e) => setShowUnpaidOnly(e.target.checked)}
                            />
                            <span className="text-sm font-medium text-gray-700 cursor-pointer">Show Unpaid Only</span>
                        </label>
                    </div>
                    {loading ? (
                        <CustomersTableSkeleton limit={lastAssignmentsTableLimit} />
                    ) : (
                        <>
                            <AssignmentsTable
                                assignments={assignments}
                                selectedAssignments={selectedAssignments}
                                sort={sort}
                                changeSort={changeSort}
                                loading={tableLoading}
                                onRowClick={handleRowClick}
                                onCheckboxChange={handleCheckboxChange}
                            />
                            {assignments.length !== 0 && !loading && (
                                <Pagination
                                    metadata={metadata}
                                    loading={loading || tableLoading}
                                    onPrevious={previousPage}
                                    onNext={nextPage}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
            <AssignmentPaymentsModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSingleSelectedAssignment(null);
                }}
                assignments={
                    isModalOpen && (singleSelectedAssignment ? [singleSelectedAssignment] : selectedAssignments)
                }
                onAddPayment={() => {
                    reloadAssignments({
                        sort,
                        limit,
                        offset,
                        useTableLoading: true,
                        fromAssignmentPaymentsModal: true,
                        driverIds: selectedDrivers.map((d) => d.id),
                    });
                }}
                onDeletePayment={() => {
                    reloadAssignments({
                        sort,
                        limit,
                        offset,
                        useTableLoading: true,
                        fromAssignmentPaymentsModal: true,
                        driverIds: selectedDrivers.map((d) => d.id),
                    });
                }}
            />
        </Layout>
    );
};

AssignmentsPage.authenticationEnabled = true;

export default AssignmentsPage;
