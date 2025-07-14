'use client';

import type React from 'react';

import { Fragment, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, Transition } from '@headlessui/react';
import {
    TruckIcon,
    CalendarIcon,
    ClockIcon,
    MapPinIcon,
    CheckCircleIcon,
    CurrencyDollarIcon,
    PhoneIcon,
    DocumentTextIcon,
    EllipsisHorizontalIcon,
    ExclamationCircleIcon,
    ArrowLongRightIcon,
    MapIcon,
    ArrowTopRightOnSquareIcon,
    ReceiptRefundIcon,
    StopIcon,
    PencilIcon,
    PlayIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import type { ExpandedDriverAssignment } from '../../interfaces/models';
import type { Sort } from '../../interfaces/table';
import { RouteLegStatus } from '@prisma/client';

// Helper functions
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if date is today or tomorrow
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    }

    // Otherwise return formatted date
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
};

const formatTime = (timeString: string) => {
    // Convert 24-hour time format to 12-hour format
    const [hours, minutes] = timeString.split(':');
    const hour = Number.parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX for 10-digit numbers
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // Format as +X (XXX) XXX-XXXX for 11-digit numbers (assuming country code 1)
    if (digits.length === 11 && digits.startsWith('1')) {
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    // Return original if not a recognized format
    return phone;
};

// Create Google Maps URL from coordinates
const createGoogleMapsUrl = (latitude: number, longitude: number, label?: string) => {
    const baseUrl = 'https://www.google.com/maps';

    if (label) {
        // Include a label/pin text if provided
        return `${baseUrl}?q=${latitude},${longitude}&z=15&query=${latitude},${longitude}&query_place_id=${encodeURIComponent(
            label,
        )}`;
    } else {
        return `${baseUrl}?q=${latitude},${longitude}&z=15`;
    }
};

// Status configuration
const statusConfig = {
    [RouteLegStatus.ASSIGNED]: {
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: <div className="h-2 w-2 rounded-full bg-gray-400 mr-1.5"></div>,
        label: 'Assigned',
        progress: 0,
    },
    [RouteLegStatus.IN_PROGRESS]: {
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <ExclamationCircleIcon className="h-3 w-3 text-amber-500 mr-1.5" />,
        label: 'In Progress',
        progress: 50,
    },
    [RouteLegStatus.COMPLETED]: {
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1.5" />,
        label: 'Completed',
        progress: 100,
    },
};

type Props = {
    assignments: ExpandedDriverAssignment[];
    headers?: string[];
    sort?: Sort;
    loading: boolean;
    changeSort?: (sort: Sort) => void;
    deleteAssignment: (id: string) => void;
    changeLegStatusClicked: (status: string, legId: string) => void;
};

export const DriverAssignmentsTable: React.FC<Props> = ({
    assignments,
    changeSort,
    sort,
    loading,
    headers = [],
    deleteAssignment,
    changeLegStatusClicked,
}) => {
    const router = useRouter();
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});

    console.log('DriverAssignmentsTable', assignments);

    const handleStatusChange = async (status: string, legId: string) => {
        setUpdatingStatus((prev) => ({ ...prev, [legId]: true }));
        try {
            await changeLegStatusClicked(status, legId);
        } finally {
            setUpdatingStatus((prev) => ({ ...prev, [legId]: false }));
        }
    };

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    return (
        <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-50">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th
                                scope="col"
                                className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                            >
                                <div className="flex items-center gap-0">
                                    <TruckIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                    Load
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                            >
                                <div className="flex items-center gap-0">
                                    <CalendarIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                    Schedule
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                            >
                                <div className="flex items-center gap-0">
                                    <MapPinIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                    Locations
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                            >
                                <div className="flex items-center gap-0">
                                    <CurrencyDollarIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                    Charge
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                            >
                                <div className="flex items-center gap-0">
                                    <StopIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                    Status
                                </div>
                            </th>
                            <th scope="col" className="relative px-8 py-4 w-10">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {assignments.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <DocumentTextIcon className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            No assignments available
                                        </h3>
                                        <p className="text-sm text-gray-500 mb-6 max-w-sm">
                                            Get started by creating a new load assignment for your drivers.
                                        </p>
                                        <Link href="/loads/create">
                                            <a className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200">
                                                + Create Load
                                            </a>
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            assignments.map((assignment) => {
                                // Get pickup and delivery locations
                                const pickupLocation = assignment.routeLeg.locations.find(
                                    (loc) => loc.loadStop?.type === 'SHIPPER',
                                )?.loadStop;

                                const deliveryLocation = assignment.routeLeg.locations.find(
                                    (loc) => loc.loadStop?.type === 'RECEIVER',
                                )?.loadStop;

                                const status = assignment.routeLeg.status;
                                const statusInfo = statusConfig[status];
                                const isExpanded = expandedRows[assignment.id] || false;
                                const isInvoiced = assignment.invoiceId !== null;

                                // Check if location updates are available
                                const hasStartLocation =
                                    assignment.routeLeg.startLatitude !== null &&
                                    assignment.routeLeg.startLongitude !== null;
                                const hasEndLocation =
                                    assignment.routeLeg.endLatitude !== null &&
                                    assignment.routeLeg.endLongitude !== null;

                                return (
                                    <Fragment key={assignment.id}>
                                        <tr
                                            className={`hover:bg-gray-50/70 transition-all duration-200 cursor-pointer ${
                                                isExpanded ? 'bg-blue-50/50' : ''
                                            }`}
                                            onClick={() => toggleRow(assignment.id)}
                                        >
                                            {/* Load Column */}
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center mb-1">
                                                        <Link
                                                            href={`/loads/${assignment.load.id}`}
                                                            target="_blank"
                                                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                                                        >
                                                            Order# {assignment.load.refNum}
                                                        </Link>
                                                    </div>
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        Load# <span className="ml-1">{assignment.load.loadNum}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Schedule Column */}
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center text-sm font-medium text-gray-900">
                                                        <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                                                        <span>
                                                            {formatDate(assignment.routeLeg.scheduledDate.toString())}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center mt-1 text-xs text-gray-500">
                                                        <ClockIcon className="w-3 h-3 mr-1.5 text-gray-400" />
                                                        <span>{formatTime(assignment.routeLeg.scheduledTime)}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Locations Column */}
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <div className="flex items-start">
                                                        {assignment.routeLeg.locations.length > 0 && (
                                                            <>
                                                                {/* First location (pickup) */}
                                                                <div className="flex-1 min-w-0 pr-3">
                                                                    <div className="flex items-center">
                                                                        <div className="h-2.5 w-2.5 rounded-full bg-green-500 mr-2 flex-shrink-0"></div>
                                                                        <span
                                                                            className="text-sm font-medium text-gray-900 truncate uppercase"
                                                                            title={`${
                                                                                assignment.routeLeg.locations[0]
                                                                                    .loadStop?.city ||
                                                                                assignment.routeLeg.locations[0]
                                                                                    .location?.city
                                                                            }, ${
                                                                                assignment.routeLeg.locations[0]
                                                                                    .loadStop?.state ||
                                                                                assignment.routeLeg.locations[0]
                                                                                    .location?.state
                                                                            }`}
                                                                        >
                                                                            {assignment.routeLeg.locations[0].loadStop
                                                                                ?.city ||
                                                                                assignment.routeLeg.locations[0]
                                                                                    .location?.city}
                                                                            ,{' '}
                                                                            {assignment.routeLeg.locations[0].loadStop
                                                                                ?.state ||
                                                                                assignment.routeLeg.locations[0]
                                                                                    .location?.state}
                                                                        </span>
                                                                    </div>
                                                                    <p
                                                                        className="text-xs text-gray-500 truncate mt-1 ml-4.5"
                                                                        title={
                                                                            assignment.routeLeg.locations[0].loadStop
                                                                                ?.name ||
                                                                            assignment.routeLeg.locations[0].location
                                                                                ?.name
                                                                        }
                                                                    >
                                                                        {assignment.routeLeg.locations[0].loadStop
                                                                            ?.name ||
                                                                            assignment.routeLeg.locations[0].location
                                                                                ?.name}
                                                                    </p>
                                                                </div>

                                                                <ArrowLongRightIcon className="w-4 h-4 mx-2 text-gray-300 flex-shrink-0 mt-0.5" />

                                                                {/* Last location (delivery) */}
                                                                {assignment.routeLeg.locations.length > 1 && (
                                                                    <div className="flex-1 min-w-0 pl-3">
                                                                        <div className="flex items-center">
                                                                            <div className="h-2.5 w-2.5 rounded-full bg-red-500 mr-2 flex-shrink-0"></div>
                                                                            <span
                                                                                className="text-sm font-medium text-gray-900 truncate uppercase"
                                                                                title={`${
                                                                                    assignment.routeLeg.locations[
                                                                                        assignment.routeLeg.locations
                                                                                            .length - 1
                                                                                    ].loadStop?.city ||
                                                                                    assignment.routeLeg.locations[
                                                                                        assignment.routeLeg.locations
                                                                                            .length - 1
                                                                                    ].location?.city
                                                                                }, ${
                                                                                    assignment.routeLeg.locations[
                                                                                        assignment.routeLeg.locations
                                                                                            .length - 1
                                                                                    ].loadStop?.state ||
                                                                                    assignment.routeLeg.locations[
                                                                                        assignment.routeLeg.locations
                                                                                            .length - 1
                                                                                    ].location?.state
                                                                                }`}
                                                                            >
                                                                                {assignment.routeLeg.locations[
                                                                                    assignment.routeLeg.locations
                                                                                        .length - 1
                                                                                ].loadStop?.city ||
                                                                                    assignment.routeLeg.locations[
                                                                                        assignment.routeLeg.locations
                                                                                            .length - 1
                                                                                    ].location?.city}
                                                                                ,{' '}
                                                                                {assignment.routeLeg.locations[
                                                                                    assignment.routeLeg.locations
                                                                                        .length - 1
                                                                                ].loadStop?.state ||
                                                                                    assignment.routeLeg.locations[
                                                                                        assignment.routeLeg.locations
                                                                                            .length - 1
                                                                                    ].location?.state}
                                                                            </span>
                                                                        </div>
                                                                        <p
                                                                            className="text-xs text-gray-500 truncate mt-1 ml-4.5"
                                                                            title={
                                                                                assignment.routeLeg.locations[
                                                                                    assignment.routeLeg.locations
                                                                                        .length - 1
                                                                                ].loadStop?.name ||
                                                                                assignment.routeLeg.locations[
                                                                                    assignment.routeLeg.locations
                                                                                        .length - 1
                                                                                ].location?.name
                                                                            }
                                                                        >
                                                                            {assignment.routeLeg.locations[
                                                                                assignment.routeLeg.locations.length - 1
                                                                            ].loadStop?.name ||
                                                                                assignment.routeLeg.locations[
                                                                                    assignment.routeLeg.locations
                                                                                        .length - 1
                                                                                ].location?.name}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center mt-3 text-xs text-gray-500">
                                                        <div className="flex items-center">
                                                            <MapPinIcon className="w-3 h-3 mr-1.5 text-gray-400" />
                                                            <span>
                                                                {Math.round(Number(assignment.routeLeg.distanceMiles))}{' '}
                                                                mi
                                                            </span>
                                                        </div>
                                                        <span className="mx-3 text-gray-300">•</span>
                                                        <div className="flex items-center">
                                                            <ClockIcon className="w-3 h-3 mr-1.5 text-gray-400" />
                                                            <span>
                                                                {Math.round(Number(assignment.routeLeg.durationHours))}{' '}
                                                                hrs
                                                            </span>
                                                        </div>
                                                        {assignment.routeLeg.locations.length > 2 && (
                                                            <>
                                                                <span className="mx-3 text-gray-300">•</span>
                                                                <div className="flex items-center">
                                                                    <StopIcon className="w-3 h-3 mr-1.5 text-gray-400" />
                                                                    <span>
                                                                        {assignment.routeLeg.locations.length} stops
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Charge Column */}
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center text-sm font-semibold text-gray-900">
                                                        <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center mr-3">
                                                            <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                                                        </div>
                                                        <span>
                                                            {assignment.chargeType === 'PER_HOUR'
                                                                ? `$${assignment.chargeValue}/hr`
                                                                : assignment.chargeType === 'PER_MILE'
                                                                ? `$${assignment.chargeValue}/mi`
                                                                : assignment.chargeType === 'PERCENTAGE_OF_LOAD'
                                                                ? `${assignment.chargeValue}%`
                                                                : `$${assignment.chargeValue}`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-2 ml-11">
                                                        <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">
                                                            {assignment.chargeType === 'PER_HOUR'
                                                                ? 'Per Hour'
                                                                : assignment.chargeType === 'PER_MILE'
                                                                ? 'Per Mile'
                                                                : assignment.chargeType === 'PERCENTAGE_OF_LOAD'
                                                                ? 'Percentage of Load'
                                                                : assignment.chargeType === 'FIXED_PAY'
                                                                ? 'Fixed Pay'
                                                                : 'Fixed Amount'}
                                                        </span>
                                                        {isInvoiced && (
                                                            <span className="flex w-fit items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                                                                <ReceiptRefundIcon className="w-3 h-3 mr-1.5" />
                                                                Invoiced
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status Column */}
                                            <td className="px-8 py-6">
                                                <div className="flex items-center">
                                                    {updatingStatus[assignment.routeLeg.id] ? (
                                                        <div className="flex items-center px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 bg-gray-50">
                                                            <div className="w-4 h-4 mr-2">
                                                                <svg
                                                                    className="w-4 h-4 animate-spin text-gray-500"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <circle
                                                                        className="opacity-25"
                                                                        cx="12"
                                                                        cy="12"
                                                                        r="10"
                                                                        stroke="currentColor"
                                                                        strokeWidth="4"
                                                                    ></circle>
                                                                    <path
                                                                        className="opacity-75"
                                                                        fill="currentColor"
                                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                                    ></path>
                                                                </svg>
                                                            </div>
                                                            <span className="text-gray-600">Updating...</span>
                                                        </div>
                                                    ) : (
                                                        <span
                                                            className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium border shadow-sm ${statusInfo.color}`}
                                                        >
                                                            {statusInfo.label}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions Column */}
                                            <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                <Menu as="div" className="relative inline-block text-left">
                                                    {({ open }) => {
                                                        const buttonRef = useRef<HTMLButtonElement>(null);
                                                        const [menuPosition, setMenuPosition] = useState({
                                                            top: 0,
                                                            left: 0,
                                                        });

                                                        const updateMenuPosition = () => {
                                                            if (buttonRef.current) {
                                                                const rect = buttonRef.current.getBoundingClientRect();
                                                                const viewportHeight = window.innerHeight;
                                                                const menuHeight = 200; // Approximate height
                                                                const menuWidth = 192; // w-48 = 12rem = 192px

                                                                // Always align menu to the right of the button
                                                                let top = rect.bottom + window.scrollY + 4;
                                                                const left = rect.right + window.scrollX - menuWidth;

                                                                // Adjust if menu would go below viewport
                                                                if (rect.bottom + menuHeight > viewportHeight) {
                                                                    top = rect.top + window.scrollY - menuHeight - 4;
                                                                }

                                                                setMenuPosition({ top, left });
                                                            }
                                                        };

                                                        useEffect(() => {
                                                            if (open) {
                                                                updateMenuPosition();
                                                                const handleResize = () => updateMenuPosition();
                                                                window.addEventListener('resize', handleResize);
                                                                window.addEventListener('scroll', handleResize);
                                                                return () => {
                                                                    window.removeEventListener('resize', handleResize);
                                                                    window.removeEventListener('scroll', handleResize);
                                                                };
                                                            }
                                                        }, [open]);

                                                        return (
                                                            <>
                                                                <Menu.Button
                                                                    ref={buttonRef}
                                                                    disabled={updatingStatus[assignment.routeLeg.id]}
                                                                    className={`inline-flex items-center justify-center w-10 h-10 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 shadow-sm ${
                                                                        updatingStatus[assignment.routeLeg.id]
                                                                            ? 'text-gray-300 cursor-not-allowed'
                                                                            : 'text-gray-400 hover:bg-gray-50 hover:text-gray-500'
                                                                    }`}
                                                                >
                                                                    <span className="sr-only">Open options</span>
                                                                    <EllipsisHorizontalIcon
                                                                        className="w-5 h-5"
                                                                        aria-hidden="true"
                                                                    />
                                                                </Menu.Button>

                                                                {open &&
                                                                    !updatingStatus[assignment.routeLeg.id] &&
                                                                    createPortal(
                                                                        <Menu.Items
                                                                            static
                                                                            className="absolute z-[9999] w-48 bg-white border border-gray-200 rounded-2xl shadow-lg focus:outline-none"
                                                                            style={{
                                                                                top: `${menuPosition.top}px`,
                                                                                left: `${menuPosition.left}px`,
                                                                            }}
                                                                        >
                                                                            <div className="py-2">
                                                                                {/* Show "Mark as Assigned" only if not already assigned */}
                                                                                {status !== RouteLegStatus.ASSIGNED && (
                                                                                    <Menu.Item>
                                                                                        {({ active }) => (
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    handleStatusChange(
                                                                                                        RouteLegStatus.ASSIGNED,
                                                                                                        assignment
                                                                                                            .routeLeg
                                                                                                            .id,
                                                                                                    );
                                                                                                }}
                                                                                                disabled={
                                                                                                    updatingStatus[
                                                                                                        assignment
                                                                                                            .routeLeg.id
                                                                                                    ]
                                                                                                }
                                                                                                className={`${
                                                                                                    active
                                                                                                        ? 'bg-gray-50 text-gray-900'
                                                                                                        : 'text-gray-700'
                                                                                                } group flex items-center w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                                            >
                                                                                                <CheckCircleIcon
                                                                                                    className="mr-3 h-4 w-4 text-gray-400"
                                                                                                    aria-hidden="true"
                                                                                                />
                                                                                                Mark as Assigned
                                                                                            </button>
                                                                                        )}
                                                                                    </Menu.Item>
                                                                                )}

                                                                                {/* Show "Start Assignment" only if assigned (not in progress or completed) */}
                                                                                {status === RouteLegStatus.ASSIGNED && (
                                                                                    <Menu.Item>
                                                                                        {({ active }) => (
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    handleStatusChange(
                                                                                                        RouteLegStatus.IN_PROGRESS,
                                                                                                        assignment
                                                                                                            .routeLeg
                                                                                                            .id,
                                                                                                    );
                                                                                                }}
                                                                                                disabled={
                                                                                                    updatingStatus[
                                                                                                        assignment
                                                                                                            .routeLeg.id
                                                                                                    ]
                                                                                                }
                                                                                                className={`${
                                                                                                    active
                                                                                                        ? 'bg-gray-50 text-gray-900'
                                                                                                        : 'text-gray-700'
                                                                                                } group flex items-center w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                                            >
                                                                                                <PlayIcon
                                                                                                    className="mr-3 h-4 w-4 text-gray-400"
                                                                                                    aria-hidden="true"
                                                                                                />
                                                                                                Start Assignment
                                                                                            </button>
                                                                                        )}
                                                                                    </Menu.Item>
                                                                                )}

                                                                                {/* Show "Mark Complete" only if not already completed */}
                                                                                {status !==
                                                                                    RouteLegStatus.COMPLETED && (
                                                                                    <Menu.Item>
                                                                                        {({ active }) => (
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    handleStatusChange(
                                                                                                        RouteLegStatus.COMPLETED,
                                                                                                        assignment
                                                                                                            .routeLeg
                                                                                                            .id,
                                                                                                    );
                                                                                                }}
                                                                                                disabled={
                                                                                                    updatingStatus[
                                                                                                        assignment
                                                                                                            .routeLeg.id
                                                                                                    ]
                                                                                                }
                                                                                                className={`${
                                                                                                    active
                                                                                                        ? 'bg-gray-50 text-gray-900'
                                                                                                        : 'text-gray-700'
                                                                                                } group flex items-center w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                                            >
                                                                                                <CheckCircleIcon
                                                                                                    className="mr-3 h-4 w-4 text-gray-400"
                                                                                                    aria-hidden="true"
                                                                                                />
                                                                                                Mark Complete
                                                                                            </button>
                                                                                        )}
                                                                                    </Menu.Item>
                                                                                )}

                                                                                <Menu.Item>
                                                                                    {({ active }) => (
                                                                                        <button
                                                                                            onClick={() =>
                                                                                                router.push(
                                                                                                    `/loads/${assignment.load.id}`,
                                                                                                )
                                                                                            }
                                                                                            disabled={
                                                                                                updatingStatus[
                                                                                                    assignment.routeLeg
                                                                                                        .id
                                                                                                ]
                                                                                            }
                                                                                            className={`${
                                                                                                active
                                                                                                    ? 'bg-gray-50 text-gray-900'
                                                                                                    : 'text-gray-700'
                                                                                            } group flex items-center w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                                        >
                                                                                            <ArrowTopRightOnSquareIcon
                                                                                                className="mr-3 h-4 w-4 text-gray-400"
                                                                                                aria-hidden="true"
                                                                                            />
                                                                                            View Load
                                                                                        </button>
                                                                                    )}
                                                                                </Menu.Item>

                                                                                <div className="border-t border-gray-100 my-1"></div>

                                                                                <Menu.Item>
                                                                                    {({ active }) => (
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                deleteAssignment(
                                                                                                    assignment.id,
                                                                                                );
                                                                                            }}
                                                                                            disabled={
                                                                                                updatingStatus[
                                                                                                    assignment.routeLeg
                                                                                                        .id
                                                                                                ]
                                                                                            }
                                                                                            className={`${
                                                                                                active
                                                                                                    ? 'bg-red-50 text-red-900'
                                                                                                    : 'text-red-600'
                                                                                            } group flex items-center w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                                        >
                                                                                            <TrashIcon
                                                                                                className="mr-3 h-4 w-4 text-red-400"
                                                                                                aria-hidden="true"
                                                                                            />
                                                                                            Delete Assignment
                                                                                        </button>
                                                                                    )}
                                                                                </Menu.Item>
                                                                            </div>
                                                                        </Menu.Items>,
                                                                        document.body,
                                                                    )}
                                                            </>
                                                        );
                                                    }}
                                                </Menu>
                                            </td>
                                        </tr>

                                        {/* Expanded Row */}
                                        {isExpanded && (
                                            <tr className="bg-gray-50/50 border-t border-gray-100">
                                                <td colSpan={6} className="px-8 py-5">
                                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                                                        {/* Compact Header */}
                                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                                                    <MapIcon className="w-4 h-4 text-blue-600" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-sm font-semibold text-gray-900">
                                                                        Route Details
                                                                    </h3>
                                                                    <p className="text-xs text-gray-500">
                                                                        {assignment.routeLeg.locations.length} stops •{' '}
                                                                        {Math.round(
                                                                            Number(assignment.routeLeg.distanceMiles),
                                                                        )}{' '}
                                                                        mi •{' '}
                                                                        {Math.round(
                                                                            Number(assignment.routeLeg.durationHours),
                                                                        )}
                                                                        h
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {formatDate(
                                                                        assignment.routeLeg.scheduledDate.toString(),
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {formatTime(assignment.routeLeg.scheduledTime)}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Dense Route List */}
                                                        <div className="space-y-3 mb-4">
                                                            {assignment.routeLeg.locations.map(
                                                                (locationItem, index) => {
                                                                    const isLoadStop = locationItem.loadStop !== null;
                                                                    const locationData = isLoadStop
                                                                        ? locationItem.loadStop
                                                                        : locationItem.location;

                                                                    // Determine stop styling
                                                                    const getStopConfig = () => {
                                                                        if (isLoadStop) {
                                                                            switch (locationItem.loadStop?.type) {
                                                                                case 'SHIPPER':
                                                                                    return {
                                                                                        label: 'P',
                                                                                        color: 'bg-green-500',
                                                                                        name: 'Pickup',
                                                                                    };
                                                                                case 'RECEIVER':
                                                                                    return {
                                                                                        label: 'D',
                                                                                        color: 'bg-red-500',
                                                                                        name: 'Delivery',
                                                                                    };
                                                                                case 'STOP':
                                                                                    return {
                                                                                        label: 'S',
                                                                                        color: 'bg-amber-500',
                                                                                        name: 'Stop',
                                                                                    };
                                                                            }
                                                                        }
                                                                        return {
                                                                            label: 'C',
                                                                            color: 'bg-purple-500',
                                                                            name: 'Custom',
                                                                        };
                                                                    };

                                                                    const config = getStopConfig();

                                                                    return (
                                                                        <div
                                                                            key={locationItem.id}
                                                                            className="flex items-start space-x-3 py-2"
                                                                        >
                                                                            {/* Compact Stop Icon */}
                                                                            <div className="flex-shrink-0 flex items-center space-x-2">
                                                                                <div className="relative">
                                                                                    <div
                                                                                        className={`w-6 h-6 ${config.color} rounded-full flex items-center justify-center`}
                                                                                    >
                                                                                        <span className="text-white text-xs font-bold">
                                                                                            {config.label}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                                                                        {index + 1}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Dense Location Info */}
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-start justify-between">
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center space-x-2 mb-1">
                                                                                            <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                                                                                {config.name}
                                                                                            </span>
                                                                                            {'date' in locationData && (
                                                                                                <span className="text-xs text-gray-600 font-medium">
                                                                                                    {formatTime(
                                                                                                        locationData.time,
                                                                                                    )}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                                                                                            {locationData?.name ||
                                                                                                'Unknown Location'}
                                                                                        </h4>
                                                                                        {/* Street Address */}
                                                                                        {locationData?.street && (
                                                                                            <p className="text-xs text-gray-600 truncate">
                                                                                                {locationData.street}
                                                                                            </p>
                                                                                        )}
                                                                                        {/* City, State - Uppercase */}
                                                                                        <p className="text-xs text-gray-600 truncate font-medium">
                                                                                            {[
                                                                                                locationData?.city?.toUpperCase(),
                                                                                                locationData?.state?.toUpperCase(),
                                                                                            ]
                                                                                                .filter(Boolean)
                                                                                                .join(', ') ||
                                                                                                'LOCATION NOT AVAILABLE'}
                                                                                        </p>
                                                                                        {/* Compact Reference Numbers */}
                                                                                        {isLoadStop &&
                                                                                            (locationItem.loadStop
                                                                                                ?.pickUpNumbers ||
                                                                                                locationItem.loadStop
                                                                                                    ?.referenceNumbers) && (
                                                                                                <div className="flex space-x-2 mt-1">
                                                                                                    {locationItem
                                                                                                        .loadStop
                                                                                                        ?.pickUpNumbers && (
                                                                                                        <span className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                                                                                            {locationItem
                                                                                                                .loadStop
                                                                                                                .type ===
                                                                                                            'RECEIVER'
                                                                                                                ? 'Conf:'
                                                                                                                : 'PU:'}{' '}
                                                                                                            {
                                                                                                                locationItem
                                                                                                                    .loadStop
                                                                                                                    .pickUpNumbers
                                                                                                            }
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {locationItem
                                                                                                        .loadStop
                                                                                                        ?.referenceNumbers && (
                                                                                                        <span className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                                                                                            Ref:{' '}
                                                                                                            {
                                                                                                                locationItem
                                                                                                                    .loadStop
                                                                                                                    .referenceNumbers
                                                                                                            }
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                    </div>

                                                                                    {/* Compact Map Link */}
                                                                                    {locationData?.latitude &&
                                                                                        locationData?.longitude && (
                                                                                            <a
                                                                                                href={createGoogleMapsUrl(
                                                                                                    Number(
                                                                                                        locationData.latitude,
                                                                                                    ),
                                                                                                    Number(
                                                                                                        locationData.longitude,
                                                                                                    ),
                                                                                                    assignment.load
                                                                                                        .loadNum,
                                                                                                )}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="flex-shrink-0 w-7 h-7 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg flex items-center justify-center transition-colors duration-150"
                                                                                                onClick={(e) =>
                                                                                                    e.stopPropagation()
                                                                                                }
                                                                                            >
                                                                                                <MapIcon className="w-3.5 h-3.5" />
                                                                                            </a>
                                                                                        )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                },
                                                            )}
                                                        </div>

                                                        {/* Compact Info Footer */}
                                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                            {/* Driver Contact */}
                                                            <div className="flex items-center space-x-3">
                                                                <div className="flex items-center space-x-2">
                                                                    <div className="w-6 h-6 bg-blue-50 rounded-md flex items-center justify-center">
                                                                        <TruckIcon className="w-3.5 h-3.5 text-blue-600" />
                                                                    </div>
                                                                    <span className="text-sm font-medium text-gray-900">
                                                                        {assignment.driver.name}
                                                                    </span>
                                                                </div>
                                                                <a
                                                                    href={`tel:${assignment.driver.phone}`}
                                                                    className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-150"
                                                                >
                                                                    <PhoneIcon className="w-3.5 h-3.5" />
                                                                    <span className="text-xs">
                                                                        {formatPhoneNumber(assignment.driver.phone)}
                                                                    </span>
                                                                </a>
                                                            </div>

                                                            {/* Status & Load Info */}
                                                            <div className="flex items-center space-x-3">
                                                                <span
                                                                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${statusInfo.color}`}
                                                                >
                                                                    {statusInfo.label}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Special Instructions */}
                                                        {assignment.routeLeg.driverInstructions && (
                                                            <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                                <div className="flex items-start space-x-2">
                                                                    <DocumentTextIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                                                    <div>
                                                                        <span className="text-xs font-medium text-amber-900 block">
                                                                            Special Instructions
                                                                        </span>
                                                                        <p className="text-sm text-amber-800 mt-0.5">
                                                                            {assignment.routeLeg.driverInstructions}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Location Updates */}
                                                        {(hasStartLocation || hasEndLocation) && (
                                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                                <div className="flex items-center space-x-1 mb-2">
                                                                    <MapPinIcon className="w-3.5 h-3.5 text-gray-400" />
                                                                    <span className="text-xs font-medium text-gray-700">
                                                                        Location Updates
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                    {hasStartLocation && (
                                                                        <div className="bg-green-50 rounded-md p-2 border border-green-100">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-xs font-semibold text-green-800">
                                                                                    Started
                                                                                </span>
                                                                                {assignment.routeLeg.startedAt && (
                                                                                    <span className="text-xs text-green-600">
                                                                                        {formatDate(
                                                                                            assignment.routeLeg.startedAt.toString(),
                                                                                        )}
                                                                                    </span>
                                                                                )}
                                                                                <a
                                                                                    href={createGoogleMapsUrl(
                                                                                        Number(
                                                                                            assignment.routeLeg
                                                                                                .startLatitude,
                                                                                        ),
                                                                                        Number(
                                                                                            assignment.routeLeg
                                                                                                .startLongitude,
                                                                                        ),
                                                                                        assignment.load.loadNum,
                                                                                    )}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-green-600 hover:text-green-800 transition-colors duration-150"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <MapIcon className="w-3.5 h-3.5" />
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {hasEndLocation && (
                                                                        <div className="bg-red-50 rounded-md p-2 border border-red-100">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-xs font-semibold text-red-800">
                                                                                    Completed
                                                                                </span>
                                                                                {assignment.routeLeg.endedAt && (
                                                                                    <span className="text-xs text-red-600">
                                                                                        {formatDate(
                                                                                            assignment.routeLeg.endedAt.toString(),
                                                                                        )}
                                                                                    </span>
                                                                                )}
                                                                                <a
                                                                                    href={createGoogleMapsUrl(
                                                                                        Number(
                                                                                            assignment.routeLeg
                                                                                                .endLatitude,
                                                                                        ),
                                                                                        Number(
                                                                                            assignment.routeLeg
                                                                                                .endLongitude,
                                                                                        ),
                                                                                        assignment.load.loadNum,
                                                                                    )}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-red-600 hover:text-red-800 transition-colors duration-150"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <MapIcon className="w-3.5 h-3.5" />
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {loading && (
                <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full animate-spin border-t-blue-600"></div>
                </div>
            )}
        </div>
    );
};

type AssignmentsTableSkeletonProps = {
    limit: number;
};

export const AssignmentsTableSkeleton: React.FC<AssignmentsTableSkeletonProps> = ({ limit }) => {
    return (
        <div className="w-full">
            <div className="flex space-x-4 animate-pulse">
                <div className="flex-1">
                    <div className="h-10 bg-slate-200 rounded-lg"></div>
                    <div className="divide-y divide-gray-200">
                        {[...Array(limit)].map((_, i) => (
                            <div key={i} className="grid grid-cols-12 gap-4 py-3 items-center">
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 bg-slate-200 rounded-full"></div>
                                    <div className="h-2 bg-slate-200 rounded-full w-1/2"></div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 bg-slate-200 rounded-full"></div>
                                    <div className="h-2 bg-slate-200 rounded-full w-1/2"></div>
                                </div>
                                <div className="col-span-3 space-y-2">
                                    <div className="h-2 bg-slate-200 rounded-full"></div>
                                    <div className="h-2 bg-slate-200 rounded-full w-1/2"></div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 bg-slate-200 rounded-full"></div>
                                    <div className="h-2 bg-slate-200 rounded-full w-1/2"></div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 bg-slate-200 rounded-full"></div>
                                    <div className="h-2 bg-slate-200 rounded-full w-1/2"></div>
                                </div>
                                <div className="col-span-1 space-y-2">
                                    <div className="h-2 bg-slate-200 rounded-full"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
