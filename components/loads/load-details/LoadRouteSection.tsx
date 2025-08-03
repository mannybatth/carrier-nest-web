'use client';

import React from 'react';
import { Disclosure, Transition } from '@headlessui/react';
import { Prisma } from '@prisma/client';
import { useLoadContext } from 'components/context/LoadContext';
import { hoursToReadable } from 'lib/helpers/time';
import {
    ArrowTopRightOnSquareIcon,
    MapPinIcon,
    TruckIcon,
    ChevronDownIcon,
    CalendarIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import LoadRouteMap from './LoadRouteMap';

type LoadRouteSectionProps = {
    openRouteInGoogleMaps: () => void;
};

const LoadRouteSection: React.FC<LoadRouteSectionProps> = ({ openRouteInGoogleMaps }) => {
    const { load } = useLoadContext();

    // Calculate rate per mile
    const ratePerMile =
        load.rate && load.routeDistanceMiles && Number(load.routeDistanceMiles) > 0
            ? (Number(load.rate) / Number(load.routeDistanceMiles)).toFixed(2)
            : '0.00';

    // Combine all locations in sequence
    const allLocations = [
        {
            ...load.shipper,
            type: 'origin' as const,
            id: 'origin-location',
            latitude: load.shipper?.latitude,
            longitude: load.shipper?.longitude,
            name: load.shipper?.name || 'Pickup Location',
            stopType: 'shipper',
        },
        ...(load.stops || []).map((stop, index) => ({
            ...stop,
            type: 'stop' as const,
            id: `stop-${index}`,
            latitude: stop.latitude,
            longitude: stop.longitude,
            name: stop.name || `Stop ${index + 1}`,
            stopType: stop.type || 'stop', // Use the actual stop type from data
        })),
        {
            ...load.receiver,
            type: 'destination' as const,
            id: 'destination-location',
            latitude: load.receiver?.latitude,
            longitude: load.receiver?.longitude,
            name: load.receiver?.name || 'Delivery Location',
            stopType: 'receiver',
        },
    ];

    return (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-200/60">
            {/* Interactive Map Section */}
            <div className="relative">
                <LoadRouteMap locations={allLocations} routeEncoded={load.routeEncoded} className="w-full" />
            </div>

            {/* Route Info Header */}
            <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Route</h2>
                        <p className="text-sm text-gray-600 font-medium mt-1">
                            {load.routeDistanceMiles
                                ? new Prisma.Decimal(load.routeDistanceMiles).toNumber().toFixed(0)
                                : '0'}{' '}
                            miles ·{' '}
                            {load.routeDurationHours
                                ? hoursToReadable(new Prisma.Decimal(load.routeDurationHours).toNumber())
                                : '0h'}{' '}
                            · ${ratePerMile}/mile
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openRouteInGoogleMaps}
                        className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-xl"
                    >
                        Directions
                        <ArrowTopRightOnSquareIcon className="ml-2 h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Locations Timeline */}
            <div className="p-6">
                <div className="flow-root">
                    <ul className="-mb-8">
                        {allLocations.map((location, index) => (
                            <li key={location.id || `location-${index}`}>
                                <div className="relative pb-8">
                                    {/* Connecting line */}
                                    {index !== allLocations.length - 1 && (
                                        <span
                                            className="absolute left-5 top-10 -ml-px h-full w-0.5 bg-gray-200"
                                            aria-hidden="true"
                                        />
                                    )}
                                    <LocationItem
                                        location={location}
                                        index={index}
                                        isLast={index === allLocations.length - 1}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

type LocationItemProps = {
    location: any;
    index: number;
    isLast: boolean;
};

const LocationItem: React.FC<LocationItemProps> = ({ location, index, isLast }) => {
    // Format date
    const formattedDate = location.date
        ? new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          }).format(new Date(location.date))
        : '';

    // Determine icon and colors based on location type
    const getLocationStyles = () => {
        switch (location.type) {
            case 'origin':
                return {
                    icon: <TruckIcon className="h-5 w-5 text-white" />,
                    bgColor: 'bg-green-500',
                    ringColor: 'ring-green-100',
                    label: 'Shipper',
                };
            case 'destination':
                return {
                    icon: <MapPinIcon className="h-5 w-5 text-white" />,
                    bgColor: 'bg-red-500',
                    ringColor: 'ring-red-100',
                    label: 'Receiver',
                };
            default:
                // For stops, check if there's a specific type or use generic 'Stop'
                const stopLabel = location.stopType || 'Stop';
                return {
                    icon: <MapPinIcon className="h-5 w-5 text-white" />,
                    bgColor: 'bg-blue-500',
                    ringColor: 'ring-blue-100',
                    label: stopLabel === 'custom' ? 'Custom' : stopLabel.charAt(0).toUpperCase() + stopLabel.slice(1),
                };
        }
    };

    const { icon, bgColor, ringColor, label } = getLocationStyles();

    return (
        <div className="relative flex items-start space-x-4">
            {/* Icon */}
            <div className="relative flex-shrink-0">
                <div
                    className={`h-10 w-10 rounded-full ${bgColor} ${ringColor} ring-4 flex items-center justify-center shadow-sm`}
                >
                    {icon}
                </div>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pt-1">
                <Disclosure>
                    {({ open }) => (
                        <>
                            <div className="space-y-2">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {label}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 leading-6">
                                            {location.name}
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {location.street}, {location.city}, {location.state} {location.zip}
                                        </p>
                                    </div>

                                    {formattedDate && (
                                        <div className="flex items-center mt-2 sm:mt-0 sm:ml-4">
                                            <div className="text-right">
                                                <div className="flex items-center text-sm font-medium text-gray-900">
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                                    {formattedDate}
                                                </div>
                                                {location.time && (
                                                    <div className="flex items-center text-sm text-gray-600 mt-1">
                                                        <ClockIcon className="mr-2 h-4 w-4 text-gray-400" />
                                                        {location.time}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {(location.poNumbers || location.pickUpNumbers || location.referenceNumbers) && (
                                    <Disclosure.Button className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                                        <ChevronDownIcon
                                            className={`${
                                                open ? 'rotate-180' : ''
                                            } h-4 w-4 mr-2 transition-transform duration-200`}
                                        />
                                        {open ? 'Hide details' : 'Show details'}
                                    </Disclosure.Button>
                                )}
                            </div>

                            <Transition
                                show={open}
                                enter="transition duration-200 ease-out"
                                enterFrom="transform scale-95 opacity-0"
                                enterTo="transform scale-100 opacity-100"
                                leave="transition duration-150 ease-out"
                                leaveFrom="transform scale-100 opacity-100"
                                leaveTo="transform scale-95 opacity-0"
                            >
                                <Disclosure.Panel className="mt-4">
                                    <div className="space-y-4 pl-4 border-l-2 border-gray-100">
                                        {location.poNumbers && (
                                            <div className="space-y-1">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                        PO Numbers
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {location.poNumbers}
                                                </p>
                                            </div>
                                        )}
                                        {location.pickUpNumbers && (
                                            <div className="space-y-1">
                                                <div className="flex items-center space-x-2">
                                                    <div
                                                        className={`w-1.5 h-1.5 rounded-full ${
                                                            location.type === 'destination' ||
                                                            location.stopType === 'receiver'
                                                                ? 'bg-red-500'
                                                                : location.stopType === 'shipper' ||
                                                                  location.type === 'origin'
                                                                ? 'bg-green-500'
                                                                : 'bg-gray-400'
                                                        }`}
                                                    ></div>
                                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                        {location.type === 'destination' ||
                                                        location.stopType === 'receiver'
                                                            ? 'Delivery Numbers'
                                                            : location.stopType === 'shipper' ||
                                                              location.type === 'origin'
                                                            ? 'Pickup Numbers'
                                                            : 'Reference Numbers'}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {location.pickUpNumbers}
                                                </p>
                                            </div>
                                        )}
                                        {location.referenceNumbers && (
                                            <div className="space-y-1">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                        Reference Numbers
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {location.referenceNumbers}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Disclosure.Panel>
                            </Transition>
                        </>
                    )}
                </Disclosure>
            </div>
        </div>
    );
};

export default LoadRouteSection;
