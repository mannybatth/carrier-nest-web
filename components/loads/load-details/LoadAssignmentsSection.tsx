import React from 'react';
import Link from 'next/link';
import { ExpandedLoad } from '../../../interfaces/models';
import AssignmentDropDown from './AssignmentDropDown';
import AssignmentStatusDropDown from './AssignmentStatusDropDown';
import Spinner from '../../Spinner';
import { LoadStop } from '@prisma/client';

type LoadAssignmentsSectionProps = {
    load: ExpandedLoad;
    removingRouteLegWithId: string;
    setOpenLegAssignment: (open: boolean) => void;
    changeLegStatusClicked: (status: string, legId: string) => void;
    deleteLegClicked: (legId: string) => void;
    editLegClicked: (legId: string) => void;
    openRouteInMapsClicked: (legId: string) => void;
};

const LoadAssignmentsSection: React.FC<LoadAssignmentsSectionProps> = ({
    load,
    removingRouteLegWithId,
    setOpenLegAssignment,
    changeLegStatusClicked,
    deleteLegClicked,
    editLegClicked,
    openRouteInMapsClicked,
}) => {
    return (
        <div className="mt-2">
            <div className="flex flex-row justify-between mb-2 align-top justify-items-start">
                <div>
                    <h1 className="text-base font-semibold text-gray-900">Load Assignments</h1>
                    <p className="text-xs text-slate-500">Following tasks have been assigned on this load:</p>
                </div>
                <div>
                    <div className="flex justify-between py-0 space-x-2 text-sm font-medium">
                        <dd className="text-right text-gray-900 whitespace-nowrap">
                            <a onClick={() => setOpenLegAssignment(true)}>Add Assignment</a>
                        </dd>
                    </div>
                </div>
            </div>
            <div>
                {load.route && load.route.routeLegs.length > 0 && (
                    <div className="flex flex-col w-full" key={'route-legs-container'}>
                        <div className="p-0 my-3 mt-6 rounded-lg " key={'route-legs'}>
                            {load.route.routeLegs.map((leg, index) => {
                                const drivers = leg.driverAssignments.map((driver) => driver.driver);
                                const locations = leg.locations;
                                const legStatus = leg.status;

                                return (
                                    <div
                                        className="relative mb-8 border rounded-lg border-slate-600"
                                        key={`routelegs-${index}`}
                                    >
                                        {removingRouteLegWithId == leg.id && (
                                            <div className="absolute z-[5]  flex flex-col items-center h-full w-full bg-slate-50/90 ounded-lg justify-center flex-1 flex-grow ">
                                                <div className="flex items-center mt-10 space-x-2 text-slate-600">
                                                    <Spinner />
                                                    <span>Removing assignment...</span>
                                                </div>
                                            </div>
                                        )}
                                        <div
                                            className="flex flex-col items-start gap-1 p-2 text-sm lg:flex-row lg:items-center bg-slate-600 rounded-tl-md rounded-tr-md"
                                            key={`route-leg-${index}-drivers`}
                                        >
                                            <div className="absolute right-2 -top-6 flex items-center flex-row   rounded-tr-md rounded-tl-md pb-[4px] px-2 h-8  text-center font-bold text-xs border border-slate-600 text-slate-600  bg-transparent">
                                                <p
                                                    data-tooltip-id="tooltip"
                                                    data-tooltip-content={`Assigned at: ${new Date(
                                                        leg.createdAt,
                                                    ).toLocaleString()}`}
                                                    data-tooltip-place="top-start"
                                                >
                                                    Leg assignment# {index + 1}
                                                </p>
                                            </div>
                                            <div className="absolute text-xs font-bold text-center rounded-md right-2 ">
                                                <div className="flex flex-row items-center gap-1">
                                                    <div className="flex flex-row items-center gap-2 font-normal">
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
                                                        <div>
                                                            <AssignmentDropDown
                                                                deleteLegClicked={() => deleteLegClicked(leg.id)}
                                                                editLegClicked={() => editLegClicked(leg.id)}
                                                                openRouteInMapsClicked={() =>
                                                                    openRouteInMapsClicked(leg.id)
                                                                }
                                                                disabled={false}
                                                                legId={leg.id}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="font-semibold text-white">Assigned:</p>
                                            <div className="flex gap-1" key={`route-legs-${index}-drivers`}>
                                                {drivers.map((driver, index) => {
                                                    return (
                                                        <p
                                                            className="px-2 py-1 text-xs capitalize border rounded-md bg-slate-100 whitespace-nowrap border-slate-300"
                                                            key={`driver-${index}`}
                                                        >
                                                            <Link href={`/drivers/${driver.id}`}>{driver.name}</Link>
                                                        </p>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex flex-row gap-1 px-4 py-1 text-sm font-normal">
                                            <p>Start Time:</p>
                                            <p className="text-slate-600">
                                                {`${
                                                    new Date(leg.scheduledDate)?.toISOString()?.split('T')[0]
                                                } @ ${new Date(
                                                    `${leg.scheduledDate?.toString()?.split('T')[0]}T${
                                                        leg.scheduledTime
                                                    }`,
                                                ).toLocaleTimeString()}`}
                                            </p>
                                        </div>
                                        <div className="flex flex-row gap-1 px-4 py-1 text-sm font-normal">
                                            <p>End Time:</p>
                                            <p className="text-slate-600">
                                                {`${
                                                    new Date(leg.scheduledDate)?.toISOString()?.split('T')[0]
                                                } @ ${new Date(
                                                    `${leg.scheduledDate?.toString()?.split('T')[0]}T${
                                                        leg.scheduledTime
                                                    }`,
                                                ).toLocaleTimeString()}`}
                                            </p>
                                        </div>
                                        <div className="flex flex-row gap-1 px-4 py-1 text-sm">
                                            <p>Instructions:</p>
                                            <p className="text-slate-600">
                                                {leg.driverInstructions == '' ? 'None' : leg.driverInstructions}
                                            </p>
                                        </div>
                                        <div
                                            className="flex flex-col gap-2 p-3 m-4 mt-2 overflow-x-auto rounded-lg lg:flex-row bg-neutral-50"
                                            key={`route-legs-${index}-stops`}
                                        >
                                            {locations.map((legLocation, index) => {
                                                const isLoadStop = !!legLocation.loadStop;
                                                const item = isLoadStop ? legLocation.loadStop : legLocation.location;

                                                return (
                                                    <div className="flex-1" key={`route-legs-stops-stop-${index}`}>
                                                        <label>
                                                            <div className="relative flex flex-col items-start flex-1 py-1 pl-1 cursor-default">
                                                                <div className="flex flex-row items-center w-full gap-1 mb-1 justify-items-start">
                                                                    <p className="relative top-0 text-sm font-medium text-gray-600 bg-slate-300 px-[6px] text-center border-2 border-slate-300 rounded-md">
                                                                        {index == 0
                                                                            ? 'Pick-Up'
                                                                            : index == locations.length - 1
                                                                            ? 'Drop-Off'
                                                                            : 'Stop'}
                                                                    </p>
                                                                </div>

                                                                <div className="flex-1 pl-2">
                                                                    <p className="text-base font-semibold text-gray-900 capitalize truncate">
                                                                        {item.name}
                                                                    </p>
                                                                    {isLoadStop && (
                                                                        <p className="text-xs text-gray-800 truncate">
                                                                            {new Date(
                                                                                (item as LoadStop).date,
                                                                            ).toLocaleDateString()}{' '}
                                                                            @ {(item as LoadStop).time}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-sm text-gray-600 capitalize truncate">
                                                                        {item.street}
                                                                    </p>
                                                                    <p className="text-sm text-gray-600 capitalize truncate">
                                                                        {item.city}, {item.state.toUpperCase()},{' '}
                                                                        {item.zip}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {!load.route ||
                    (load.route.routeLegs.length == 0 && (
                        <p className="flex flex-col items-center justify-center w-full h-20 p-1 my-2 text-sm rounded-lg bg-neutral-50">
                            No assignments created for this load.
                        </p>
                    ))}
            </div>
        </div>
    );
};

export default LoadAssignmentsSection;
