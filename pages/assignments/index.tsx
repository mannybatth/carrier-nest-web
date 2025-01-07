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
import AssignmentPaymentsModal from 'components/assignment/AssignmentPaymentsModal';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';

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
    const [selectedAssignment, setSelectedAssignment] = useState<ExpandedDriverAssignment | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssignments, setSelectedAssignments] = useState<ExpandedDriverAssignment[]>([]);

    const [sort, setSort] = useState<Sort>(sortProps);
    const [limit, setLimit] = useState(limitProp);
    const [offset, setOffset] = useState(offsetProp);
    const [metadata, setMetadata] = useState<PaginationMetadata>({
        total: 0,
        currentOffset: offsetProp,
        currentLimit: limitProp,
    });

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
        !useTableLoading && setLoading(true);
        useTableLoading && setTableLoading(true);
        try {
            const currentSelectedAssignmentId = selectedAssignment?.id;
            const { assignments, metadata: metadataResponse } = await getAllAssignments({
                limit,
                offset,
                sort,
            });
            setLastAssignmentsTableLimit(assignments.length !== 0 ? assignments.length : lastAssignmentsTableLimit);
            setAssignments(assignments);
            setMetadata(metadataResponse);

            if (currentSelectedAssignmentId) {
                setSelectedAssignment(
                    assignments.find((assignment) => assignment.id === currentSelectedAssignmentId) || null,
                );
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
        setSelectedAssignment(assignment);
        setIsModalOpen(true);
    };

    const handleCheckboxChange = (assignment: ExpandedDriverAssignment, isChecked: boolean) => {
        if (isChecked) {
            setSelectedAssignments([...selectedAssignments, assignment]);
        } else {
            setSelectedAssignments(selectedAssignments.filter((a) => a.id !== assignment.id));
        }
    };

    const paySelectedAssignments = () => {
        // Implement the logic to pay selected assignments
        console.log('Paying selected assignments:', selectedAssignments);
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
                    {loading ? (
                        <CustomersTableSkeleton limit={lastAssignmentsTableLimit} />
                    ) : (
                        <>
                            <div className="top-0 z-10 flex flex-row mb-4 place-content-between md:sticky">
                                <button
                                    type="button"
                                    className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-900 bg-white rounded-md md:text-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 active:bg-gray-100 disabled:opacity-50"
                                    onClick={paySelectedAssignments}
                                    disabled={selectedAssignments.length === 0}
                                >
                                    Pay Selected Assignments
                                </button>
                            </div>
                            <AssignmentsTable
                                assignments={assignments}
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
                onClose={() => setIsModalOpen(false)}
                assignment={selectedAssignment}
                onAddPayment={() => {
                    reloadAssignments({ sort, limit, offset, useTableLoading: true });
                }}
                onDeletePayment={async (paymentId) => {
                    reloadAssignments({ sort, limit, offset, useTableLoading: true });
                }}
            />
        </Layout>
    );
};

AssignmentsPage.authenticationEnabled = true;

export default AssignmentsPage;
