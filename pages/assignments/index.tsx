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
    }, [limitProp, offsetProp, showUnpaidOnly]);

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
            const currentSelectedAssignmentIds = new Set(selectedAssignments.map((assignment) => assignment.id));
            const currentSingleSelectedAssignmentId = singleSelectedAssignment?.id;
            const { assignments, metadata: metadataResponse } = await getAllAssignments({
                limit,
                offset,
                sort,
                showUnpaidOnly,
            });
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
                    reloadAssignments({ sort, limit, offset, useTableLoading: true });
                }}
                onDeletePayment={() => {
                    reloadAssignments({ sort, limit, offset, useTableLoading: true });
                }}
            />
        </Layout>
    );
};

AssignmentsPage.authenticationEnabled = true;

export default AssignmentsPage;
