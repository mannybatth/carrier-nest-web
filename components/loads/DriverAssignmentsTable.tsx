'use client';

import type React from 'react';

import { Fragment, useState } from 'react';
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

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    return (
        <div className="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider "
                            >
                                <div className="flex items-center gap-0">
                                    <TruckIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                    Load
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                            >
                                <div className="flex items-center gap-0">
                                    <CalendarIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                    Schedule
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                            >
                                <div className="flex items-center gap-0">
                                    <MapPinIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                    Locations
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                            >
                                <div className="flex items-center gap-0">
                                    <CurrencyDollarIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                    Charge
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                            >
                                <div className="flex items-center gap-0">
                                    <StopIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                    Status
                                </div>
                            </th>
                            <th scope="col" className="relative px-6 py-4 w-10">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {assignments.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <DocumentTextIcon className="w-10 h-10 text-gray-300" />
                                        <h3 className="mt-3 text-base font-semibold text-gray-900">
                                            No assignments available
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Get started by creating a new load.
                                        </p>
                                        <div className="mt-6">
                                            <Link href="/loads/create">
                                                <a className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                                    + Create Load
                                                </a>
                                            </Link>
                                        </div>
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
                                            className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                                                isExpanded ? 'bg-gray-50' : ''
                                            }`}
                                            onClick={() => toggleRow(assignment.id)}
                                        >
                                            {/* Load Column */}
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center mb-.5">
                                                        <span className="text-sm font-semibold text-gray-900">
                                                            Order# {assignment.load.refNum}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center mt-0 text-xs text-gray-500">
                                                        Load# <span>{assignment.load.loadNum}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Schedule Column - Moved before Locations */}
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center text-sm font-medium text-gray-700">
                                                        <CalendarIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                                        <span>
                                                            {formatDate(assignment.routeLeg.scheduledDate.toString())}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center mt-0.5 text-xs text-gray-500">
                                                        <ClockIcon className="w-3 h-3 mr-1 text-gray-400" />
                                                        <span>{formatTime(assignment.routeLeg.scheduledTime)}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Locations Column */}
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-start">
                                                        {pickupLocation && (
                                                            <div className="flex-1 min-w-0 pr-2">
                                                                <div className="flex items-center">
                                                                    <div className="h-3 w-3 rounded-full bg-green-500 mr-1.5 flex-shrink-0"></div>
                                                                    <span className="text-sm font-semibold text-gray-900 truncate">
                                                                        {pickupLocation.city}, {pickupLocation.state}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                    {pickupLocation.name}
                                                                </p>
                                                            </div>
                                                        )}

                                                        <ArrowLongRightIcon className="w-4 h-4 mx-1 text-gray-400 flex-shrink-0 mt-1" />

                                                        {deliveryLocation && (
                                                            <div className="flex-1 min-w-0 pl-2">
                                                                <div className="flex items-center">
                                                                    <div className="h-3 w-3 rounded-full bg-red-500 mr-1.5 flex-shrink-0"></div>
                                                                    <span className="text-sm font-semibold text-gray-900 truncate">
                                                                        {deliveryLocation.city},{' '}
                                                                        {deliveryLocation.state}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                    {deliveryLocation.name}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center mt-2 text-xs text-gray-500">
                                                        <div className="flex items-center">
                                                            <MapPinIcon className="w-3 h-3 mr-1 text-gray-400" />
                                                            <span>
                                                                {Math.round(Number(assignment.routeLeg.distanceMiles))}{' '}
                                                                mi
                                                            </span>
                                                        </div>
                                                        <span className="mx-2 text-gray-300">•</span>
                                                        <div className="flex items-center">
                                                            <ClockIcon className="w-3 h-3 mr-1 text-gray-400" />
                                                            <span>
                                                                {Math.round(Number(assignment.routeLeg.durationHours))}{' '}
                                                                hrs
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Charge Column */}
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center text-sm font-medium text-gray-700">
                                                        <CurrencyDollarIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                                        <span>
                                                            {assignment.chargeType === 'PER_HOUR'
                                                                ? `$${assignment.chargeValue}/hr`
                                                                : assignment.chargeType === 'PER_MILE'
                                                                ? `$${assignment.chargeValue}/mi`
                                                                : `$${assignment.chargeValue}`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-0">
                                                        {isInvoiced && (
                                                            <span className="flex w-fit mt-1 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                                <ReceiptRefundIcon className="w-3 h-3 mr-1" />
                                                                Invoiced
                                                            </span>
                                                        )}
                                                        {/*  <span className="text-xs text-gray-500">
                                                            Load:{' '}
                                                            <span className="font-medium">
                                                                ${assignment.load.rate.toString()}
                                                            </span>
                                                        </span> */}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status Column */}
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.color} mb-2`}
                                                    >
                                                        {statusInfo.icon}
                                                        {statusInfo.label}
                                                    </span>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full ${
                                                                status === RouteLegStatus.COMPLETED
                                                                    ? 'bg-green-500'
                                                                    : status === RouteLegStatus.IN_PROGRESS
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-gray-400'
                                                            }`}
                                                            style={{ width: `${statusInfo.progress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Actions Column */}
                                            <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                                                <Menu as="div" className="relative inline-block text-left">
                                                    <Menu.Button className="inline-flex items-center justify-center w-8 h-8 text-gray-400 bg-white rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                                        <span className="sr-only">Open options</span>
                                                        <EllipsisHorizontalIcon
                                                            className="w-5 h-5"
                                                            aria-hidden="true"
                                                        />
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
                                                        <Menu.Items className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                            <div className="py-1">
                                                                {status !== RouteLegStatus.ASSIGNED && (
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                onClick={() =>
                                                                                    changeLegStatusClicked(
                                                                                        RouteLegStatus.ASSIGNED,
                                                                                        assignment.routeLeg.id,
                                                                                    )
                                                                                }
                                                                                className={`${
                                                                                    active
                                                                                        ? 'bg-gray-50 text-gray-900'
                                                                                        : 'text-gray-700'
                                                                                } flex w-full px-4 py-2 text-sm`}
                                                                            >
                                                                                Mark as Assigned
                                                                            </button>
                                                                        )}
                                                                    </Menu.Item>
                                                                )}

                                                                {status !== RouteLegStatus.IN_PROGRESS && (
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                onClick={() =>
                                                                                    changeLegStatusClicked(
                                                                                        RouteLegStatus.IN_PROGRESS,
                                                                                        assignment.routeLeg.id,
                                                                                    )
                                                                                }
                                                                                className={`${
                                                                                    active
                                                                                        ? 'bg-gray-50 text-gray-900'
                                                                                        : 'text-gray-700'
                                                                                } flex w-full px-4 py-2 text-sm`}
                                                                            >
                                                                                Mark as In Progress
                                                                            </button>
                                                                        )}
                                                                    </Menu.Item>
                                                                )}

                                                                {status !== RouteLegStatus.COMPLETED && (
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                onClick={() =>
                                                                                    changeLegStatusClicked(
                                                                                        RouteLegStatus.COMPLETED,
                                                                                        assignment.routeLeg.id,
                                                                                    )
                                                                                }
                                                                                className={`${
                                                                                    active
                                                                                        ? 'bg-gray-50 text-gray-900'
                                                                                        : 'text-gray-700'
                                                                                } flex w-full px-4 py-2 text-sm`}
                                                                            >
                                                                                Mark as Completed
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
                                                                            className={`${
                                                                                active
                                                                                    ? 'bg-gray-50 text-gray-900'
                                                                                    : 'text-gray-700'
                                                                            } flex w-full px-4 py-2 text-sm`}
                                                                        >
                                                                            View Load
                                                                        </button>
                                                                    )}
                                                                </Menu.Item>
                                                                <Menu.Item>
                                                                    {({ active }) => (
                                                                        <button
                                                                            onClick={() =>
                                                                                deleteAssignment(assignment.id)
                                                                            }
                                                                            className={`${
                                                                                active
                                                                                    ? 'bg-gray-50 text-gray-900'
                                                                                    : 'text-gray-700'
                                                                            } flex w-full px-4 py-2 text-sm text-red-600`}
                                                                        >
                                                                            Delete Assignment
                                                                        </button>
                                                                    )}
                                                                </Menu.Item>
                                                            </div>
                                                        </Menu.Items>
                                                    </Transition>
                                                </Menu>
                                            </td>
                                        </tr>

                                        {/* Expanded Row */}
                                        {isExpanded && (
                                            <tr className="bg-gray-50 border-t border-gray-100">
                                                <td colSpan={6} className="px-6 py-4">
                                                    <div className="grid grid-cols-3 gap-6">
                                                        {/* Pickup & Delivery Details */}
                                                        <div className="col-span-2">
                                                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                                                                Stops
                                                            </h4>
                                                            <div className="relative pl-6 pb-1">
                                                                <div className="absolute left-[9px] top-[24px] bottom-[24px] w-0.5 bg-gray-200"></div>

                                                                {/* Pickup */}
                                                                {pickupLocation && (
                                                                    <div className="relative mb-5">
                                                                        <div className="absolute left-[-24px] top-1">
                                                                            <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                                                                                <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center">
                                                                                <h5 className="font-semibold text-sm text-gray-900">
                                                                                    Pickup
                                                                                </h5>
                                                                                <span className="ml-2 text-xs text-gray-500">
                                                                                    {formatDate(
                                                                                        pickupLocation.date.toString(),
                                                                                    )}{' '}
                                                                                    at {formatTime(pickupLocation.time)}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-sm text-gray-700 font-medium mt-1">
                                                                                {pickupLocation.name}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                                {pickupLocation.street},{' '}
                                                                                {pickupLocation.city},{' '}
                                                                                {pickupLocation.state}{' '}
                                                                                {pickupLocation.zip}
                                                                            </p>
                                                                            {pickupLocation.pickUpNumbers && (
                                                                                <p className="text-xs text-gray-500 mt-1.5">
                                                                                    <span className="font-medium">
                                                                                        Pickup #:
                                                                                    </span>{' '}
                                                                                    {pickupLocation.pickUpNumbers}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Delivery */}
                                                                {deliveryLocation && (
                                                                    <div className="relative">
                                                                        <div className="absolute left-[-24px] top-1">
                                                                            <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center">
                                                                                <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center">
                                                                                <h5 className="font-semibold text-sm text-gray-900">
                                                                                    Delivery
                                                                                </h5>
                                                                                <span className="ml-2 text-xs text-gray-500">
                                                                                    {formatDate(
                                                                                        deliveryLocation.date.toString(),
                                                                                    )}{' '}
                                                                                    at{' '}
                                                                                    {formatTime(deliveryLocation.time)}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-sm text-gray-700 font-medium mt-1">
                                                                                {deliveryLocation.name}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                                {deliveryLocation.street},{' '}
                                                                                {deliveryLocation.city},{' '}
                                                                                {deliveryLocation.state}{' '}
                                                                                {deliveryLocation.zip}
                                                                            </p>
                                                                            {deliveryLocation.pickUpNumbers && (
                                                                                <p className="text-xs text-gray-500 mt-1.5">
                                                                                    <span className="font-medium">
                                                                                        Confirmation #:
                                                                                    </span>{' '}
                                                                                    {deliveryLocation.pickUpNumbers}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Location Updates */}
                                                            {(hasStartLocation || hasEndLocation) && (
                                                                <div className="mt-5">
                                                                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                                                                        Location Updates
                                                                    </h4>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        {/* Start Location Update */}
                                                                        {hasStartLocation && (
                                                                            <div className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                                                                                <div className="flex items-center justify-between">
                                                                                    <h5 className="text-xs font-semibold text-gray-700">
                                                                                        <div className="flex items-center">
                                                                                            <div className="h-3 w-3 rounded-full bg-amber-500 mr-1.5"></div>
                                                                                            Started
                                                                                            {assignment.routeLeg
                                                                                                .startedAt && (
                                                                                                <span className="ml-1.5 text-gray-500 font-normal">
                                                                                                    on{' '}
                                                                                                    {formatDate(
                                                                                                        assignment.routeLeg.startedAt.toString(),
                                                                                                    )}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </h5>
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
                                                                                        className="flex items-center text-blue-600 hover:text-blue-800 text-xs"
                                                                                        onClick={(e) =>
                                                                                            e.stopPropagation()
                                                                                        }
                                                                                    >
                                                                                        <MapIcon className="w-3.5 h-3.5 mr-1" />
                                                                                        Open in Maps
                                                                                        <ArrowTopRightOnSquareIcon className="w-3 h-3 ml-0.5" />
                                                                                    </a>
                                                                                </div>
                                                                                <p className="text-xs text-gray-500 mt-1.5">
                                                                                    Location updated when assignment was
                                                                                    marked as in progress
                                                                                </p>
                                                                                <p className="text-xs font-mono text-gray-500 mt-0.5">
                                                                                    {assignment.routeLeg.startLatitude},{' '}
                                                                                    {assignment.routeLeg.startLongitude}
                                                                                </p>
                                                                            </div>
                                                                        )}

                                                                        {/* End Location Update */}
                                                                        {hasEndLocation && (
                                                                            <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                                                                                <div className="flex items-center justify-between">
                                                                                    <h5 className="text-xs font-semibold text-gray-700">
                                                                                        <div className="flex items-center">
                                                                                            <div className="h-3 w-3 rounded-full bg-green-500 mr-1.5"></div>
                                                                                            Completed
                                                                                            {assignment.routeLeg
                                                                                                .endedAt && (
                                                                                                <span className="ml-1.5 text-gray-500 font-normal">
                                                                                                    on{' '}
                                                                                                    {formatDate(
                                                                                                        assignment.routeLeg.endedAt.toString(),
                                                                                                    )}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </h5>
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
                                                                                        className="flex items-center text-blue-600 hover:text-blue-800 text-xs"
                                                                                        onClick={(e) =>
                                                                                            e.stopPropagation()
                                                                                        }
                                                                                    >
                                                                                        <MapIcon className="w-3.5 h-3.5 mr-1" />
                                                                                        Open in Maps
                                                                                        <ArrowTopRightOnSquareIcon className="w-3 h-3 ml-0.5" />
                                                                                    </a>
                                                                                </div>
                                                                                <p className="text-xs text-gray-500 mt-1.5">
                                                                                    Location updated when assignment was
                                                                                    marked as completed
                                                                                </p>
                                                                                <p className="text-xs font-mono text-gray-500 mt-0.5">
                                                                                    {assignment.routeLeg.endLatitude},{' '}
                                                                                    {assignment.routeLeg.endLongitude}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Additional Details */}
                                                        <div>
                                                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                                                                Details
                                                            </h4>

                                                            {/* Driver Contact */}
                                                            <div className="mb-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                                                <h5 className="text-xs font-semibold text-gray-700 mb-2">
                                                                    Driver Contact
                                                                </h5>
                                                                <div className="flex items-center">
                                                                    <PhoneIcon className="w-3 h-3 text-gray-400 mr-1.5" />
                                                                    <a
                                                                        href={`tel:${assignment.driver.phone}`}
                                                                        className="text-sm text-blue-600 hover:underline"
                                                                    >
                                                                        {assignment.driver.phone}
                                                                    </a>
                                                                </div>
                                                            </div>

                                                            {/* Instructions */}
                                                            {assignment.routeLeg.driverInstructions && (
                                                                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                                                    <h5 className="text-xs font-semibold text-gray-700 mb-2">
                                                                        Instructions
                                                                    </h5>
                                                                    <p className="text-sm text-gray-600 italic">
                                                                        {assignment.routeLeg.driverInstructions}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
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
