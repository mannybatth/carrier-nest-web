import { Dialog, Transition } from '@headlessui/react';
import {
    PlusIcon,
    UserCircleIcon,
    XMarkIcon,
    UserPlusIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    PencilIcon,
    PencilSquareIcon,
    ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';
import React, { Fragment } from 'react';
import { LoadingOverlay } from '../LoadingOverlay';
import { useLoadContext } from '../context/LoadContext';
import { ChargeType, LoadStop, Prisma, Route } from '@prisma/client';
import { ExpandedRouteLeg, ExpandedRouteLegLocation } from 'interfaces/models';
import { notify } from 'components/Notification';
import { createRouteLeg, updateRouteLeg } from 'lib/rest/routeLeg';
import { CreateAssignmentRequest, DriverWithCharge, UpdateAssignmentRequest } from 'interfaces/assignment';
import RouteLegDriverSelection from './RouteLegDriverSelection';
import RouteLegLocationSelection from './RouteLegLocationSelection';
import { useRouteLegDataContext } from 'components/context/RouteLegDataContext';
import { getRouteForCoords } from 'lib/mapbox/searchGeo';
import { useLocalStorage } from 'lib/useLocalStorage';
import { secondsToReadable } from 'lib/helpers/time';
import { metersToMiles } from 'lib/helpers/distance';

type Props = {
    show: boolean;
    routeLeg?: ExpandedRouteLeg;
    onClose: (value: boolean) => void;
};

const RouteLegModal: React.FC<Props> = ({ show, routeLeg, onClose }: Props) => {
    const [load, setLoad] = useLoadContext();
    const [routeLegData, setRouteLegData] = useRouteLegDataContext();

    const [showDriverSelection, setShowDriverSelection] = React.useState(false);
    const [showLegLocationSelection, setShowLegLocationSelection] = React.useState(false);

    const [sendSMS, setSendSMS] = useLocalStorage<boolean>('sendSMS', true);

    const [saveLoading, setSaveLoading] = React.useState(false);

    React.useEffect(() => {
        if (routeLeg) {
            setRouteLegData({
                driversWithCharge: routeLeg.driverAssignments.map((assignment) => {
                    return {
                        driver: assignment.driver,
                        chargeType: assignment.chargeType,
                        chargeValue: Number(assignment.chargeValue),
                    };
                }),
                locations: routeLeg.locations,
                driverInstructions: routeLeg.driverInstructions,
                scheduledDate: new Date(routeLeg.scheduledDate).toISOString().split('T')[0],
                scheduledTime: routeLeg.scheduledTime,
                routeLegDistance: new Prisma.Decimal(routeLeg.routeLegDistance).toNumber(),
                routeLegDuration: new Prisma.Decimal(routeLeg.routeLegDuration).toNumber(),
            });
        } else {
            setRouteLegData({
                driversWithCharge: [],
                locations: [],
                driverInstructions: '',
                scheduledDate: new Date().toISOString().split('T')[0],
                scheduledTime: '',
            });
        }
    }, [routeLeg]);

    const close = (value: boolean) => {
        onClose(value);
        setRouteLegData({
            driversWithCharge: [],
            locations: [],
            driverInstructions: '',
            scheduledDate: new Date().toISOString().split('T')[0],
            scheduledTime: '',
        });
    };

    const handleDriverCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.checked) {
            const currentDriverList = routeLegData.driversWithCharge;
            const newDriverList = currentDriverList.filter((item) => item.driver.id !== event.target.value);
            setRouteLegData({
                ...routeLegData,
                driversWithCharge: newDriverList,
            });
        }
    };

    const handleLegLocationCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.checked) {
            const currentLocationList = routeLegData.locations;
            const newLocationList = currentLocationList.filter((location) => {
                const locId = location.loadStop ? location.loadStop.id : location.location.id;
                return locId !== event.target.value;
            });
            setRouteLegData({
                ...routeLegData,
                locations: newLocationList,
            });
        }
    };

    const onSelectedDriversChange = (drivers: DriverWithCharge[]) => {
        setRouteLegData({
            ...routeLegData,
            driversWithCharge: drivers,
        });
    };

    const onSelectedLegLocationsChange = async (locations: ExpandedRouteLegLocation[]) => {
        setRouteLegData({
            ...routeLegData,
            locations: locations,
        });

        try {
            const coords = locations.map((legLocation) => {
                const lat = legLocation.loadStop?.latitude ?? legLocation.location?.latitude;
                const long = legLocation.loadStop?.longitude ?? legLocation.location?.longitude;

                if (lat == null || long == null) {
                    throw new Error('One or more locations are missing latitude or longitude');
                }

                return [long, lat];
            });

            const { routeEncoded, distance, duration } = await getRouteForCoords(coords);

            setRouteLegData((prevData) => ({
                ...prevData,
                routeLegDistance: distance,
                routeLegDuration: duration,
            }));
        } catch (error) {
            notify({ title: 'Error', message: `Error fetching route details: ${error.message}`, type: 'error' });
        }
    };

    const submit = async () => {
        setSaveLoading(true);

        if (!routeLegData.scheduledDate) {
            notify({ title: 'Error', message: 'Please select a valid date', type: 'error' });
            setSaveLoading(false);
            return;
        }

        if (!routeLegData.scheduledTime) {
            notify({ title: 'Error', message: 'Please select a valid time', type: 'error' });
            setSaveLoading(false);
            return;
        }

        try {
            if (routeLeg) {
                const updateRequest: UpdateAssignmentRequest = {
                    routeLegId: routeLeg?.id,
                    routeLegData: routeLegData,
                    sendSms: sendSMS,
                    loadId: load.id,
                };

                try {
                    const route = await updateRouteLeg(updateRequest);

                    setLoad({
                        ...load,
                        route: route as Route,
                    });

                    close(true);
                    setSaveLoading(false);
                } catch (error) {
                    setSaveLoading(false);
                    notify({ title: 'Error', message: 'Error updating driver assignment', type: 'error' });
                }
            } else {
                const createRequest: CreateAssignmentRequest = {
                    routeLegData: routeLegData,
                    sendSms: sendSMS,
                    loadId: load.id,
                };

                try {
                    const route = await createRouteLeg(createRequest);

                    setLoad({
                        ...load,
                        route: route as Route,
                    });

                    close(true);
                    setSaveLoading(false);
                } catch (error) {
                    setSaveLoading(false);
                    notify({ title: 'Error', message: 'Error creating driver assignment', type: 'error' });
                }
            }
        } catch (error) {
            setSaveLoading(false);
            notify({ title: 'Error', message: `Error processing request: ${error.message}`, type: 'error' });
        }
    };

    const repositionLegLocations = (index: number, direction: 'up' | 'down') => {
        setRouteLegData((prevData) => {
            const newLocations = [...prevData.locations];

            if (direction === 'up' && index > 0) {
                // Swap with the previous item
                [newLocations[index - 1], newLocations[index]] = [newLocations[index], newLocations[index - 1]];
            } else if (direction === 'down' && index < newLocations.length - 1) {
                // Swap with the next item
                [newLocations[index + 1], newLocations[index]] = [newLocations[index], newLocations[index + 1]];
            }

            return { ...prevData, locations: newLocations };
        });
    };

    const calculateDriverPay = (driverId: string) => {
        const chargeType = routeLegData.driversWithCharge.find((d) => d.driver.id === driverId)?.chargeType;
        const chargeValue = routeLegData.driversWithCharge.find((d) => d.driver.id === driverId)?.chargeValue ?? 0;

        if (chargeType === ChargeType.PER_MILE) {
            return ((routeLegData.routeLegDistance ?? 0) / 1609.34) * chargeValue; // Convert meters to miles
        } else if (chargeType === ChargeType.PER_HOUR) {
            return ((routeLegData.routeLegDuration ?? 0) / 3600) * chargeValue; // Convert seconds to hours
        } else if (chargeType === ChargeType.FIXED_PAY) {
            return chargeValue;
        } else if (chargeType === ChargeType.PERCENTAGE_OF_LOAD) {
            return (load.rate.toNumber() * chargeValue) / 100;
        }
        return 0;
    };

    const calculateTotalPay = () => {
        return routeLegData.driversWithCharge
            .reduce((total, driverWithCharge) => {
                return total + calculateDriverPay(driverWithCharge.driver.id);
            }, 0)
            .toFixed(2);
    };

    return (
        <Transition.Root show={show} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={(value) => close(value)}>
                <div className="fixed inset-0" />

                <div className="fixed inset-0 overflow-hidden ">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none sm:pl-16">
                            <Transition.Child
                                as={Fragment}
                                enter="transform transition ease-in-out duration-500 sm:duration-200"
                                enterFrom="translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-500 sm:duration-200"
                                leaveFrom="translate-x-0"
                                leaveTo="translate-x-full"
                            >
                                <Dialog.Panel className="w-screen max-w-md pointer-events-auto">
                                    {saveLoading && <LoadingOverlay />}

                                    {showLegLocationSelection && (
                                        <div className="relative flex flex-col h-full px-5 py-6 space-y-4 bg-white shadow-xl">
                                            <RouteLegLocationSelection
                                                title="Select Stops"
                                                onLegLocationsSelectionSave={onSelectedLegLocationsChange}
                                                onGoBack={() => {
                                                    setShowLegLocationSelection(false);
                                                }}
                                            ></RouteLegLocationSelection>
                                        </div>
                                    )}

                                    {showDriverSelection && (
                                        <div className="relative flex flex-col h-full px-5 py-6 space-y-4 bg-white shadow-xl">
                                            <RouteLegDriverSelection
                                                title="Select Drivers"
                                                selectedDrivers={routeLegData.driversWithCharge}
                                                routeLegDistance={routeLegData.routeLegDistance}
                                                routeLegDuration={routeLegData.routeLegDuration}
                                                loadRate={new Prisma.Decimal(load.rate)}
                                                onDriverSelectionSave={onSelectedDriversChange}
                                                onGoBack={() => setShowDriverSelection(false)}
                                            ></RouteLegDriverSelection>
                                        </div>
                                    )}

                                    <div className="relative flex flex-col h-full px-5 py-6 overflow-y-scroll bg-white shadow-xl">
                                        <div>
                                            <div className="flex items-start justify-between mb-2">
                                                <Dialog.Title className="text-lg font-semibold leading-6 text-gray-900">
                                                    {routeLeg ? 'Edit Assignment' : 'Create New Assignment'}
                                                </Dialog.Title>
                                                <div className="flex items-center ml-3 h-7">
                                                    <button
                                                        type="button"
                                                        className="relative text-gray-400 bg-white rounded-md hover:text-gray-500 focus:ring-2 focus:ring-blue-500"
                                                        onClick={() => close(false)}
                                                    >
                                                        <span className="absolute -inset-2.5" />
                                                        <span className="sr-only">Close panel</span>
                                                        <XMarkIcon className="w-6 h-6" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>

                                            <section className="my-4">
                                                {routeLegData.locations.length !== 0 && (
                                                    <>
                                                        <div className="flex justify-between">
                                                            <div className="flex-col">
                                                                <h5 className="text-sm font-semibold text-slate-600">
                                                                    Route
                                                                </h5>
                                                                <p className="text-xs font-light text-slate-400">
                                                                    Selected stops/locations for this assignment
                                                                </p>
                                                            </div>
                                                            <div className="flex-shrink-0 ml-2">
                                                                <button
                                                                    type="button"
                                                                    className="inline-flex items-center px-3 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                                    onClick={() => setShowLegLocationSelection(true)}
                                                                >
                                                                    <PencilSquareIcon className="flex-shrink-0 w-4 h-4 mr-1 text-gray-800"></PencilSquareIcon>
                                                                    <p className="w-full text-sm text-center">
                                                                        Edit Route
                                                                    </p>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <ul role="list" className="overflow-y-auto">
                                                            {routeLegData.locations.map((legLocation, index) => {
                                                                const isLoadStop = !!legLocation.loadStop;
                                                                const item = isLoadStop
                                                                    ? legLocation.loadStop
                                                                    : legLocation.location;

                                                                return (
                                                                    <li key={index}>
                                                                        <div className="flex items-center my-2 space-x-4 border rounded-lg bg-slate-50 border-slate-200">
                                                                            <div className="flex-1">
                                                                                <label>
                                                                                    <div className="relative flex items-center flex-1 px-4 py-2 space-x-4 cursor-default">
                                                                                        <div className="flex flex-col items-center gap-4 justify-items-start">
                                                                                            <p className="relative top-0 w-6 h-6 p-1 text-xs text-center rounded-full bg-slate-200">
                                                                                                {index + 1}
                                                                                            </p>
                                                                                        </div>
                                                                                        <div className="flex-1 truncate">
                                                                                            <p className="text-base font-semibold text-gray-900 capitalize truncate">
                                                                                                {item.name.toLowerCase()}
                                                                                            </p>
                                                                                            {isLoadStop && (
                                                                                                <p className="text-xs text-gray-800 truncate">
                                                                                                    {new Date(
                                                                                                        (
                                                                                                            item as LoadStop
                                                                                                        ).date,
                                                                                                    ).toLocaleDateString()}{' '}
                                                                                                    @{' '}
                                                                                                    {
                                                                                                        (
                                                                                                            item as LoadStop
                                                                                                        ).time
                                                                                                    }
                                                                                                </p>
                                                                                            )}
                                                                                            <p className="text-sm text-gray-500 capitalize truncate">
                                                                                                {item.street.toLowerCase()}
                                                                                            </p>
                                                                                            <p className="text-sm text-gray-500 capitalize truncate">
                                                                                                {item.city.toLowerCase()}
                                                                                                ,{' '}
                                                                                                {item.state.toUpperCase()}
                                                                                                , {item.zip}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                </label>
                                                                            </div>
                                                                            {/* <div className="flex flex-col items-center justify-between min-h-full gap-3 pr-4">
                                                                                {index !== 0 ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        className={`m-0 items-center p-0 text-sm font-medium leading-4 text-white bg-white rounded-full hover:bg-slate-300 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-green-600`}
                                                                                        onClick={() =>
                                                                                            repositionLegLocations(
                                                                                                index,
                                                                                                'up',
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <ChevronUpIcon
                                                                                            className="w-5 h-5"
                                                                                            aria-hidden="true"
                                                                                            color="black"
                                                                                        />
                                                                                    </button>
                                                                                ) : (
                                                                                    <p className="w-4 h-4"></p>
                                                                                )}
                                                                                <input
                                                                                    id={`stop-${index}`}
                                                                                    name={`stop-${index}`}
                                                                                    type="checkbox"
                                                                                    value={
                                                                                        legLocation.loadStop?.id ||
                                                                                        legLocation.location.id
                                                                                    }
                                                                                    checked={true} // Assuming checked state is determined elsewhere
                                                                                    onChange={
                                                                                        handleLegLocationCheckboxChange
                                                                                    }
                                                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                                                                />
                                                                                {index <
                                                                                routeLegData.locations.length - 1 ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        className={`m-0 items-center p-0 text-sm font-medium leading-4 text-white bg-white rounded-full hover:bg-slate-300 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-green-600`}
                                                                                        onClick={() =>
                                                                                            repositionLegLocations(
                                                                                                index,
                                                                                                'down',
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <ChevronDownIcon
                                                                                            className="w-5 h-5"
                                                                                            aria-hidden="true"
                                                                                            color="black"
                                                                                        />
                                                                                    </button>
                                                                                ) : (
                                                                                    <p className="w-4 h-4"></p>
                                                                                )}
                                                                            </div> */}
                                                                        </div>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                        {routeLegData.routeLegDistance &&
                                                            routeLegData.routeLegDuration && (
                                                                <p className="p-2 text-sm rounded bg-cyan-300/20">
                                                                    Route Distance:{' '}
                                                                    {metersToMiles(
                                                                        new Prisma.Decimal(
                                                                            routeLegData.routeLegDistance,
                                                                        ).toNumber(),
                                                                    ).toFixed(0)}{' '}
                                                                    miles
                                                                    <br />
                                                                    Route Travel Time:{' '}
                                                                    {secondsToReadable(
                                                                        new Prisma.Decimal(
                                                                            routeLegData.routeLegDuration,
                                                                        ).toNumber(),
                                                                    )}
                                                                </p>
                                                            )}
                                                    </>
                                                )}
                                                {/* Placeholder for when there are no locations selected */}
                                                {routeLegData.locations.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-10 border-2 border-blue-200 border-dashed rounded-lg bg-blue-50">
                                                        <p className="mt-2 text-sm font-semibold text-blue-600">
                                                            Assignment Route
                                                        </p>
                                                        <p className="mt-1 text-xs text-blue-400">
                                                            Select stops/locations for this assignment
                                                        </p>
                                                        <button
                                                            type="button"
                                                            className="inline-flex items-center px-4 py-2 mt-4 text-sm font-medium leading-4 text-white bg-blue-600 rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                                                            onClick={() => setShowLegLocationSelection(true)}
                                                        >
                                                            <p className="w-full text-sm font-semibold text-center">
                                                                Select Locations
                                                            </p>
                                                            <ChevronDoubleRightIcon
                                                                className="w-5 h-5 ml-1"
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    </div>
                                                )}
                                            </section>

                                            {routeLegData.locations.length !== 0 && (
                                                <section className="my-4">
                                                    {routeLegData.driversWithCharge.length !== 0 && (
                                                        <>
                                                            <div className="flex justify-between">
                                                                <div className="flex-col">
                                                                    <h5 className="text-sm font-semibold text-slate-600">
                                                                        Route Drivers
                                                                    </h5>
                                                                    <p className="text-xs font-light text-slate-400">
                                                                        Drivers for this assignment
                                                                    </p>
                                                                </div>
                                                                <div className="flex-shrink-0 ml-2">
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex items-center px-3 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                                        onClick={() => setShowDriverSelection(true)}
                                                                    >
                                                                        <PencilSquareIcon className="flex-shrink-0 w-4 h-4 mr-1 text-gray-800"></PencilSquareIcon>
                                                                        <p className="w-full text-sm text-center">
                                                                            Edit Drivers
                                                                        </p>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <ul
                                                                role="list"
                                                                className="overflow-y-auto divide-gray-200 "
                                                            >
                                                                {routeLegData.driversWithCharge?.map((item, index) => (
                                                                    <li key={index}>
                                                                        <div className="flex items-center my-2 space-x-4 border rounded-lg bg-slate-50 border-slate-200">
                                                                            <div className="flex-1">
                                                                                <div className="relative flex items-center flex-1 px-4 py-2 space-x-4">
                                                                                    <UserCircleIcon
                                                                                        className="w-6 h-6 text-gray-500"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                    <div className="flex-1 truncate">
                                                                                        <p className="text-sm font-bold text-gray-900 capitalize truncate">
                                                                                            {item.driver.name}
                                                                                        </p>
                                                                                        <p className="text-sm text-gray-500 truncate">
                                                                                            Estimated Pay: $
                                                                                            {calculateDriverPay(
                                                                                                item.driver.id,
                                                                                            ).toFixed(2)}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center h-6 pr-4">
                                                                                <input
                                                                                    id={`driver-${index}`}
                                                                                    name={`driver-${index}`}
                                                                                    type="checkbox"
                                                                                    value={item.driver.id}
                                                                                    checked={true}
                                                                                    onChange={
                                                                                        handleDriverCheckboxChange
                                                                                    }
                                                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>

                                                            <p className="p-2 text-sm rounded bg-cyan-300/20">
                                                                Total Estimated Pay: ${calculateTotalPay()}
                                                            </p>
                                                        </>
                                                    )}
                                                    {/* Placeholder for when there are no drivers selected */}
                                                    {routeLegData.driversWithCharge.length === 0 && (
                                                        <div className="flex flex-col items-center justify-center py-10 border-2 border-blue-200 border-dashed rounded-lg bg-blue-50">
                                                            <p className="mt-2 text-sm font-semibold text-blue-600">
                                                                Route Drivers
                                                            </p>
                                                            <p className="mt-1 text-xs text-blue-400">
                                                                Select driver(s) for this assignment
                                                            </p>
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center px-4 py-2 mt-4 text-sm font-medium leading-4 text-white bg-blue-600 rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                                                                onClick={() => setShowDriverSelection(true)}
                                                            >
                                                                <p className="w-full text-sm font-semibold text-center">
                                                                    Select Drivers
                                                                </p>
                                                                <ChevronDoubleRightIcon
                                                                    className="w-5 h-5 ml-1"
                                                                    aria-hidden="true"
                                                                />
                                                            </button>
                                                        </div>
                                                    )}
                                                </section>
                                            )}

                                            {routeLegData.driversWithCharge.length !== 0 &&
                                                routeLegData.locations.length !== 0 && (
                                                    <section className="my-4">
                                                        <div className="flex flex-col justify-start mb-2">
                                                            <h5 className="text-sm font-semibold text-slate-600">
                                                                Start Date & Time
                                                            </h5>
                                                            <p className="text-xs font-light text-slate-400">
                                                                When should drivers begin this assignment
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-row items-end w-full gap-2">
                                                            <input
                                                                onChange={(e) => {
                                                                    setRouteLegData({
                                                                        ...routeLegData,
                                                                        scheduledDate: e.target.value,
                                                                    });
                                                                }}
                                                                value={
                                                                    new Date(routeLegData.scheduledDate)
                                                                        .toISOString()
                                                                        .split('T')[0]
                                                                }
                                                                type="date"
                                                                max="9999-12-31"
                                                                min={new Date().toLocaleString().split('T')[0]}
                                                                autoComplete="date"
                                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            />
                                                            <input
                                                                required
                                                                type="time"
                                                                value={routeLegData.scheduledTime}
                                                                onChange={(e) => {
                                                                    setRouteLegData({
                                                                        ...routeLegData,
                                                                        scheduledTime: e.target.value,
                                                                    });
                                                                }}
                                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            />
                                                        </div>

                                                        <div className="col-span-12 mt-4 mb-2 sm:col-span-4 lg:col-span-3">
                                                            <label
                                                                className="block text-sm font-semibold text-slate-600"
                                                                htmlFor="driverInstructions"
                                                            >
                                                                Optional Driver Instructions
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={routeLegData.driverInstructions}
                                                                onChange={(e) => {
                                                                    setRouteLegData({
                                                                        ...routeLegData,
                                                                        driverInstructions: e.target.value,
                                                                    });
                                                                }}
                                                                autoComplete="state"
                                                                id="driverInstructions"
                                                                placeholder="Enter special instructions for the driver(s) here"
                                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            />
                                                        </div>

                                                        <div className="flex flex-col justify-start my-4">
                                                            <div className="flex items-center justify-between h-full p-2 py-1 rounded-lg bg-slate-100 ">
                                                                <label
                                                                    htmlFor={'sms-send'}
                                                                    className="flex-1 py-1 text-xs font-medium text-gray-900 cursor-pointer sm:text-sm"
                                                                >
                                                                    Send notification to selected drivers
                                                                </label>
                                                                <input
                                                                    id={'sms-send'}
                                                                    name={'sms-send'}
                                                                    type="checkbox"
                                                                    checked={sendSMS}
                                                                    onChange={(e) => setSendSMS(e.target.checked)}
                                                                    className="w-4 h-4 mr-2 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                                                />
                                                            </div>
                                                        </div>
                                                    </section>
                                                )}

                                            <div className="h-16"></div>
                                        </div>

                                        {!showDriverSelection && !showLegLocationSelection && (
                                            <div className="fixed bottom-0 right-0 left-0 py-3 px-5 bg-white border-t-[1px]">
                                                <div className="flex flex-col">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            routeLegData.driversWithCharge.length < 1 ||
                                                            routeLegData.locations.length < 2 ||
                                                            saveLoading
                                                        }
                                                        className={`inline-flex items-center px-3 py-2  text-sm font-medium leading-4 text-white ${
                                                            routeLegData.driversWithCharge.length < 1 ||
                                                            routeLegData.locations.length < 2
                                                                ? 'bg-green-600/30 cursor-not-allowed'
                                                                : 'bg-green-700'
                                                        }  rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600`}
                                                        onClick={() => submit()}
                                                    >
                                                        <PlusIcon className="-ml-0.5 h-7 w-5" aria-hidden="true" />
                                                        <p className="w-full text-sm font-semibold text-center">
                                                            {routeLeg ? 'Save Assignment' : 'Add Assignment'}
                                                        </p>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default RouteLegModal;
