'use client';

import React, { useState, useEffect } from 'react';
import { ArrowPathIcon, PencilSquareIcon, EyeIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Spinner from 'components/Spinner';
import { getAllAssignments, getAssignmentById } from 'lib/rest/assignment';
import { notify } from 'components/Notification';
import DateRangePicker from '../DateRangePicker';
import dayjs from 'dayjs';
import type { ExpandedDriverAssignment } from 'interfaces/models';
import AssignmentPopup from 'components/assignment/AssignmentPopup';

export interface AssignmentSelectorProps {
    /** Current driver ID for filtering assignments */
    driverId: string;
    /** Currently selected assignments */
    selectedAssignments: ExpandedDriverAssignment[];
    /** All available assignments for the driver */
    allAssignments: ExpandedDriverAssignment[];
    /** Loading state for assignments */
    loadingAssignments: boolean;
    /** Driver name for display */
    driverName?: string;
    /** Mode: create or edit */
    mode?: 'create' | 'edit';
    /** Invoice data for period selection */
    invoice?: {
        fromDate?: string | Date | null;
        toDate?: string | Date | null;
    };
    /** Invoice setter for period updates */
    setInvoice?: React.Dispatch<React.SetStateAction<any>>;
    /** Navigation buttons configuration */
    navigation?: {
        showBackButton?: boolean;
        onBack?: () => void;
        onNext?: () => void;
        nextButtonText?: string;
        backButtonText?: string;
        showCancelButton?: boolean;
        onCancel?: () => void;
        cancelButtonText?: string;
    };
    /** Callbacks */
    onAssignmentToggle: (assignmentId: string) => void;
    onReloadAssignments: () => void;
    /** @deprecated Assignment details are now shown in a popup instead of this callback */
    onAssignmentEdit?: (assignment: ExpandedDriverAssignment) => void;
    /** Custom formatting function for currency */
    formatCurrency?: (amount: string) => string;
    /** Callback to load assignments when period is selected (create mode only) */
    onPeriodChange?: (fromDate: string | null, toDate: string | null) => void;
    /** Current from date for period display */
    fromDate?: Date;
    /** Current to date for period display */
    toDate?: Date;
}

const AssignmentSelector: React.FC<AssignmentSelectorProps> = ({
    driverId,
    selectedAssignments,
    allAssignments,
    loadingAssignments,
    driverName,
    mode = 'create',
    invoice,
    setInvoice,
    navigation = {},
    onAssignmentToggle,
    onReloadAssignments,
    onAssignmentEdit,
    formatCurrency = (amount) => `$${amount}`,
    onPeriodChange,
    fromDate,
    toDate,
}) => {
    const {
        showBackButton = false,
        onBack,
        onNext,
        nextButtonText = 'Next',
        backButtonText = 'Back',
        showCancelButton = false,
        onCancel,
        cancelButtonText = 'Cancel',
    } = navigation;

    // Assignment popup state
    const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
    const [modalAssignment, setModalAssignment] = useState<ExpandedDriverAssignment | null>(null);
    const [loadingAssignment, setLoadingAssignment] = useState(false);

    // Check if invoice period is valid (for create mode)
    const isInvoicePeriodValid = mode === 'edit' || (invoice?.fromDate && invoice?.toDate);
    const shouldShowAssignments = mode === 'edit' || isInvoicePeriodValid;

    const handleNext = () => {
        if (mode === 'create' && !isInvoicePeriodValid) {
            return notify({
                title: 'Please select invoice period dates',
                type: 'error',
            });
        }
        if (selectedAssignments.length === 0) {
            return notify({ title: 'Please select at least one assignment', type: 'error' });
        }
        onNext?.();
    };

    // Handle viewing assignment in popup
    const handleViewAssignment = async (assignment: ExpandedDriverAssignment) => {
        setAssignmentModalOpen(true);
        setLoadingAssignment(true);

        try {
            const fullAssignment = await getAssignmentById(assignment.id);
            setModalAssignment(fullAssignment);
        } catch (error) {
            console.error('Error fetching assignment:', error);
            notify({
                title: 'Error loading assignment details',
                type: 'error',
            });
        } finally {
            setLoadingAssignment(false);
        }
    };

    const handlePeriodChange = React.useCallback(
        (range: { from: Date | undefined; to: Date | undefined }) => {
            if (mode === 'create' && setInvoice) {
                const fromDate = range.from ? dayjs(range.from).format('YYYY-MM-DD') : null;
                const toDate = range.to ? dayjs(range.to).format('YYYY-MM-DD') : null;

                // Only update if the dates have actually changed
                setInvoice((prev) => {
                    if (prev.fromDate === fromDate && prev.toDate === toDate) {
                        return prev; // No change needed
                    }
                    return {
                        ...prev,
                        fromDate,
                        toDate,
                    };
                });

                // Trigger assignments loading when both dates are selected
                if (fromDate && toDate && onPeriodChange) {
                    onPeriodChange(fromDate, toDate);
                }
            }
        },
        [mode, setInvoice, onPeriodChange],
    );

    const handleEditModePeriodChange = React.useCallback(
        (range: { from: Date | undefined; to: Date | undefined }) => {
            // Update invoice object directly instead of reloading assignments
            if (range.from && range.to && onPeriodChange) {
                const fromDateStr = dayjs(range.from).format('YYYY-MM-DD');
                const toDateStr = dayjs(range.to).format('YYYY-MM-DD');
                onPeriodChange(fromDateStr, toDateStr);
            }
        },
        [onPeriodChange],
    );

    const calculateAssignmentAmount = (assignment: ExpandedDriverAssignment): number => {
        let amount = 0;
        switch (assignment.chargeType) {
            case 'PER_MILE':
                const baseMiles = Number(assignment.billedDistanceMiles || assignment.routeLeg.distanceMiles);
                const emptyMiles = Number(assignment.emptyMiles || 0);
                const totalMiles = baseMiles + emptyMiles;
                amount = totalMiles * Number(assignment.chargeValue);
                break;
            case 'PER_HOUR':
                amount =
                    Number(assignment.billedDurationHours || assignment.routeLeg.durationHours) *
                    Number(assignment.chargeValue);
                break;
            case 'PERCENTAGE_OF_LOAD':
                amount =
                    (Number(assignment.billedLoadRate || assignment.load.rate) * Number(assignment.chargeValue)) / 100;
                break;
            case 'FIXED_PAY':
                amount = Number(assignment.chargeValue);
                break;
        }
        return amount;
    };

    const formatLocations = (assignment: ExpandedDriverAssignment): string => {
        return assignment.routeLeg.locations
            .map((loc) => {
                if (loc.loadStop) {
                    return `${loc.loadStop.name.toUpperCase()} (${
                        loc.loadStop.city
                    }, ${loc.loadStop.state.toUpperCase()})`;
                } else if (loc.location) {
                    return `${loc.location.name.toUpperCase()} (${
                        loc.location.city
                    }, ${loc.location.state.toUpperCase()})`;
                }
                return '';
            })
            .join(' -> \n');
    };

    // Unified enhanced layout for both create and edit modes
    return (
        <div>
            <AssignmentPopup
                isOpen={assignmentModalOpen}
                onClose={() => setAssignmentModalOpen(false)}
                assignment={modalAssignment}
                loading={loadingAssignment}
            />
            {/* Header - Dynamic based on mode */}
            <div className="px-4 py-4 sm:px-6 bg-blue-100/50 backdrop-blur-2xl border-b border-blue-100/40 rounded-tl-xl rounded-tr-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">
                                {mode === 'create' ? 'Select Completed Assignments' : 'Edit Assignments'}
                            </h3>
                            <p className="text-xs text-gray-600">
                                {mode === 'create'
                                    ? `Showing completed assignments only${driverName ? ` for ${driverName}` : ''}`
                                    : 'Select or modify assignments for this invoice'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onReloadAssignments}
                        className="flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/40 text-sm font-medium text-gray-700 hover:bg-white/80 transition-all duration-200"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        Reload
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
                {mode === 'create' && driverName && (
                    <div className="mb-4 text-sm text-gray-600">
                        Visit{' '}
                        <Link href={`/drivers/${driverId}`} target="_blank">
                            <span className="text-blue-600 hover:underline cursor-pointer">Driver Page</span>
                        </Link>{' '}
                        to view/edit all assignments for{' '}
                        <span className="font-semibold text-gray-800 capitalize">{driverName}</span>.
                    </div>
                )}

                {/* Invoice Period Selection (Create Mode Only) */}
                {mode === 'create' && (
                    <div className="mb-6">
                        <div className="bg-gray-50/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-gray-200/40">
                            <label className="block text-sm font-semibold text-gray-900 mb-3">
                                Invoice Period
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <DateRangePicker
                                variant="apple"
                                size="lg"
                                placeholder="Select invoice period dates (required)"
                                required={true}
                                error={!isInvoicePeriodValid}
                                initialFrom={
                                    invoice?.fromDate
                                        ? typeof invoice.fromDate === 'string'
                                            ? invoice.fromDate
                                            : invoice.fromDate
                                        : undefined
                                }
                                initialTo={
                                    invoice?.toDate
                                        ? typeof invoice.toDate === 'string'
                                            ? invoice.toDate
                                            : invoice.toDate
                                        : undefined
                                }
                                onChange={handlePeriodChange}
                                className="w-full"
                            />
                            <p className="text-xs text-gray-600 mt-2">
                                Select the date range to load assignments from this period
                            </p>
                        </div>
                    </div>
                )}

                {/* Invoice Period (Edit Mode Only) */}
                {mode === 'edit' && fromDate && toDate && (
                    <div className="mb-6">
                        <div className="bg-blue-50/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-blue-200/40">
                            <div className="mb-3">
                                <label className="block text-sm font-semibold text-gray-900 mb-2">Invoice Period</label>
                                <p className="text-xs text-gray-600">Update the invoice period dates as needed</p>
                            </div>

                            <DateRangePicker
                                variant="apple"
                                size="lg"
                                placeholder="Select invoice period dates"
                                required={true}
                                initialFrom={(() => {
                                    // Safe date formatting to avoid timezone issues
                                    if (fromDate instanceof Date) {
                                        const year = fromDate.getFullYear();
                                        const month = String(fromDate.getMonth() + 1).padStart(2, '0');
                                        const day = String(fromDate.getDate()).padStart(2, '0');
                                        return `${year}-${month}-${day}`;
                                    }
                                    return typeof fromDate === 'string'
                                        ? fromDate
                                        : dayjs(fromDate).format('YYYY-MM-DD');
                                })()}
                                initialTo={(() => {
                                    // Safe date formatting to avoid timezone issues
                                    if (toDate instanceof Date) {
                                        const year = toDate.getFullYear();
                                        const month = String(toDate.getMonth() + 1).padStart(2, '0');
                                        const day = String(toDate.getDate()).padStart(2, '0');
                                        return `${year}-${month}-${day}`;
                                    }
                                    return typeof toDate === 'string' ? toDate : dayjs(toDate).format('YYYY-MM-DD');
                                })()}
                                onChange={handleEditModePeriodChange}
                                className="w-full"
                            />
                        </div>
                    </div>
                )}

                {!shouldShowAssignments && mode === 'create' ? (
                    <div className="flex items-center justify-center w-full p-8 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg
                                    className="w-6 h-6 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <p className="text-gray-600 font-medium">Select invoice period to load assignments</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Choose date range above to see available assignments
                            </p>
                        </div>
                    </div>
                ) : loadingAssignments ? (
                    <div className="flex items-center justify-center w-full p-8">
                        <Spinner /> <span className="ml-2">Loading Assignments</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Period Feedback Message */}
                        {mode === 'create' && invoice?.fromDate && invoice?.toDate && (
                            <div className="bg-gray-50/50 backdrop-blur-sm p-3 rounded-lg border border-gray-200/40">
                                <div className="flex items-center gap-2">
                                    <svg
                                        className="w-4 h-4 text-gray-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <span className="text-sm text-gray-600 font-medium">
                                        Assignments completed within invoice period (
                                        {(() => {
                                            // Parse dates as local dates to avoid timezone issues
                                            const fromDateStr =
                                                typeof invoice.fromDate === 'string'
                                                    ? invoice.fromDate
                                                    : invoice.fromDate.toISOString().split('T')[0];
                                            const toDateStr =
                                                typeof invoice.toDate === 'string'
                                                    ? invoice.toDate
                                                    : invoice.toDate.toISOString().split('T')[0];
                                            const [fromYear, fromMonth, fromDay] = fromDateStr.split('-').map(Number);
                                            const [toYear, toMonth, toDay] = toDateStr.split('-').map(Number);
                                            const fromDateLocal = new Date(fromYear, fromMonth - 1, fromDay);
                                            const toDateLocal = new Date(toYear, toMonth - 1, toDay);
                                            return `${fromDateLocal.toLocaleDateString()} - ${toDateLocal.toLocaleDateString()}`;
                                        })()}
                                        ) are highlighted with light green background.
                                    </span>
                                </div>
                            </div>
                        )}

                        {allAssignments.map((assignment) => {
                            const calculatedAmount = calculateAssignmentAmount(assignment);
                            const isSelected = selectedAssignments.some((a) => a.id === assignment.id);

                            // Check if assignment is within invoice period
                            const completedDate = assignment.routeLeg.endedAt;
                            const isWithinPeriod =
                                (mode === 'create' || mode === 'edit') &&
                                invoice?.fromDate &&
                                invoice?.toDate &&
                                completedDate
                                    ? (() => {
                                          const completed = new Date(completedDate);
                                          // Parse dates as local dates to avoid timezone issues
                                          const fromDateStr =
                                              typeof invoice.fromDate === 'string'
                                                  ? invoice.fromDate
                                                  : invoice.fromDate.toISOString().split('T')[0];
                                          const toDateStr =
                                              typeof invoice.toDate === 'string'
                                                  ? invoice.toDate
                                                  : invoice.toDate.toISOString().split('T')[0];
                                          const [fromYear, fromMonth, fromDay] = fromDateStr.split('-').map(Number);
                                          const [toYear, toMonth, toDay] = toDateStr.split('-').map(Number);
                                          const fromDate = new Date(fromYear, fromMonth - 1, fromDay, 0, 0, 0, 0);
                                          const toDate = new Date(toYear, toMonth - 1, toDay, 23, 59, 59, 999);
                                          return completed >= fromDate && completed <= toDate;
                                      })()
                                    : false;

                            return (
                                <div
                                    key={assignment.id}
                                    className={`backdrop-blur-xl rounded-xl p-3 sm:p-4 border transition-all duration-200 cursor-pointer hover:shadow-md ${
                                        isSelected
                                            ? 'border-blue-300/60 bg-blue-50/30'
                                            : isWithinPeriod
                                            ? 'bg-green-50/60 border-green-200/50 hover:border-green-300/60 hover:bg-green-50/80'
                                            : 'bg-white/50 border-gray-200/40 hover:border-gray-300/60'
                                    }`}
                                    onClick={() => onAssignmentToggle(assignment.id)}
                                >
                                    {/* Mobile Layout (< lg) */}
                                    <div className="lg:hidden space-y-3">
                                        {/* Assignment Header with Checkbox and Total */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => onAssignmentToggle(assignment.id)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <Link
                                                        href={`/loads/${assignment.load.id}#load-assignments`}
                                                        target="_blank"
                                                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm underline block"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        #{assignment.load.refNum}
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewAssignment(assignment);
                                                        }}
                                                        className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded mt-1 hover:bg-blue-200 transition text-center inline-flex items-center gap-1"
                                                    >
                                                        <EyeIcon className="w-3 h-3" />
                                                        View
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Total Amount - Top Right */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAssignmentEdit?.(assignment);
                                                }}
                                                className="flex items-center gap-1 text-sm font-bold text-green-600 hover:text-green-700 transition-colors"
                                            >
                                                {formatCurrency(calculatedAmount.toFixed(2))}
                                                <PencilSquareIcon className="w-3 h-3" />
                                            </button>
                                        </div>{' '}
                                        {/* Route Information */}
                                        <div className="space-y-2 sm:space-y-3">
                                            {/* Route Details */}
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <div className="bg-green-50/40 p-2 sm:p-3 rounded-lg">
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                            <span className="text-xs font-medium text-green-800">
                                                                Pickup
                                                            </span>
                                                        </div>
                                                        <p className="text-green-700 font-medium text-xs leading-tight">
                                                            {assignment.routeLeg.locations[0].loadStop?.name ||
                                                                assignment.routeLeg.locations[0].location?.name}
                                                        </p>
                                                        <p className="text-green-600 text-xs mb-2">
                                                            {assignment.routeLeg.locations[0].loadStop?.city ||
                                                                assignment.routeLeg.locations[0].location?.city}
                                                            ,{' '}
                                                            {assignment.routeLeg.locations[0].loadStop?.state ||
                                                                assignment.routeLeg.locations[0].location?.state}
                                                        </p>
                                                        {/* Started At Badge */}
                                                        {assignment.routeLeg.startedAt && (
                                                            <div className="mt-2">
                                                                <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                                                                    <span className="text-xs whitespace-nowrap">
                                                                        Started @{' '}
                                                                        {new Date(
                                                                            assignment.routeLeg.startedAt,
                                                                        ).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: '2-digit',
                                                                        })}{' '}
                                                                        {new Date(
                                                                            assignment.routeLeg.startedAt,
                                                                        ).toLocaleTimeString('en-US', {
                                                                            hour: 'numeric',
                                                                            minute: '2-digit',
                                                                            hour12: true,
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="bg-red-50/40 p-2 sm:p-3 rounded-lg">
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                            <span className="text-xs font-medium text-red-800">
                                                                Delivery
                                                            </span>
                                                        </div>
                                                        <p className="text-red-700 font-medium text-xs leading-tight">
                                                            {assignment.routeLeg.locations[
                                                                assignment.routeLeg.locations.length - 1
                                                            ].loadStop?.name ||
                                                                assignment.routeLeg.locations[
                                                                    assignment.routeLeg.locations.length - 1
                                                                ].location?.name}
                                                        </p>
                                                        <p className="text-red-600 text-xs mb-2">
                                                            {assignment.routeLeg.locations[
                                                                assignment.routeLeg.locations.length - 1
                                                            ].loadStop?.city ||
                                                                assignment.routeLeg.locations[
                                                                    assignment.routeLeg.locations.length - 1
                                                                ].location?.city}
                                                            ,{' '}
                                                            {assignment.routeLeg.locations[
                                                                assignment.routeLeg.locations.length - 1
                                                            ].loadStop?.state ||
                                                                assignment.routeLeg.locations[
                                                                    assignment.routeLeg.locations.length - 1
                                                                ].location?.state}
                                                        </p>
                                                        {/* Completed At Badge */}
                                                        {completedDate && (
                                                            <div className="mt-2">
                                                                <div
                                                                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                                                        isWithinPeriod
                                                                            ? 'bg-red-100 text-red-800 border border-red-200'
                                                                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                                                                    }`}
                                                                >
                                                                    <span className="text-xs whitespace-nowrap">
                                                                        Completed @{' '}
                                                                        {new Date(completedDate).toLocaleDateString(
                                                                            'en-US',
                                                                            {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                year: '2-digit',
                                                                            },
                                                                        )}{' '}
                                                                        {new Date(completedDate).toLocaleTimeString(
                                                                            'en-US',
                                                                            {
                                                                                hour: 'numeric',
                                                                                minute: '2-digit',
                                                                                hour12: true,
                                                                            },
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Distance & Empty Miles */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                <div className="bg-gray-50/80 rounded-lg p-2 sm:p-3">
                                                    <div className="text-xs text-gray-600 mb-1">Distance</div>
                                                    <div className="text-xs sm:text-sm font-semibold text-gray-900">
                                                        {Number(
                                                            assignment.billedDistanceMiles ||
                                                                assignment.routeLeg.distanceMiles,
                                                        ).toFixed(1)}{' '}
                                                        mi
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50/80 rounded-lg p-2 sm:p-3">
                                                    <div className="text-xs text-gray-600 mb-1">Empty Miles</div>
                                                    <div className="text-xs sm:text-sm font-semibold text-gray-700">
                                                        {Number(assignment.emptyMiles || 0).toFixed(1)} mi
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Charge Type & Rate */}
                                            <div className="bg-blue-50/30 p-2 sm:p-3 rounded-lg">
                                                <div className="text-xs text-gray-600 mb-1">Charge Type & Rate</div>
                                                <div className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight mb-1">
                                                    {assignment.chargeType.replace(/_/g, ' ')}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {assignment.chargeType === 'PER_MILE' && (
                                                        <div>
                                                            <div>${Number(assignment.chargeValue).toFixed(2)}/mi</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                Total:{' '}
                                                                {Number(
                                                                    assignment.billedDistanceMiles ||
                                                                        assignment.routeLeg.distanceMiles,
                                                                ).toFixed(1)}{' '}
                                                                + {Number(assignment.emptyMiles || 0).toFixed(1)} ={' '}
                                                                {(
                                                                    Number(
                                                                        assignment.billedDistanceMiles ||
                                                                            assignment.routeLeg.distanceMiles,
                                                                    ) + Number(assignment.emptyMiles || 0)
                                                                ).toFixed(1)}{' '}
                                                                mi
                                                            </div>
                                                        </div>
                                                    )}
                                                    {assignment.chargeType === 'PER_HOUR' && (
                                                        <div>
                                                            <div>${Number(assignment.chargeValue).toFixed(2)}/hr</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                Hours:{' '}
                                                                {Number(
                                                                    assignment.billedDurationHours ||
                                                                        assignment.routeLeg.durationHours,
                                                                ).toFixed(1)}{' '}
                                                                hrs
                                                            </div>
                                                        </div>
                                                    )}
                                                    {assignment.chargeType === 'PERCENTAGE_OF_LOAD' && (
                                                        <div>
                                                            <div>{Number(assignment.chargeValue).toFixed(2)}%</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                Load Rate:{' '}
                                                                {formatCurrency(
                                                                    Number(
                                                                        assignment.billedLoadRate ||
                                                                            assignment.load.rate,
                                                                    ).toFixed(2),
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {assignment.chargeType === 'FIXED_PAY' &&
                                                        formatCurrency(Number(assignment.chargeValue).toFixed(2))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop Layout (>= lg) */}
                                    <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-center">
                                        {/* Checkbox */}
                                        <div className="col-span-1">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onAssignmentToggle(assignment.id)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                        </div>{' '}
                                        {/* Order Number */}
                                        <div className="col-span-1">
                                            <Link
                                                href={`/loads/${assignment.load.id}#load-assignments`}
                                                target="_blank"
                                                className="text-blue-600 hover:text-blue-800 font-semibold text-sm underline block mb-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                #{assignment.load.refNum}
                                            </Link>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewAssignment(assignment);
                                                }}
                                                className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition text-center inline-flex items-center gap-1"
                                            >
                                                <EyeIcon className="w-3 h-3" />
                                                View
                                            </button>
                                        </div>
                                        {/* Route */}
                                        <div className="col-span-5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-green-50/40 p-2 rounded-lg">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                        <span className="text-xs font-medium text-green-800">
                                                            Pickup
                                                        </span>
                                                    </div>
                                                    <p className="text-green-700 font-medium text-xs leading-tight truncate">
                                                        {assignment.routeLeg.locations[0].loadStop?.name ||
                                                            assignment.routeLeg.locations[0].location?.name}
                                                    </p>
                                                    <p className="text-green-600 text-xs mb-2">
                                                        {assignment.routeLeg.locations[0].loadStop?.city ||
                                                            assignment.routeLeg.locations[0].location?.city}
                                                        ,{' '}
                                                        {assignment.routeLeg.locations[0].loadStop?.state ||
                                                            assignment.routeLeg.locations[0].location?.state}
                                                    </p>
                                                    {/* Started At Badge */}
                                                    {assignment.routeLeg.startedAt && (
                                                        <div className="mt-1">
                                                            <div className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                                                                <span className="text-xs whitespace-nowrap">
                                                                    Started @{' '}
                                                                    {new Date(
                                                                        assignment.routeLeg.startedAt,
                                                                    ).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                    })}{' '}
                                                                    {new Date(
                                                                        assignment.routeLeg.startedAt,
                                                                    ).toLocaleTimeString('en-US', {
                                                                        hour: 'numeric',
                                                                        minute: '2-digit',
                                                                        hour12: true,
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-3 h-0.5 bg-gray-300 rounded-full"></div>
                                                <div className="flex-1 bg-red-50/40 p-2 rounded-lg">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                        <span className="text-xs font-medium text-red-800">
                                                            Delivery
                                                        </span>
                                                    </div>
                                                    <p className="text-red-700 font-medium text-xs leading-tight truncate">
                                                        {assignment.routeLeg.locations[
                                                            assignment.routeLeg.locations.length - 1
                                                        ].loadStop?.name ||
                                                            assignment.routeLeg.locations[
                                                                assignment.routeLeg.locations.length - 1
                                                            ].location?.name}
                                                    </p>
                                                    <p className="text-red-600 text-xs mb-2">
                                                        {assignment.routeLeg.locations[
                                                            assignment.routeLeg.locations.length - 1
                                                        ].loadStop?.city ||
                                                            assignment.routeLeg.locations[
                                                                assignment.routeLeg.locations.length - 1
                                                            ].location?.city}
                                                        ,{' '}
                                                        {assignment.routeLeg.locations[
                                                            assignment.routeLeg.locations.length - 1
                                                        ].loadStop?.state ||
                                                            assignment.routeLeg.locations[
                                                                assignment.routeLeg.locations.length - 1
                                                            ].location?.state}
                                                    </p>
                                                    {/* Completed At Badge */}
                                                    {completedDate && (
                                                        <div className="mt-1">
                                                            <div
                                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                                                                    isWithinPeriod
                                                                        ? 'bg-red-100 text-red-800 border border-red-200'
                                                                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                                                                }`}
                                                            >
                                                                <span className="text-xs whitespace-nowrap">
                                                                    Completed @{' '}
                                                                    {new Date(completedDate).toLocaleDateString(
                                                                        'en-US',
                                                                        {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                        },
                                                                    )}{' '}
                                                                    {new Date(completedDate).toLocaleTimeString(
                                                                        'en-US',
                                                                        {
                                                                            hour: 'numeric',
                                                                            minute: '2-digit',
                                                                            hour12: true,
                                                                        },
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Distance & Empty Miles */}
                                        <div className="col-span-2">
                                            <div className="space-y-2">
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-500 mb-0.5">Distance</div>
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {Number(
                                                            assignment.billedDistanceMiles ||
                                                                assignment.routeLeg.distanceMiles,
                                                        ).toFixed(1)}{' '}
                                                        mi
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-500 mb-0.5">Empty Miles</div>
                                                    <div className="text-sm font-semibold text-gray-700">
                                                        {Number(assignment.emptyMiles || 0).toFixed(1)} mi
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Charge Type & Rate */}
                                        <div className="col-span-2 text-center">
                                            <div className="text-xs text-gray-500 mb-0.5">Charge Type</div>
                                            <div className="text-sm font-semibold text-gray-900 leading-tight mb-1">
                                                {assignment.chargeType.replace(/_/g, ' ')}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                {assignment.chargeType === 'PER_MILE' && (
                                                    <div>
                                                        <div>${Number(assignment.chargeValue).toFixed(2)}/mi</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            Total:{' '}
                                                            {(
                                                                Number(
                                                                    assignment.billedDistanceMiles ||
                                                                        assignment.routeLeg.distanceMiles,
                                                                ) + Number(assignment.emptyMiles || 0)
                                                            ).toFixed(1)}{' '}
                                                            mi
                                                        </div>
                                                    </div>
                                                )}
                                                {assignment.chargeType === 'PER_HOUR' && (
                                                    <div>
                                                        <div>${Number(assignment.chargeValue).toFixed(2)}/hr</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {Number(
                                                                assignment.billedDurationHours ||
                                                                    assignment.routeLeg.durationHours,
                                                            ).toFixed(1)}{' '}
                                                            hrs
                                                        </div>
                                                    </div>
                                                )}
                                                {assignment.chargeType === 'PERCENTAGE_OF_LOAD' && (
                                                    <div>
                                                        <div>{Number(assignment.chargeValue).toFixed(2)}%</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {formatCurrency(
                                                                Number(
                                                                    assignment.billedLoadRate || assignment.load.rate,
                                                                ).toFixed(2),
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {assignment.chargeType === 'FIXED_PAY' &&
                                                    formatCurrency(Number(assignment.chargeValue).toFixed(2))}
                                            </div>
                                        </div>
                                        {/* Amount */}
                                        <div className="col-span-1 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAssignmentEdit?.(assignment);
                                                }}
                                                className="flex items-center gap-1 text-sm font-bold text-green-600 hover:text-green-700 transition-colors"
                                            >
                                                {formatCurrency(calculatedAmount.toFixed(2))}
                                                <PencilSquareIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Navigation */}
                <div className="mt-6 flex justify-between">
                    {showCancelButton && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-gray-300/60 text-gray-700 rounded-lg hover:bg-white/80 transition-all duration-200"
                        >
                            {cancelButtonText}
                        </button>
                    )}
                    {showBackButton && (
                        <button
                            onClick={onBack}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {backButtonText}
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                    >
                        {nextButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignmentSelector;
