import { Dialog, Transition } from '@headlessui/react';
import {
    PlusIcon,
    UserCircleIcon,
    XMarkIcon,
    UserPlusIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from '@heroicons/react/24/outline';
import React, { Fragment } from 'react';
import { LoadingOverlay } from '../LoadingOverlay';
import { useLoadContext } from '../context/LoadContext';
import { Driver, LoadStop, Location, Route } from '@prisma/client';
import { ExpandedRouteLeg, ExpandedRouteLegLocation } from 'interfaces/models';
import { notify } from 'components/Notification';
import { createRouteLeg, updateRouteLeg } from 'lib/rest/routeLeg';
import { CreateAssignmentRequest, UpdateAssignmentRequest } from 'interfaces/assignment';
import RouteLegDriverSelection from './RouteLegDriverSelection';
import RouteLegLocationSelection from './RouteLegLocationSelection';
import { useRouteLegDataContext } from 'components/context/RouteLegDataContext';

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

    const [sendSMS, setSendSMS] = React.useState<boolean>(true);

    const [saveLoading, setSaveLoading] = React.useState(false);

    React.useEffect(() => {
        if (routeLeg) {
            setRouteLegData({
                drivers: routeLeg.driverAssignments.map((assignment) => assignment.driver),
                locations: routeLeg.locations,
                driverInstructions: routeLeg.driverInstructions,
                scheduledDate: new Date(routeLeg.scheduledDate).toISOString().split('T')[0],
                scheduledTime: routeLeg.scheduledTime,
            });
        } else {
            setRouteLegData({
                drivers: [],
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
            drivers: [],
            locations: [],
            driverInstructions: '',
            scheduledDate: new Date().toISOString().split('T')[0],
            scheduledTime: '',
        });
    };

    const handleDriverCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.checked) {
            const currentDriverList = routeLegData.drivers;
            const newDriverList = currentDriverList.filter((driver) => driver.id !== event.target.value);
            setRouteLegData({
                ...routeLegData,
                drivers: newDriverList,
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

    const onSelectedDriversChange = (drivers: Driver[]) => {
        setRouteLegData({
            ...routeLegData,
            drivers: drivers,
        });
    };

    const onSelectedLegLocationsChange = (locations: ExpandedRouteLegLocation[]) => {
        setRouteLegData({
            ...routeLegData,
            locations: locations,
        });
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
    };

    const repositionSelectedStops = (index: number, direction: 'up' | 'down') => {
        // const toIndex = direction == 'up' ? index - 1 : index + 1;
        // const currentStop = selectedStops[index] as LoadStop;
        // routeLegData.locations.splice(index, 1);
        // routeLegData.locations.splice(toIndex, 0, currentStop);
        // const newSelectedStops = [...selectedStops];
        // setSelectedStops(newSelectedStops);
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
                                    {showDriverSelection && (
                                        <div className="relative flex flex-col h-full px-5 py-6 space-y-4 bg-white shadow-xl">
                                            <RouteLegDriverSelection
                                                title="Select Drivers"
                                                selectedDrivers={routeLegData.drivers}
                                                onDriverSelectionSave={onSelectedDriversChange}
                                                onGoBack={() => setShowDriverSelection(false)}
                                            ></RouteLegDriverSelection>
                                        </div>
                                    )}

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
                                    <div className="relative flex flex-col h-full px-5 py-6 overflow-y-scroll bg-white shadow-xl">
                                        {saveLoading && <LoadingOverlay />}
                                        {!showDriverSelection && !showLegLocationSelection && (
                                            <div className="fixed bottom-0 right-0 z-10 w-full px-5 pb-5 text-center pr-9 ">
                                                <div className="flex flex-col">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            routeLegData.drivers.length < 1 ||
                                                            routeLegData.locations.length < 2 ||
                                                            saveLoading
                                                        }
                                                        className={`inline-flex items-center px-3 py-2  text-sm font-medium leading-4 text-white ${
                                                            routeLegData.drivers.length < 1 ||
                                                            routeLegData.locations.length < 2
                                                                ? 'bg-blue-600/30 cursor-not-allowed'
                                                                : 'bg-blue-700'
                                                        }  rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600`}
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
                                        <div className="">
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

                                            <div className="my-4 ">
                                                <div className="flex flex-col justify-start mb-2">
                                                    <h5 className="text-sm font-semibold text-slate-600">
                                                        Select Drivers
                                                    </h5>
                                                    <p className="text-xs font-light text-slate-400">
                                                        Add drivers to this assignment
                                                    </p>
                                                </div>
                                                {routeLegData.drivers.length != 0 && (
                                                    <div className="p-2 mb-3 rounded-lg bg-slate-100">
                                                        <ul role="list" className="overflow-y-auto divide-gray-200 ">
                                                            {routeLegData.drivers?.map((driver, index) => (
                                                                <li key={index}>
                                                                    <div className="flex items-center mx-1 my-2 space-x-4 border rounded-lg bg-slate-50 border-slate-200">
                                                                        <div className="flex-1">
                                                                            <label htmlFor={`driver-${index}`}>
                                                                                <div className="relative flex items-center flex-1 py-1 pl-4 space-x-4 cursor-pointer">
                                                                                    <UserCircleIcon
                                                                                        className="w-6 h-6 text-gray-500"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                    <div className="flex-1 truncate">
                                                                                        <p className="text-sm font-bold text-gray-900 capitalize truncate">
                                                                                            {driver.name}
                                                                                        </p>
                                                                                        <p className="text-sm text-gray-500 truncate">
                                                                                            {driver.phone}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </label>
                                                                        </div>
                                                                        <div className="flex items-center h-6 pr-4">
                                                                            <input
                                                                                id={`driver-${index}`}
                                                                                name={`driver-${index}`}
                                                                                type="checkbox"
                                                                                value={driver.id}
                                                                                checked={true}
                                                                                onChange={handleDriverCheckboxChange}
                                                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {routeLegData.drivers.length > 0 && (
                                                    <div className="col-span-12 my-3 sm:col-span-4 lg:col-span-3">
                                                        <label className="block text-sm font-base text-slate-700">
                                                            Driver Instructions
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
                                                            placeholder="Enter special instructions for the driver(s) here"
                                                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex flex-col mb-4 ">
                                                    <button
                                                        type="button"
                                                        className={`inline-flex  items-center px-3 py-2 text-sm font-medium leading-4 text-white ${
                                                            routeLegData.drivers.length == 0
                                                                ? 'bg-blue-600'
                                                                : 'bg-gray-400/80'
                                                        }  rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600`}
                                                        onClick={() => setShowDriverSelection(true)}
                                                    >
                                                        <UserPlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                                                        <p className="w-full text-sm font-semibold text-center">
                                                            Add Driver(s)
                                                        </p>
                                                    </button>
                                                </div>
                                            </div>

                                            {routeLegData.drivers.length != 0 && (
                                                <div className="my-4">
                                                    <div className="mb-2">
                                                        <h5 className="text-sm font-semibold text-slate-600">
                                                            Select Stops
                                                        </h5>
                                                        <p className="text-xs font-light text-slate-400">
                                                            Select drops for this assignment
                                                        </p>
                                                    </div>
                                                    {routeLegData.locations.length !== 0 && (
                                                        <div className="p-2 mb-3 rounded-lg bg-slate-100">
                                                            <ul role="list" className="overflow-y-auto">
                                                                {routeLegData.locations.map((legLocation, index) => {
                                                                    const isLoadStop = !!legLocation.loadStop;
                                                                    const item = isLoadStop
                                                                        ? legLocation.loadStop
                                                                        : legLocation.location;

                                                                    return (
                                                                        <li key={index}>
                                                                            <div className="flex items-center m-1 my-2 space-x-4 border rounded-lg bg-slate-50 border-slate-200">
                                                                                <div className="flex-1">
                                                                                    <label>
                                                                                        <div className="relative flex items-center flex-1 py-4 pl-4 space-x-4 cursor-default">
                                                                                            <div className="flex flex-col items-center gap-4 justify-items-start">
                                                                                                <p className="relative top-0 w-6 h-6 p-1 text-xs text-center rounded-full bg-slate-200">
                                                                                                    {index + 1}
                                                                                                </p>
                                                                                            </div>
                                                                                            <div className="flex-1 truncate">
                                                                                                <p className="text-base font-semibold text-gray-900 capitalize truncate">
                                                                                                    {item.name.toLowerCase()}
                                                                                                </p>
                                                                                                <p className="text-xs text-gray-800 truncate">
                                                                                                    {isLoadStop
                                                                                                        ? new Date(
                                                                                                              (
                                                                                                                  item as LoadStop
                                                                                                              ).date,
                                                                                                          ).toLocaleDateString()
                                                                                                        : new Date(
                                                                                                              (
                                                                                                                  item as Location
                                                                                                              ).createdAt,
                                                                                                          ).toLocaleDateString()}{' '}
                                                                                                    @{' '}
                                                                                                    {isLoadStop
                                                                                                        ? (
                                                                                                              item as LoadStop
                                                                                                          ).time
                                                                                                        : new Date(
                                                                                                              (
                                                                                                                  item as Location
                                                                                                              ).updatedAt,
                                                                                                          ).toLocaleTimeString()}
                                                                                                </p>
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
                                                                                <div className="flex flex-col items-center justify-between min-h-full gap-3 pr-4">
                                                                                    {index !== 0 ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            className={`m-0 items-center p-0 text-sm font-medium leading-4 text-white bg-white rounded-full hover:bg-slate-300 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-green-600`}
                                                                                            onClick={() =>
                                                                                                repositionSelectedStops(
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
                                                                                    routeLegData.locations.length -
                                                                                        1 ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            className={`m-0 items-center p-0 text-sm font-medium leading-4 text-white bg-white rounded-full hover:bg-slate-300 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-green-600`}
                                                                                            onClick={() =>
                                                                                                repositionSelectedStops(
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
                                                                                </div>
                                                                            </div>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col mb-4 ">
                                                        <button
                                                            type="button"
                                                            className={`inline-flex items-center px-3 py-2 text-sm font-medium   leading-4 text-white ${
                                                                routeLegData.locations.length == 0
                                                                    ? 'bg-blue-600'
                                                                    : 'bg-gray-400/80'
                                                            }  rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600`}
                                                            onClick={() => setShowLegLocationSelection(true)}
                                                        >
                                                            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                                                            <p className="w-full text-sm font-semibold text-center">
                                                                Add Stop(s)
                                                            </p>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {routeLegData.drivers.length != 0 && routeLegData.locations.length != 0 && (
                                                <>
                                                    <div className="flex flex-col justify-start mb-2">
                                                        <h5 className="text-sm font-semibold text-slate-600">
                                                            Assignment Date & Time
                                                        </h5>
                                                        <p className="text-xs font-light text-slate-400">
                                                            Which should driver begin this task
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
                                                            className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm  `}
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
                                                </>
                                            )}

                                            {routeLegData.drivers.length != 0 && routeLegData.locations.length != 0 && (
                                                <div className="flex flex-col justify-start my-4">
                                                    <div className="mb-2">
                                                        <h5 className="text-sm font-semibold text-slate-700">
                                                            Send Alert
                                                        </h5>
                                                        <p className="text-xs font-light text-slate-400">
                                                            Notify the drivers of this assignment
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-between h-full p-2 py-2 rounded-lg bg-slate-100 ">
                                                        <label
                                                            htmlFor={'sms-send'}
                                                            className="text-xs font-medium text-gray-900 cursor-pointer sm:text-sm"
                                                        >
                                                            {sendSMS
                                                                ? 'Notify selected drivers'
                                                                : 'Do not notify selected drivers'}
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
                                            )}

                                            <div className="h-16"></div>
                                        </div>
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
