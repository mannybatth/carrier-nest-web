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
import { formatTimeTo12Hour } from 'lib/helpers/format';

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
    const { load } = useLoadContext();

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
    const calculateDriverPayment = (
        driverAssignment: any,
        legDistance: number,
        loadRate: number,
        legDuration: number,
    ) => {
        if (driverAssignment.chargeType === 'FIXED_PAY') {
            return driverAssignment.chargeValue;
        } else if (driverAssignment.chargeType === 'PERCENTAGE_OF_LOAD') {
            return loadRate * (driverAssignment.chargeValue / 100);
        } else if (driverAssignment.chargeType === 'PER_MILE') {
            return driverAssignment.chargeValue * legDistance;
        } else if (driverAssignment.chargeType === 'PER_HOUR') {
            return driverAssignment.chargeValue * legDuration; // Assuming chargeValue is per hour
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
            </div>{' '}
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
                                    key={leg.id} // Use leg.id instead of index for better React tracking
                                    className="relative bg-white sm:border-0 sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
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
                                                    {formatTimeTo12Hour(leg.scheduledTime)}
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
                                                <Menu.Button className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-xl border border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-200">
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
                                                    <Menu.Items className="absolute right-0   mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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

                                    {/* Assignment content - Two Column Layout like DriverAssignmentsTable Expanded Row */}
                                    <div className="px-6 py-5">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Left Column - Route Details */}
                                            <div className="space-y-6">
                                                {/* Dense Route List */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="text-sm font-semibold text-gray-900">
                                                            Route Stops
                                                        </h4>
                                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                            <div className="flex items-center space-x-1">
                                                                <ArrowsRightLeftIcon className="h-3.5 w-3.5 text-gray-400" />
                                                                <span className="font-medium">
                                                                    {Number(legDistance)?.toFixed(2)} mi
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center space-x-1">
                                                                <ClockIcon className="h-3.5 w-3.5 text-gray-400" />
                                                                <span className="font-medium">
                                                                    {Number(legDuration)?.toFixed(2)} hrs
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {locations.map((location, idx) => {
                                                            const isLoadStop = !!location.loadStop;
                                                            const item = isLoadStop
                                                                ? location.loadStop
                                                                : location.location;

                                                            // Determine stop styling based on type
                                                            const getStopConfig = () => {
                                                                if (isLoadStop) {
                                                                    switch (location.loadStop?.type) {
                                                                        case 'SHIPPER':
                                                                            return {
                                                                                label: 'P',
                                                                                color: 'bg-green-100 text-green-700 border border-green-200',
                                                                                name: 'Pickup',
                                                                            };
                                                                        case 'RECEIVER':
                                                                            return {
                                                                                label: 'D',
                                                                                color: 'bg-red-100 text-red-700 border border-red-200',
                                                                                name: 'Delivery',
                                                                            };
                                                                        case 'STOP':
                                                                            return {
                                                                                label: 'S',
                                                                                color: 'bg-amber-100 text-amber-700 border border-amber-200',
                                                                                name: 'Stop',
                                                                            };
                                                                        default:
                                                                            return {
                                                                                label: 'C',
                                                                                color: 'bg-purple-100 text-purple-700 border border-purple-200',
                                                                                name: 'Custom',
                                                                            };
                                                                    }
                                                                }
                                                                return {
                                                                    label: 'C',
                                                                    color: 'bg-purple-100 text-purple-700 border border-purple-200',
                                                                    name: 'Custom Location',
                                                                };
                                                            };

                                                            const config = getStopConfig();

                                                            return (
                                                                <div
                                                                    key={location.id}
                                                                    className="flex items-start space-x-4"
                                                                >
                                                                    <div className="flex-shrink-0 flex items-center space-x-2">
                                                                        <div className="relative">
                                                                            <div
                                                                                className={`w-10 h-10 ${config.color} rounded-xl flex items-center justify-center`}
                                                                            >
                                                                                <span className="text-sm font-bold">
                                                                                    {config.label}
                                                                                </span>
                                                                            </div>
                                                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                                                                {idx + 1}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                                                                        {config.name}
                                                                                    </span>
                                                                                    {isLoadStop && 'time' in item && (
                                                                                        <span className="text-xs text-gray-600 font-medium">
                                                                                            {item.time}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {item?.latitude && item?.longitude && (
                                                                                    <a
                                                                                        href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="flex-shrink-0 w-7 h-7 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg flex items-center justify-center transition-colors duration-150"
                                                                                    >
                                                                                        <MapIcon className="w-3.5 h-3.5" />
                                                                                    </a>
                                                                                )}
                                                                            </div>
                                                                            <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                                                                {item?.name || 'Unknown Location'}
                                                                            </h4>
                                                                            <p className="text-xs text-gray-600 mb-1">
                                                                                {item?.street}
                                                                            </p>
                                                                            <p className="text-xs text-gray-600 font-medium">
                                                                                {[
                                                                                    item?.city?.toUpperCase(),
                                                                                    item?.state?.toUpperCase(),
                                                                                ]
                                                                                    .filter(Boolean)
                                                                                    .join(', ') ||
                                                                                    'LOCATION NOT AVAILABLE'}
                                                                            </p>

                                                                            {/* Include start/completion status if available */}
                                                                            {idx === 0 && leg.startedAt && (
                                                                                <div className="mt-3 pt-3 border-t border-gray-100">
                                                                                    <p className="text-xs font-medium text-green-600">
                                                                                        Started:{' '}
                                                                                        {new Date(
                                                                                            leg.startedAt,
                                                                                        ).toLocaleString()}
                                                                                    </p>
                                                                                    {hasStartLocation && (
                                                                                        <button
                                                                                            onClick={() =>
                                                                                                openInGoogleMaps(
                                                                                                    leg.startLatitude,
                                                                                                    leg.startLongitude,
                                                                                                )
                                                                                            }
                                                                                            className="text-xs text-green-600 hover:text-green-800 underline"
                                                                                        >
                                                                                            View start location
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            {idx === locations.length - 1 &&
                                                                                leg.endedAt && (
                                                                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                                                                        <p className="text-xs font-medium text-red-600">
                                                                                            Completed:{' '}
                                                                                            {new Date(
                                                                                                leg.endedAt,
                                                                                            ).toLocaleString()}
                                                                                        </p>
                                                                                        {hasEndLocation && (
                                                                                            <button
                                                                                                onClick={() =>
                                                                                                    openInGoogleMaps(
                                                                                                        leg.endLatitude,
                                                                                                        leg.endLongitude,
                                                                                                    )
                                                                                                }
                                                                                                className="text-xs text-red-600 hover:text-red-800 underline"
                                                                                            >
                                                                                                View completion location
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                            {/* Reference Numbers */}
                                                                            {isLoadStop &&
                                                                                (location.loadStop?.pickUpNumbers ||
                                                                                    location.loadStop
                                                                                        ?.referenceNumbers) && (
                                                                                    <div className="flex space-x-2 mt-2">
                                                                                        {location.loadStop
                                                                                            ?.pickUpNumbers && (
                                                                                            <span className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                                                                                {location.loadStop
                                                                                                    .type === 'RECEIVER'
                                                                                                    ? 'Conf:'
                                                                                                    : 'PU:'}{' '}
                                                                                                {
                                                                                                    location.loadStop
                                                                                                        .pickUpNumbers
                                                                                                }
                                                                                            </span>
                                                                                        )}
                                                                                        {location.loadStop
                                                                                            ?.referenceNumbers && (
                                                                                            <span className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                                                                                Ref:{' '}
                                                                                                {
                                                                                                    location.loadStop
                                                                                                        .referenceNumbers
                                                                                                }
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column - Drivers, Payment, Instructions */}
                                            <div className="space-y-6">
                                                {/* Assigned Drivers */}
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900 mb-4">
                                                        Assigned Drivers
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {leg.driverAssignments.map((assignment, idx) => {
                                                            const driver = assignment.driver;
                                                            const chargeType = assignment.chargeType;
                                                            const chargeValue = assignment.chargeValue;

                                                            const estimatedPayment = calculateDriverPayment(
                                                                assignment,
                                                                Number(legDistance),
                                                                Number(load.rate),
                                                                Number(legDuration),
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
                                                            } else if (chargeType === 'PER_HOUR') {
                                                                chargeDisplay = `${formatCurrency(
                                                                    Number(chargeValue),
                                                                )} per hour`;
                                                            }

                                                            return (
                                                                <div
                                                                    key={`driver-payment-${idx}`}
                                                                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center space-x-3">
                                                                            <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center">
                                                                                <UserIcon className="h-6 w-6 text-blue-600" />
                                                                            </div>
                                                                            <div>
                                                                                <Link
                                                                                    href={`/drivers/${driver.id}`}
                                                                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 block"
                                                                                >
                                                                                    {driver.name}
                                                                                </Link>
                                                                                <p className="text-xs text-gray-500">
                                                                                    {chargeDisplay}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                                                                            <span className="text-sm font-semibold text-green-700">
                                                                                {formatCurrency(estimatedPayment)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Instructions */}
                                                {leg.driverInstructions && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900 mb-4">
                                                            Special Instructions
                                                        </h4>
                                                        <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100">
                                                            <div className="flex items-start space-x-3">
                                                                <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                    <InformationCircleIcon className="h-4 w-4 text-amber-600" />
                                                                </div>
                                                                <p className="text-sm text-amber-800">
                                                                    {leg.driverInstructions}
                                                                </p>
                                                            </div>
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
