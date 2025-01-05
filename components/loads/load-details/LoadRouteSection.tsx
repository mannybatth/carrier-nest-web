import { ArrowTopRightOnSquareIcon, MapPinIcon, StopIcon, TruckIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import React from 'react';
import { Prisma } from '@prisma/client';
import { metersToMiles } from '../../../lib/helpers/distance';
import { secondsToReadable } from '../../../lib/helpers/time';
import { useLoadContext } from 'components/context/LoadContext';

type LoadRouteSectionProps = {
    openRouteInGoogleMaps: () => void;
};

const LoadRouteSection: React.FC<LoadRouteSectionProps> = ({ openRouteInGoogleMaps }) => {
    const [load, setLoad] = useLoadContext();
    return (
        <div>
            <div className="mt-4 space-y-3">
                <div className="flex flex-row justify-between gap-2">
                    <div className="flex flex-col">
                        <h3 className="text-base font-semibold leading-6 text-gray-900">Entire Load Route</h3>
                        <p className="text-xs text-slate-500">
                            This section provides an overview of the entire load route
                        </p>
                    </div>

                    <button
                        type="button"
                        className="flex items-center h-8 px-3 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm whitespace-nowrap hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={openRouteInGoogleMaps}
                    >
                        Get Directions
                        <ArrowTopRightOnSquareIcon className="flex-shrink-0 w-4 h-4 ml-2 -mr-1" />
                    </button>
                </div>
                <div className="flex flex-col border rounded-lg border-slate-200">
                    <div className="flex flex-row justify-between w-full p-2 rounded-tl-lg rounded-tr-lg bg-slate-100">
                        <p className="text-sm text-slate-900">
                            Route Distance:{' '}
                            {metersToMiles(new Prisma.Decimal(load.routeDistance).toNumber()).toFixed(0)} miles
                        </p>
                        <p className="text-sm text-slate-900">
                            Travel Time: {secondsToReadable(new Prisma.Decimal(load.routeDuration).toNumber())}
                        </p>
                    </div>

                    {load && load.routeEncoded && (
                        <Image
                            src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/path-5(${encodeURIComponent(
                                load.routeEncoded,
                            )})/auto/1275x200?padding=25,25,25,25&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                            width={1200}
                            height={200}
                            alt="Load Route"
                            loading="lazy"
                            className="w-full h-auto mb-3"
                        ></Image>
                    )}
                    <ul
                        role="list"
                        className="grid grid-cols-1 gap-4 p-2 px-4 pb-4 overflow-x-auto bg-white sm:grid-cols-2 lg:grid-cols-3"
                    >
                        <li className="flex-grow p-2 mt-4 border rounded-lg bg-neutral-50 border-slate-100">
                            <div className="relative z-auto">
                                <div className="relative flex flex-col items-start ">
                                    <>
                                        <div className="relative w-full px-0">
                                            <div className="flex flex-row items-end justify-between pb-2 rounded-full ">
                                                <p className="absolute right-0  -top-7 rounded-md p-[3px] px-2 h-6  text-center text-xs font-semibold border bg-white border-slate-100">
                                                    Pick-Up
                                                </p>
                                                <div className="flex p-1 bg-white border rounded-lg border-slate-200">
                                                    <div className="flex items-center justify-center gap-2 lg:flex-col lg:items-start lg:gap-0">
                                                        <span className="text-sm font-bold text-blue-500">
                                                            {new Intl.DateTimeFormat('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: '2-digit',
                                                            }).format(new Date(load.shipper.date))}
                                                        </span>
                                                        {load.shipper.time && (
                                                            <p className="text-xs font-base text-slate-500">
                                                                @{load.shipper.time}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-row items-center justify-center w-8 h-8 bg-green-200 border-2 border-white rounded-md">
                                                    <TruckIcon className="w-4 h-4 text-green-900" aria-hidden="true" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-gray-500">
                                                <div className="text-base font-semibold capitalize text-slate-900">
                                                    {load.shipper.name}
                                                </div>
                                                <div>{load.shipper.street}</div>
                                                <div>
                                                    {load.shipper.city}, {load.shipper.state} {load.shipper.zip}
                                                </div>
                                                <div className="mt-1">
                                                    {load.shipper.poNumbers && (
                                                        <div className="text-xs">
                                                            PO #&rsquo;s: {load.shipper.poNumbers}
                                                        </div>
                                                    )}
                                                    {load.shipper.pickUpNumbers && (
                                                        <div className="text-xs">
                                                            Pick Up #&rsquo;s: {load.shipper.pickUpNumbers}
                                                        </div>
                                                    )}
                                                    {load.shipper.referenceNumbers && (
                                                        <div className="text-xs">
                                                            Ref #&rsquo;s: {load.shipper.referenceNumbers}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                </div>
                            </div>
                        </li>
                        {load.stops.map((stop, index) => (
                            <li
                                className="flex-grow p-2 mt-4 border rounded-lg bg-neutral-50 border-slate-100"
                                key={index}
                            >
                                <div className="relative">
                                    <div className="relative flex items-start ">
                                        <div className="flex-1 w-full">
                                            <div className="relative w-full px-0">
                                                <div className="flex flex-row items-end justify-between w-full pb-2 rounded-full ">
                                                    <p className="absolute right-0  -top-7 rounded-md p-[3px] px-2 h-6  text-center text-xs font-semibold border bg-white border-slate-100">
                                                        Stop
                                                    </p>
                                                    <div className="flex p-1 bg-white border rounded-lg border-slate-200">
                                                        <div className="flex items-center justify-center gap-2 lg:flex-col lg:items-start lg:gap-0">
                                                            <span className="text-sm font-bold text-blue-500">
                                                                {new Intl.DateTimeFormat('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: '2-digit',
                                                                }).format(new Date(stop.date))}
                                                            </span>
                                                            {stop.time && (
                                                                <p className="text-xs font-base text-slate-500">
                                                                    @{stop.time}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-row items-center justify-center w-8 h-8 bg-gray-200 border-2 border-white rounded-md">
                                                        <StopIcon
                                                            className="w-4 h-4 text-gray-900"
                                                            aria-hidden="true"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-gray-500">
                                                    <div className="text-base font-semibold capitalize text-slate-900">
                                                        {stop.name}
                                                    </div>
                                                    <div>{stop.street}</div>
                                                    <div>
                                                        {stop.city}, {stop.state} {stop.zip}
                                                    </div>
                                                    <div className="mt-1">
                                                        {stop.poNumbers && (
                                                            <div className="text-xs">
                                                                PO #&rsquo;s: {stop.poNumbers}
                                                            </div>
                                                        )}
                                                        {stop.pickUpNumbers && (
                                                            <div className="text-xs">
                                                                Pick Up #&rsquo;s: {stop.pickUpNumbers}
                                                            </div>
                                                        )}
                                                        {stop.referenceNumbers && (
                                                            <div className="text-xs">
                                                                Ref #&rsquo;s: {stop.referenceNumbers}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                        <li className="flex-grow p-2 mt-4 border rounded-lg bg-neutral-50 border-slate-100">
                            <div className="relative ">
                                <div className="relative flex flex-col items-start">
                                    <div className="flex flex-row items-end justify-between w-full pb-2 rounded-full ">
                                        <p className="absolute right-0  -top-7 rounded-md p-[3px] px-2 h-6  text-center text-xs font-semibold border bg-white border-slate-100">
                                            Drop-Off
                                        </p>
                                        <div className="flex p-1 bg-white border rounded-lg border-slate-200">
                                            <div className="flex items-center justify-center gap-2 lg:flex-col lg:items-start lg:gap-0">
                                                <span className="text-sm font-bold text-blue-500">
                                                    {new Intl.DateTimeFormat('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: '2-digit',
                                                    }).format(new Date(load.receiver.date))}
                                                </span>
                                                {load.receiver.time && (
                                                    <p className="text-xs font-base text-slate-500">
                                                        @{load.receiver.time}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-row items-center justify-center w-8 h-8 bg-red-200 border-2 border-white rounded-md">
                                            <MapPinIcon className="w-4 h-4 text-red-900" aria-hidden="true" />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-gray-500">
                                            <div className="text-base font-semibold capitalize text-slate-900">
                                                {load.receiver.name}
                                            </div>
                                            <div>{load.receiver.street}</div>
                                            <div>
                                                {load.receiver.city}, {load.receiver.state} {load.receiver.zip}
                                            </div>
                                            <div className="mt-1">
                                                {load.receiver.poNumbers && (
                                                    <div className="text-xs">
                                                        PO #&rsquo;s: {load.receiver.poNumbers}
                                                    </div>
                                                )}
                                                {load.receiver.pickUpNumbers && (
                                                    <div className="text-xs">
                                                        Delivery #&rsquo;s: {load.receiver.pickUpNumbers}
                                                    </div>
                                                )}
                                                {load.receiver.referenceNumbers && (
                                                    <div className="text-xs">
                                                        Ref #&rsquo;s: {load.receiver.referenceNumbers}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default LoadRouteSection;
