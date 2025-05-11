'use client';

import React, { use, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, parse } from 'date-fns';
import { useLoadContext } from 'components/context/LoadContext';
import Spinner from 'components/Spinner';
import { Transition, Menu } from '@headlessui/react';
import {
    TruckIcon,
    MapPinIcon,
    CalendarIcon,
    ClockIcon,
    EllipsisHorizontalIcon,
    UserIcon,
    InformationCircleIcon,
    PencilIcon,
    TrashIcon,
    MapIcon,
    CurrencyDollarIcon,
    ArrowsRightLeftIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

type LoadAssignmentsSectionProps = {
    removingRouteLegWithId: string;
    setOpenLegAssignment: (open: boolean) => void;
    changeLegStatusClicked: (status: string, legId: string) => void;
    deleteLegClicked: (legId: string) => void;
    editLegClicked: (legId: string) => void;
    openRouteInMapsClicked: (legId: string) => void;
};

const LoadAssignmentsSection: React.FC<LoadAssignmentsSectionProps> = ({
    removingRouteLegWithId,
    setOpenLegAssignment,
    changeLegStatusClicked,
    deleteLegClicked,
    editLegClicked,
    openRouteInMapsClicked,
}) => {
    const [load] = useLoadContext();

    const [routeLegIDUpdating, setRouteLegIDUpdating] = React.useState<string | null>(null);

    const handleRouteStatusChange = (status: string, legId: string) => {
        setRouteLegIDUpdating(legId);
        changeLegStatusClicked(status, legId);
    };

    useEffect(() => {
        setRouteLegIDUpdating(null);
    }, [load]);

    // Status badge styling
    const getStatusStyles = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ASSIGNED':
                return { bg: 'bg-blue-100', text: 'text-blue-700', icon: null };
            case 'IN_PROGRESS':
                return { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: null };
            case 'COMPLETED':
                return {
                    bg: 'bg-green-50',
                    text: 'text-green-700',
                    icon: <CheckCircleIcon className="mr-1.5 h-4 w-4 text-green-500" />,
                };
            case 'CANCELLED':
                return { bg: 'bg-red-50', text: 'text-red-700', icon: null };
            default:
                return { bg: 'bg-gray-50', text: 'text-gray-700', icon: null };
        }
    };

    // Format date helper
    const formatDate = (dateString: string) => {
        try {
            return format(parse(dateString.replace(/Z$/, ''), "yyyy-MM-dd'T'HH:mm:ss.SSS", new Date()), 'MMM d, yyyy');
        } catch (e) {
            return dateString;
        }
    };

    // Format currency helper
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    // Calculate driver payment
    const calculateDriverPayment = (driverAssignment: any, legDistance: number, loadRate: number) => {
        if (driverAssignment.chargeType === 'FIXED_PAY') {
            return driverAssignment.chargeValue;
        } else if (driverAssignment.chargeType === 'PERCENTAGE') {
            return loadRate * (driverAssignment.chargeValue / 100);
        } else if (driverAssignment.chargeType === 'PER_MILE') {
            return driverAssignment.chargeValue * legDistance;
        }
        return 0;
    };

    // Open location in Google Maps
    const openInGoogleMaps = (lat: number, lng: number) => {
        if (lat && lng) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="px-4 sm:px-6 py-5 border-b border-gray-100 flex justify-between items-center gap-2">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Assignments</h2>
                    <p className="mt-1 text-sm text-gray-500">Tasks assigned to drivers for this load</p>
                </div>
                <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 whitespace-nowrap border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setOpenLegAssignment(true)}
                >
                    Add Assignment
                </button>
            </div>

            <div className="px-0 sm:px-6 gap-4 sm:py-5">
                {load.route && load.route?.routeLegs?.length > 0 ? (
                    <div className="space-y-6">
                        {load.route.routeLegs.map((leg, index) => {
                            const drivers = leg.driverAssignments.map((driver) => driver.driver);
                            const locations = leg.locations;
                            const legStatus = leg.status;
                            const statusStyles = getStatusStyles(legStatus);
                            const legDistance = leg.distanceMiles || 0;
                            const legDuration = leg.durationHours || 0;

                            // Check if we have location data
                            const hasStartLocation = leg.startLatitude && leg.startLongitude;
                            const hasEndLocation = leg.endLatitude && leg.endLongitude;
                            const api_key = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

                            return (
                                <div
                                    key={`routelegs-${index}`}
                                    className="relative bg-gray-50 sm:border sm:border-gray-100 sm:rounded-lg overflow-hidden"
                                >
                                    {/* Loading overlay */}
                                    {removingRouteLegWithId === leg.id && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                                            <div className="flex items-center">
                                                <Spinner className="h-5 w-5 text-blue-600" />
                                                <span className="ml-2 text-sm font-medium text-gray-700">
                                                    Removing assignment...
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Assignment header */}
                                    <div className=" sm:px-6 py-4 border-b bg-gray-100 border-gray-200 flex flex-col sm:flex-row items-start justify-between sm:items-center">
                                        <div className="flex items-center">
                                            <div className="hidden sm:flex flex-shrink-0 h-10 w-10 rounded-full bg-blue-100  items-center justify-center">
                                                <TruckIcon className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="ml-4">
                                                <h3 className="text-base font-medium text-gray-900">
                                                    Assignment #{index + 1}
                                                </h3>
                                                <div className="flex items-center mt-1 text-sm text-gray-500">
                                                    <CalendarIcon className="mr-1 h-4 w-4" />
                                                    {formatDate(leg.scheduledDate as unknown as string)} at{' '}
                                                    {leg.scheduledTime}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end items-center space-x-3 pl-4 pr-4 sm:pr-0 sm:pl-0 mt-2 sm:mt-0 w-full sm:w-auto">
                                            {routeLegIDUpdating && routeLegIDUpdating === leg.id && (
                                                <Spinner className="h-5 w-5 text-blue-600" />
                                            )}
                                            {/* Status badge */}

                                            <div
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyles.bg} ${statusStyles.text}`}
                                            >
                                                {statusStyles.icon}
                                                {legStatus?.replace('_', ' ')}
                                            </div>

                                            {/* Status dropdown */}
                                            <Menu as="div" className="relative inline-block text-left">
                                                <Menu.Button className="inline-flex items-center justify-center p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                                    <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
                                                </Menu.Button>
                                                <Transition
                                                    as={React.Fragment}
                                                    enter="transition ease-out duration-100"
                                                    enterFrom="transform opacity-0 scale-95"
                                                    enterTo="transform opacity-100 scale-100"
                                                    leave="transition ease-in duration-75"
                                                    leaveFrom="transform opacity-100 scale-100"
                                                    leaveTo="transform opacity-0 scale-95"
                                                >
                                                    <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                        <div className="py-1">
                                                            {/* Status options - only show statuses different from current status */}

                                                            {legStatus !== 'ASSIGNED' && (
                                                                <Menu.Item>
                                                                    {({ active }) => (
                                                                        <button
                                                                            onClick={() =>
                                                                                handleRouteStatusChange(
                                                                                    'ASSIGNED',
                                                                                    leg.id,
                                                                                )
                                                                            }
                                                                            className={`${
                                                                                active
                                                                                    ? 'bg-gray-100 text-gray-900'
                                                                                    : 'text-gray-700'
                                                                            } flex w-full items-center px-4 py-2 text-sm`}
                                                                        >
                                                                            Set as Assigned
                                                                        </button>
                                                                    )}
                                                                </Menu.Item>
                                                            )}
                                                            {legStatus !== 'IN_PROGRESS' && (
                                                                <Menu.Item>
                                                                    {({ active }) => (
                                                                        <button
                                                                            onClick={() =>
                                                                                handleRouteStatusChange(
                                                                                    'IN_PROGRESS',
                                                                                    leg.id,
                                                                                )
                                                                            }
                                                                            className={`${
                                                                                active
                                                                                    ? 'bg-gray-100 text-gray-900'
                                                                                    : 'text-gray-700'
                                                                            } flex w-full items-center px-4 py-2 text-sm`}
                                                                        >
                                                                            Set as In Progress
                                                                        </button>
                                                                    )}
                                                                </Menu.Item>
                                                            )}
                                                            {legStatus !== 'COMPLETED' && (
                                                                <Menu.Item>
                                                                    {({ active }) => (
                                                                        <button
                                                                            onClick={() =>
                                                                                handleRouteStatusChange(
                                                                                    'COMPLETED',
                                                                                    leg.id,
                                                                                )
                                                                            }
                                                                            className={`${
                                                                                active
                                                                                    ? 'bg-gray-100 text-gray-900'
                                                                                    : 'text-gray-700'
                                                                            } flex w-full items-center px-4 py-2 text-sm`}
                                                                        >
                                                                            Set as Completed
                                                                        </button>
                                                                    )}
                                                                </Menu.Item>
                                                            )}

                                                            {/* Only show divider if there are status options and action options */}
                                                            {legStatus !== 'ASSIGNED' ||
                                                            !['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(
                                                                legStatus,
                                                            ) ? (
                                                                <div className="border-t border-gray-100 my-1"></div>
                                                            ) : null}

                                                            {/* Action options remain the same */}
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => editLegClicked(leg.id)}
                                                                        className={`${
                                                                            active
                                                                                ? 'bg-gray-100 text-gray-900'
                                                                                : 'text-gray-700'
                                                                        } flex w-full items-center px-4 py-2 text-sm`}
                                                                    >
                                                                        <PencilIcon className="mr-3 h-4 w-4 text-gray-500" />
                                                                        Edit Assignment
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => openRouteInMapsClicked(leg.id)}
                                                                        className={`${
                                                                            active
                                                                                ? 'bg-gray-100 text-gray-900'
                                                                                : 'text-gray-700'
                                                                        } flex w-full items-center px-4 py-2 text-sm`}
                                                                    >
                                                                        <MapIcon className="mr-3 h-4 w-4 text-gray-500" />
                                                                        Open in Maps
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => deleteLegClicked(leg.id)}
                                                                        className={`${
                                                                            active
                                                                                ? 'bg-gray-100 text-gray-900'
                                                                                : 'text-red-600'
                                                                        } flex w-full items-center px-4 py-2 text-sm`}
                                                                    >
                                                                        <TrashIcon className="mr-3 h-4 w-4 text-red-500" />
                                                                        Delete Assignment
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                        </div>
                                                    </Menu.Items>
                                                </Transition>
                                            </Menu>
                                        </div>
                                    </div>

                                    {/* Route details summary */}
                                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="flex items-center">
                                                <ArrowsRightLeftIcon className="h-4 w-4 text-gray-500 mr-2" />
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500">Distance</p>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {legDistance.toFixed(2)} miles
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center">
                                                <ClockIcon className="h-4 w-4 text-gray-500 mr-2" />
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500">Duration</p>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {legDuration.toFixed(2)} hours
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Assignment content */}
                                    <div className="px-6 py-4">
                                        {/* Drivers section with payment details */}
                                        <div className="mb-4">
                                            <div className="flex items-center mb-3">
                                                <UserIcon className="h-4 w-4 text-gray-500 mr-2" />
                                                <h4 className="text-sm font-medium text-gray-700">
                                                    Assigned Drivers & Payment
                                                </h4>
                                            </div>

                                            <div className=" space-y-3">
                                                {leg.driverAssignments.map((assignment, idx) => {
                                                    const driver = assignment.driver;
                                                    const chargeType = assignment.chargeType;
                                                    const chargeValue = assignment.chargeValue;
                                                    const estimatedPayment = calculateDriverPayment(
                                                        assignment,
                                                        Number(legDistance),
                                                        Number(load.rate),
                                                    );

                                                    // Format charge type for display
                                                    let chargeDisplay = '';
                                                    if (chargeType === 'FIXED_PAY') {
                                                        chargeDisplay = `Fixed Pay: ${formatCurrency(
                                                            Number(chargeValue),
                                                        )}`;
                                                    } else if (chargeType === 'PERCENTAGE_OF_LOAD') {
                                                        chargeDisplay = `${chargeValue}% of Load Rate`;
                                                    } else if (chargeType === 'PER_MILE') {
                                                        chargeDisplay = `${formatCurrency(
                                                            Number(chargeValue),
                                                        )} per mile`;
                                                    }

                                                    return (
                                                        <div
                                                            key={`driver-payment-${idx}`}
                                                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white border border-gray-200 rounded-lg"
                                                        >
                                                            <div className="flex items-center mb-2 sm:mb-0">
                                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                                                    <UserIcon className="h-4 w-4 text-blue-600" />
                                                                </div>
                                                                <div>
                                                                    <Link
                                                                        href={`/drivers/${driver.id}`}
                                                                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                                                    >
                                                                        {driver.name}
                                                                    </Link>
                                                                    <p className="text-xs text-gray-500">
                                                                        {chargeDisplay}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="bg-green-50 px-3 py-1 rounded-full">
                                                                <span className="text-sm font-medium text-green-700">
                                                                    Est. Total: {formatCurrency(estimatedPayment)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Instructions section */}
                                        {leg.driverInstructions && (
                                            <div className="mb-4 bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                                                <div className="flex items-start">
                                                    <InformationCircleIcon className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-900">
                                                            Driver Instructions
                                                        </h4>
                                                        <p className="mt-1 text-sm text-gray-700">
                                                            {leg.driverInstructions}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Route section */}
                                        <div className="mt-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-3">Route Details</h4>

                                            <div className="relative">
                                                {/* Vertical line connecting stops */}
                                                <div
                                                    className="absolute top-0 left-4 bottom-0 w-0.5 bg-gray-200"
                                                    aria-hidden="true"
                                                ></div>

                                                <ul className="space-y-6">
                                                    {locations.map((location, idx) => {
                                                        const isLoadStop = !!location.loadStop;
                                                        const item = isLoadStop ? location.loadStop : location.location;
                                                        const isFirst = idx === 0;
                                                        const isLast = idx === locations.length - 1;

                                                        // Determine icon and colors based on position
                                                        let icon = <MapPinIcon className="h-5 w-5 text-white" />;
                                                        let bgColor = 'bg-blue-500';
                                                        let label = 'Stop';

                                                        if (isFirst) {
                                                            icon = <TruckIcon className="h-5 w-5 text-white" />;
                                                            bgColor = 'bg-green-500';
                                                            label = 'Pick-Up';
                                                        } else if (isLast) {
                                                            icon = <MapPinIcon className="h-5 w-5 text-white" />;
                                                            bgColor = 'bg-red-500';
                                                            label = 'Drop-Off';
                                                        }

                                                        return (
                                                            <li key={`location-${idx}`} className="relative">
                                                                <div className="relative flex items-start space-x-3">
                                                                    {/* Icon */}
                                                                    <div>
                                                                        <div
                                                                            className={`h-9 w-9 rounded-full flex items-center justify-center ${bgColor}`}
                                                                        >
                                                                            {icon}
                                                                        </div>
                                                                    </div>

                                                                    {/* Content */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-sm">
                                                                            <div className="flex flex-col font-medium text-gray-900">
                                                                                <span className="text-xs text-gray-500 mr-2">
                                                                                    {label}
                                                                                </span>
                                                                                {item.name}
                                                                            </div>
                                                                            <p className="mt-0.5 text-sm text-gray-500">
                                                                                {item.street}, {item.city}, {item.state}{' '}
                                                                                {item.zip}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Assignment footer with timestamps and location maps */}
                                    <div className="px-6 py-3 bg-gray-100 border-t border-gray-100">
                                        <div className="gap-4">
                                            {/* Left column: Timestamps */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-start sm:space-x-4">
                                                {leg.startedAt && (
                                                    <div className="flex items-center">
                                                        <ClockIcon className="h-4 w-4 text-gray-500 mr-2" />
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500">Started</p>
                                                            <p className="text-sm text-gray-900">
                                                                {new Date(leg.startedAt).toLocaleString()}
                                                            </p>
                                                            {/* Start location map */}
                                                            {hasStartLocation && (
                                                                <div className="flex-1 ">
                                                                    <div className="flex items-center justify-between mb-1 gap-1 ">
                                                                        <p className="text-xs font-medium text-gray-500">
                                                                            Start Location
                                                                        </p>
                                                                        <button
                                                                            onClick={() =>
                                                                                openInGoogleMaps(
                                                                                    leg.startLatitude,
                                                                                    leg.startLongitude,
                                                                                )
                                                                            }
                                                                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                                                                        >
                                                                            Open in Maps
                                                                            <ArrowTopRightOnSquareIcon className="ml-1 h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {leg.endedAt && (
                                                    <div className="flex items-center">
                                                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500">
                                                                Completed
                                                            </p>
                                                            <p className="text-sm text-gray-900">
                                                                {new Date(leg.endedAt).toLocaleString()}
                                                            </p>
                                                            {/* End location map */}
                                                            {hasEndLocation && (
                                                                <div className="flex-1">
                                                                    <div className="flex items-center justify-between mb-1 gap-1">
                                                                        <p className="text-xs font-medium text-gray-500">
                                                                            End Location
                                                                        </p>
                                                                        <button
                                                                            onClick={() =>
                                                                                openInGoogleMaps(
                                                                                    leg.endLatitude,
                                                                                    leg.endLongitude,
                                                                                )
                                                                            }
                                                                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                                                                        >
                                                                            Open in Maps
                                                                            <ArrowTopRightOnSquareIcon className="ml-1 h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <TruckIcon className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new assignment.</p>
                        <div className="mt-6">
                            <button
                                type="button"
                                className="inline-flex items-center px-4 py-2 border whitespace-nowrap border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                onClick={() => setOpenLegAssignment(true)}
                            >
                                Add Assignment
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoadAssignmentsSection;
