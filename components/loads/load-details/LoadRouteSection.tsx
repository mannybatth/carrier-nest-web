'use client';

import React from 'react';
import Image from 'next/image';
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
    ArrowLongRightIcon,
} from '@heroicons/react/24/outline';

type LoadRouteSectionProps = {
    openRouteInGoogleMaps: () => void;
};

const LoadRouteSection: React.FC<LoadRouteSectionProps> = ({ openRouteInGoogleMaps }) => {
    const [load] = useLoadContext();

    // Calculate rate per mile
    const ratePerMile = Number(Number(load.rate) / Number(load.routeDistanceMiles)).toFixed(2);

    // Combine all locations in sequence
    const allLocations = [
        { ...load.shipper, type: 'origin' },
        ...load.stops.map((stop) => ({ ...stop, type: 'stop' })),
        { ...load.receiver, type: 'destination' },
    ];

    return (
        <div className="bg-white rounded-xl  overflow-hidden border border-gray-100">
            {/* Header with map */}
            <div className="relative min-h-28 md:min-h-36">
                {load && load.routeEncoded && (
                    <div className="relative">
                        <Image
                            src={`https://api.mapbox.com/styles/v1/mapbox/light-v9/static/path-4+007AFF-0.99(${encodeURIComponent(
                                load.routeEncoded,
                            )})/auto/1275x180?padding=25,25,25,25&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                            width={1200}
                            height={180}
                            alt="Route Map"
                            loading="lazy"
                            className="w-full h-auto"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent" />
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-xl font-medium text-gray-900">Route</h2>
                            <p className="text-sm text-gray-500">
                                {new Prisma.Decimal(load.routeDistanceMiles).toNumber().toFixed(0)} miles ·{' '}
                                {hoursToReadable(new Prisma.Decimal(load.routeDurationHours).toNumber())} · $
                                {ratePerMile}/mile
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openRouteInGoogleMaps}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Directions
                            <ArrowTopRightOnSquareIcon className="ml-1.5 h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Locations sequence */}
            <div className="px-6 py-4">
                <div className="space-y-4">
                    {allLocations.map((location, index) => (
                        <React.Fragment key={index}>
                            <LocationItem
                                location={location}
                                index={index}
                                isLast={index === allLocations.length - 1}
                            />

                            {/* Connector line between locations */}
                            {index < allLocations.length - 1 && (
                                <div className="pl-3.5 ml-3.5">
                                    <ArrowLongRightIcon className="h-5 w-5 text-gray-300 rotate-90" />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
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
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(location.date));

    // Determine icon and colors based on location type
    const getLocationStyles = () => {
        switch (location.type) {
            case 'origin':
                return {
                    icon: <TruckIcon className="h-5 w-5 text-white" />,
                    bgColor: 'bg-green-500',
                    label: 'Pickup',
                };
            case 'destination':
                return {
                    icon: <MapPinIcon className="h-5 w-5 text-white" />,
                    bgColor: 'bg-red-500',
                    label: 'Delivery',
                };
            default:
                return {
                    icon: <MapPinIcon className="h-5 w-5 text-white" />,
                    bgColor: 'bg-blue-500',
                    label: `Stop ${index}`,
                };
        }
    };

    const { icon, bgColor, label } = getLocationStyles();

    return (
        <div className="flex">
            {/* Icon */}
            <div className="flex-shrink-0 mr-4">
                <div className={`h-8 w-8 rounded-full ${bgColor} flex items-center justify-center`}>{icon}</div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <Disclosure>
                    {({ open }) => (
                        <>
                            <div className="flex flex-col">
                                <div className="flex-col-reverse sm:flex sm:flex-row justify-between items-start">
                                    <div>
                                        <span className="text-xs font-medium text-gray-500">{label}</span>
                                        <h3 className="text-base font-semibold text-gray-900">{location.name}</h3>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500 mt-1 whitespace-nowrap">
                                        <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                                        {formattedDate}
                                        {location.time && (
                                            <span className="ml-2 flex items-center whitespace-nowrap">
                                                <ClockIcon className="mr-1 h-3.5 w-3.5" />
                                                {location.time}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <p className="mt-1 text-sm text-gray-500">
                                    {location.street}, {location.city}, {location.state} {location.zip}
                                </p>

                                {(location.poNumbers || location.pickUpNumbers || location.referenceNumbers) && (
                                    <Disclosure.Button className="mt-2 flex items-center text-xs font-medium text-blue-600 hover:text-blue-800">
                                        {open ? 'Hide details' : 'Show details'}
                                        <ChevronDownIcon
                                            className={`${open ? 'rotate-180 transform' : ''} h-4 w-4 ml-1`}
                                        />
                                    </Disclosure.Button>
                                )}
                            </div>

                            <Transition
                                show={open}
                                enter="transition duration-100 ease-out"
                                enterFrom="transform scale-95 opacity-0"
                                enterTo="transform scale-100 opacity-100"
                                leave="transition duration-75 ease-out"
                                leaveFrom="transform scale-100 opacity-100"
                                leaveTo="transform scale-95 opacity-0"
                            >
                                <Disclosure.Panel className="mt-2">
                                    <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                                        {location.poNumbers && (
                                            <div>
                                                <span className="text-xs font-medium text-gray-500">PO Numbers</span>
                                                <p className="text-gray-900">{location.poNumbers}</p>
                                            </div>
                                        )}
                                        {location.pickUpNumbers && (
                                            <div>
                                                <span className="text-xs font-medium text-gray-500">
                                                    {location.type === 'destination'
                                                        ? 'Delivery Numbers'
                                                        : 'Pick Up Numbers'}
                                                </span>
                                                <p className="text-gray-900">{location.pickUpNumbers}</p>
                                            </div>
                                        )}
                                        {location.referenceNumbers && (
                                            <div>
                                                <span className="text-xs font-medium text-gray-500">
                                                    Reference Numbers
                                                </span>
                                                <p className="text-gray-900">{location.referenceNumbers}</p>
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
