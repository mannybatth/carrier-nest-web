import React from 'react';
import Link from 'next/link';
import AssignmentDropDown from './AssignmentDropDown';
import AssignmentStatusDropDown from './AssignmentStatusDropDown';
import Spinner from '../../Spinner';
import { useLoadContext } from 'components/context/LoadContext';
import { parse, format } from 'date-fns';
import { MapPinIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { MapIcon } from '@heroicons/react/24/outline';

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
    const [load, setLoad] = useLoadContext();

    return (
        <div className="mt-4" id="load-assignments">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-base font-semibold leading-6 text-gray-900">Load Assignments</h2>
                    <p className="text-xs text-slate-500">Tasks assigned to drivers for this load</p>
                </div>
                <button
                    className="px-2 py-2 text-xs font-medium text-white bg-blue-600 whitespace-nowrap rounded-md hover:bg-blue-700 md:text-sm"
                    onClick={() => setOpenLegAssignment(true)}
                >
                    Add Assignment
                </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-1 lg:grid-cols-1">
                {load.route && load.route?.routeLegs?.length > 0 ? (
                    load.route.routeLegs.map((leg, index) => {
                        const drivers = leg.driverAssignments.map((driver) => driver.driver);
                        const locations = leg.locations;
                        const legStatus = leg.status;
                        const startLat = leg.startLatitude;
                        const startLng = leg.startLongitude;
                        const endLat = leg.endLatitude;
                        const endLng = leg.endLongitude;

                        const api_key = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

                        return (
                            <div className="relative p-4 bg-white border-2 rounded-lg" key={`routelegs-${index}`}>
                                {removingRouteLegWithId === leg.id && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                                        <Spinner />
                                        <span className="ml-2 text-gray-600">Removing assignment...</span>
                                    </div>
                                )}
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-md">Assignment #{index + 1}</h3>
                                        <p className="text-sm text-gray-500">
                                            Assigned on:{' '}
                                            {format(
                                                parse(
                                                    (leg.scheduledDate as unknown as string).replace(/Z$/, ''),
                                                    "yyyy-MM-dd'T'HH:mm:ss.SSS",
                                                    new Date(),
                                                ),
                                                'M/d/yyyy',
                                            )}{' '}
                                            @ {leg.scheduledTime}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Started on:{' '}
                                            {leg.startedAt ? new Date(leg.startedAt).toLocaleString() : 'Not started'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Completed on:{' '}
                                            {leg.endedAt ? new Date(leg.endedAt).toLocaleString() : 'Not completed'}
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <AssignmentStatusDropDown
                                            changeStatusClicked={(legStatus) =>
                                                changeLegStatusClicked(legStatus, leg.id)
                                            }
                                            startedAt={leg.startedAt}
                                            endedAt={leg.endedAt}
                                            legId={leg.id}
                                            disabled={false}
                                            status={legStatus}
                                        />
                                        <AssignmentDropDown
                                            deleteLegClicked={() => deleteLegClicked(leg.id)}
                                            editLegClicked={() => editLegClicked(leg.id)}
                                            openRouteInMapsClicked={() => openRouteInMapsClicked(leg.id)}
                                            disabled={false}
                                            legId={leg.id}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col items-start">
                                    <div className="mb-2">
                                        <h4 className="text-sm font-semibold text-gray-900">Drivers</h4>
                                        <p className="text-sm text-gray-600">
                                            {drivers.map((driver, index) => (
                                                <span key={`driver-${index}`}>
                                                    <Link
                                                        href={`/drivers/${driver.id}`}
                                                        className="text-blue-500 hover:underline"
                                                    >
                                                        {driver.name}
                                                    </Link>
                                                    {index < drivers.length - 1 ? ', ' : ''}
                                                </span>
                                            ))}
                                        </p>
                                    </div>
                                    <div className="w-full p-1 px-2 mb-4 border rounded-md bg-yellow-50 border-slate-100">
                                        <span className="text-xs font-semibold text-gray-900">
                                            Driver Instructions:{' '}
                                        </span>
                                        <span className="text-xs text-gray-600">
                                            {leg.driverInstructions || 'No instructions provided'}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900">Route</h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        {locations.map((location, index) => {
                                            const isLoadStop = !!location.loadStop;
                                            const item = isLoadStop ? location.loadStop : location.location;
                                            const isLast = index === locations.length - 1;

                                            return (
                                                <div
                                                    key={`route-legs-stops-stop-${index}`}
                                                    className="flex items-center flex-grow"
                                                >
                                                    <div className="relative flex flex-col p-2 border rounded-md bg-gray-50 min-w-[200px] flex-grow">
                                                        <div className="relative flex items-center gap-2">
                                                            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                                                                {index + 1}
                                                            </span>
                                                            <span className="text-xs font-medium text-gray-700">
                                                                {index === 0
                                                                    ? 'Pick-Up'
                                                                    : index === locations.length - 1
                                                                    ? 'Drop-Off'
                                                                    : 'Stop'}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-sm font-medium text-gray-900">
                                                            {item.name}
                                                        </p>
                                                        <p className="text-xs text-gray-600">
                                                            {item.city}, {item.state}
                                                        </p>
                                                        <span className="absolute right-0 bottom-0 m-2 max-h-fit ounded-full border border-white rounded-lg">
                                                            {index === 0 && startLat && startLng && (
                                                                <Image
                                                                    src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-l+00c04b(${startLng},${startLat})/${startLng},${startLat},8/80x80?access_token=${api_key}`}
                                                                    width={200}
                                                                    height={200}
                                                                    alt="Load Route"
                                                                    loading="lazy"
                                                                    className="w-full h-fit rounded-lg"
                                                                ></Image>
                                                            )}
                                                        </span>
                                                        <span className="absolute right-0 bottom-0 m-2  border border-white rounded-lg">
                                                            {index === locations.length - 1 && endLat && endLng && (
                                                                <Image
                                                                    src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-l+ff0000(${endLng},${endLat})/${endLng},${endLat},8/80x80?access_token=${api_key}`}
                                                                    width={200}
                                                                    height={200}
                                                                    alt="Load Route"
                                                                    loading="lazy"
                                                                    className="w-full h-fit rounded-lg"
                                                                ></Image>
                                                            )}
                                                        </span>
                                                    </div>
                                                    {!isLast && (
                                                        <div className="flex-shrink-0 mx-2">
                                                            <svg
                                                                className="w-5 h-5 text-gray-400"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                                                                />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-gray-500">No assignments created for this load.</p>
                )}
            </div>
        </div>
    );
};

export default LoadAssignmentsSection;
