import { ArrowTopRightOnSquareIcon, MapPinIcon, StopIcon, TruckIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import React from 'react';
import { Prisma } from '@prisma/client';
import { useLoadContext } from 'components/context/LoadContext';
import { Disclosure } from '@headlessui/react';
import { hoursToReadable } from 'lib/helpers/time';

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
                            Route Distance: {new Prisma.Decimal(load.routeDistanceMiles).toNumber().toFixed(2)} miles
                        </p>
                        <p className="text-sm text-slate-900">
                            Travel Time: {hoursToReadable(new Prisma.Decimal(load.routeDurationHours).toNumber())}
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
                            className="w-full h-auto"
                        ></Image>
                    )}
                    <ul
                        role="list"
                        className={`grid gap-4 p-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${
                            load.stops.length + 2
                        } auto-cols-fr`}
                    >
                        <li
                            className="flex-grow border rounded-lg bg-neutral-50 border-slate-100"
                            data-tooltip-id="tooltip"
                            data-tooltip-content="The origin of the load"
                            data-tooltip-delay-show={500}
                        >
                            <div className="relative z-auto flex flex-col p-2">
                                <div className="flex items-center gap-2 pb-2">
                                    <div className="flex items-center justify-center w-8 h-8 bg-green-200 border-2 border-white rounded-md shrink-0">
                                        <TruckIcon className="w-4 h-4 text-green-900" aria-hidden="true" />
                                    </div>
                                    <div className="text-base font-semibold capitalize text-slate-900">
                                        {load.shipper?.name?.toLowerCase()}
                                    </div>
                                </div>
                                <div className="pb-1 text-xs text-gray-500">
                                    {new Intl.DateTimeFormat('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: '2-digit',
                                    }).format(new Date(load.shipper.date))}
                                    {load.shipper.time && ` @ ${load.shipper.time}`}
                                </div>
                                <div className="pb-1 text-sm leading-4 text-gray-500 capitalize">
                                    {load.shipper.street.toLowerCase()}, {load.shipper.city.toLowerCase()},{' '}
                                    {load.shipper.state.toUpperCase()} {load.shipper.zip}
                                </div>
                                {load.shipper.poNumbers ||
                                load.shipper.pickUpNumbers ||
                                load.shipper.referenceNumbers ? (
                                    <Disclosure>
                                        {({ open }) => (
                                            <>
                                                <Disclosure.Button className="flex items-center mt-1 text-xs text-left">
                                                    {open ? 'Hide Details' : 'Show Details'}
                                                    <ChevronUpIcon
                                                        className={`${open ? 'rotate-180 transform' : ''} h-3 w-3 ml-1`}
                                                    />
                                                </Disclosure.Button>
                                                <Disclosure.Panel className="mt-1 text-sm">
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {load.shipper.poNumbers && (
                                                            <div>
                                                                <div className="font-semibold">PO #&rsquo;s:</div>
                                                                <div>{load.shipper.poNumbers}</div>
                                                            </div>
                                                        )}
                                                        {load.shipper.pickUpNumbers && (
                                                            <div>
                                                                <div className="font-semibold">Pick Up #&rsquo;s:</div>
                                                                <div>{load.shipper.pickUpNumbers}</div>
                                                            </div>
                                                        )}
                                                        {load.shipper.referenceNumbers && (
                                                            <div>
                                                                <div className="font-semibold">Ref #&rsquo;s:</div>
                                                                <div>{load.shipper.referenceNumbers}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Disclosure.Panel>
                                            </>
                                        )}
                                    </Disclosure>
                                ) : null}
                            </div>
                        </li>
                        {load.stops.map((stop, index) => (
                            <li
                                className="flex-grow border rounded-lg bg-neutral-50 border-slate-100"
                                key={index}
                                data-tooltip-id="tooltip"
                                data-tooltip-content="This is a stop along the route"
                                data-tooltip-delay-show={500}
                            >
                                <div className="relative z-auto flex flex-col p-2">
                                    <div className="flex items-center gap-2 pb-2">
                                        <div className="flex items-center justify-center w-8 h-8 bg-gray-200 border-2 border-white rounded-md shrink-0">
                                            <StopIcon className="w-4 h-4 text-gray-900" aria-hidden="true" />
                                        </div>
                                        <div className="text-base font-semibold capitalize text-slate-900">
                                            {stop.name?.toLowerCase()}
                                        </div>
                                    </div>
                                    <div className="pb-1 text-xs text-gray-500">
                                        {new Intl.DateTimeFormat('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: '2-digit',
                                        }).format(new Date(stop.date))}
                                        {stop.time && ` @ ${stop.time}`}
                                    </div>
                                    <div className="pb-1 text-sm leading-4 text-gray-500 capitalize">
                                        {stop.street.toLowerCase()}, {stop.city.toLowerCase()},{' '}
                                        {stop.state.toUpperCase()} {stop.zip}
                                    </div>
                                    {stop.poNumbers || stop.pickUpNumbers || stop.referenceNumbers ? (
                                        <Disclosure>
                                            {({ open }) => (
                                                <>
                                                    <Disclosure.Button className="flex items-center mt-1 text-xs text-left">
                                                        {open ? 'Hide Details' : 'Show Details'}
                                                        <ChevronUpIcon
                                                            className={`${
                                                                open ? 'rotate-180 transform' : ''
                                                            } h-3 w-3 ml-1`}
                                                        />
                                                    </Disclosure.Button>
                                                    <Disclosure.Panel className="mt-1 text-sm">
                                                        <div className="grid grid-cols-1 gap-1">
                                                            {stop.poNumbers && (
                                                                <div>
                                                                    <div className="font-semibold">PO #&rsquo;s:</div>
                                                                    <div>{stop.poNumbers}</div>
                                                                </div>
                                                            )}
                                                            {stop.pickUpNumbers && (
                                                                <div>
                                                                    <div className="font-semibold">
                                                                        Pick Up #&rsquo;s:
                                                                    </div>
                                                                    <div>{stop.pickUpNumbers}</div>
                                                                </div>
                                                            )}
                                                            {stop.referenceNumbers && (
                                                                <div>
                                                                    <div className="font-semibold">Ref #&rsquo;s:</div>
                                                                    <div>{stop.referenceNumbers}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </Disclosure.Panel>
                                                </>
                                            )}
                                        </Disclosure>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                        <li
                            className="flex-grow border rounded-lg bg-neutral-50 border-slate-100"
                            data-tooltip-id="tooltip"
                            data-tooltip-content="The drop off location"
                            data-tooltip-delay-show={500}
                        >
                            <div className="relative z-auto flex flex-col p-2">
                                <div className="flex items-center gap-2 pb-2">
                                    <div className="flex items-center justify-center w-8 h-8 bg-red-200 border-2 border-white rounded-md shrink-0">
                                        <MapPinIcon className="w-4 h-4 text-red-900" aria-hidden="true" />
                                    </div>
                                    <div className="text-base font-semibold capitalize text-slate-900">
                                        {load.receiver?.name?.toLowerCase()}
                                    </div>
                                </div>
                                <div className="pb-1 text-xs text-gray-500">
                                    {new Intl.DateTimeFormat('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: '2-digit',
                                    }).format(new Date(load.receiver.date))}
                                    {load.receiver.time && ` @ ${load.receiver.time}`}
                                </div>
                                <div className="pb-1 text-sm leading-4 text-gray-500 capitalize">
                                    {load.receiver.street.toLowerCase()}, {load.receiver.city.toLowerCase()},{' '}
                                    {load.receiver.state.toUpperCase()} {load.receiver.zip}
                                </div>
                                {load.receiver.poNumbers ||
                                load.receiver.pickUpNumbers ||
                                load.receiver.referenceNumbers ? (
                                    <Disclosure>
                                        {({ open }) => (
                                            <>
                                                <Disclosure.Button className="flex items-center mt-1 text-xs text-left">
                                                    {open ? 'Hide Details' : 'Show Details'}
                                                    <ChevronUpIcon
                                                        className={`${open ? 'rotate-180 transform' : ''} h-3 w-3 ml-1`}
                                                    />
                                                </Disclosure.Button>
                                                <Disclosure.Panel className="mt-1 text-sm">
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {load.receiver.poNumbers && (
                                                            <div>
                                                                <div className="font-semibold">PO #&rsquo;s:</div>
                                                                <div>{load.receiver.poNumbers}</div>
                                                            </div>
                                                        )}
                                                        {load.receiver.pickUpNumbers && (
                                                            <div>
                                                                <div className="font-semibold">Delivery #&rsquo;s:</div>
                                                                <div>{load.receiver.pickUpNumbers}</div>
                                                            </div>
                                                        )}
                                                        {load.receiver.referenceNumbers && (
                                                            <div>
                                                                <div className="font-semibold">Ref #&rsquo;s:</div>
                                                                <div>{load.receiver.referenceNumbers}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Disclosure.Panel>
                                            </>
                                        )}
                                    </Disclosure>
                                ) : null}
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default LoadRouteSection;
