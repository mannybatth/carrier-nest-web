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
import { removeDriverFromLoad } from '../../lib/rest/driver';
import { LoadingOverlay } from '../LoadingOverlay';
import { useLoadContext } from '../context/LoadContext';
import LegDriverSelectionModalSearch from './LegDriverSelectionModalSearch';
import { Driver, DriverAssignment, LoadStop, Route, RouteLeg } from '@prisma/client';
import { set } from 'date-fns';
import LegStopsSelectionModalSearch from './LegStopsSelectionModalSearch';
import { ExpandedRoute, ExpandedRouteLeg, ExpandedRouteLegFromLoad } from 'interfaces/models';
import { createRouteLeg, updateRouteLeg } from 'lib/rest/routeLeg';
import { notify } from 'components/Notification';
import { send } from 'process';

type Props = {
    show: boolean;
    onClose: (value: boolean) => void;
    routeLeg?: ExpandedRouteLegFromLoad;
};

const LegAssignmentModal: React.FC<Props> = ({ show, onClose, routeLeg }: Props) => {
    const [load, setLoad] = useLoadContext();
    const [showDriverSearch, setShowDriverSearch] = React.useState(false);
    const [driverInstructions, setDriverInstructions] = React.useState<string>('');
    const [showStopSearch, setShowStopSearch] = React.useState(false);
    const [saveLoading, setSaveLoading] = React.useState(false);
    const [sendSMS, setSendSMS] = React.useState<boolean>(true);
    const [selectedDrivers, setSelectedDrivers] = React.useState<Driver[]>([]);
    const [selectedStops, setSelectedStops] = React.useState<LoadStop[]>([]);

    const [scheduleStartDate, setScheduleStartDate] = React.useState<Date | null>();
    const [rawTime, setRawTime] = React.useState('00:00'); // Default time
    const [hours, minutes] = React.useMemo(() => rawTime.split(':').slice(0, 2).map(Number), [rawTime]);

    // const [selectedDriverIds, setSelectedDriverIds] = React.useState<string[]>([]);

    // If no drivers are assigned to the this task, show the search modal
    /* React.useEffect(() => {
        if (show) {
            if (selectDrivers.length === 0) {
                setShowDriverSearch(true);
            }
        }
    }, [show]); */
    React.useEffect(() => {
        if (routeLeg) {
            setScheduleStartDate(new Date(routeLeg.scheduledDate));
            setRawTime(routeLeg.scheduledTime);
            setSelectedDrivers(routeLeg.driverAssignments.map((assignment) => assignment.driver));
            const allLoadStops = [load.shipper, ...load.stops, load.receiver, ...load.additionalStops];
            const selectedStopsOnLeg = allLoadStops.filter((stop) =>
                routeLeg.locations.find((location, index) => location.id === stop.id),
            ) as LoadStop[];
            setSelectedStops(selectedStopsOnLeg);
            setDriverInstructions(routeLeg.driverInstructions!);
        }
    }, [routeLeg]);

    const close = (value: boolean) => {
        console.log('Closing the stops modal');
        onClose(value);
        setShowDriverSearch(false);
        setDriverInstructions('');
        setSelectedDrivers([]);
        setSelectedStops([]);
        setRawTime('00:00');
        setScheduleStartDate(null);
    };

    const onRemoveDriver = async (driverIdToRemove: string) => {
        setSaveLoading(true);
        await removeDriverFromLoad(load.id, driverIdToRemove);
        setLoad((prev) => ({ ...prev, drivers: prev.drivers.filter((driver) => driver.id !== driverIdToRemove) }));
        setSaveLoading(false);
    };

    const handleDriverCheckboxChange = (event) => {
        //console.log(event.target.checked, event.target.value);
        if (!event.target.checked) {
            //setSelectedDriverIds((prev) => [...prev, event.target.value]);
            const newDriverList = selectedDrivers.filter((driver) => driver.id !== event.target.value);
            setSelectedDrivers(newDriverList);
        }
    };
    const handleStopCheckboxChange = (event) => {
        //console.log(event.target.checked, event.target.value);
        if (!event.target.checked) {
            //setSelectedDriverIds((prev) => [...prev, event.target.value]);
            const newStops = selectedStops.filter((stop) => stop.id !== event.target.value);
            setSelectedStops(newStops);
        }
    };

    const selectDrivers = (drivers: Driver[]) => {
        // Update the array of drivers selected in state
        setSelectedDrivers([...selectedDrivers, ...drivers]);
    };
    const selectStops = (loadStops: LoadStop[]) => {
        // Update the array of stops selected in state
        setSelectedStops([...selectedStops, ...loadStops]);
        // Set the schedule start date to the date of the first stop selected
        console.log('Setting schedule start date to', selectedStops.at(0)?.date || loadStops.at(0)?.date);
        setScheduleStartDate(
            new Date(
                selectedStops.at(0)?.date.toString().split('T')[0] || loadStops.at(0)?.date.toString().split('T')[0],
            ),
        );
    };

    // console.log('Load', load);
    const submit = async () => {
        setSaveLoading(true);
        console.log(rawTime, scheduleStartDate);
        // check if date and time are selected and valid
        if (scheduleStartDate === null || rawTime === null || rawTime === '') {
            notify({ title: 'Error', message: 'Please select a valid date and time', type: 'error' });
            setSaveLoading(false);
            return;
        }

        const routeLegDetails: Partial<ExpandedRouteLeg> = {
            driverAssignments: selectedDrivers.map((driver) => ({
                driverId: driver.id,
            })) as DriverAssignment[],
            locations: selectedStops.map((stop) => ({
                id: stop.id /*
                name: stop.name,
                date: stop.date,
                time: stop.time,
                street: stop.street,
                city: stop.city,
                state: stop.state,
                zip: stop.zip, */,
            })) as LoadStop[],
            driverInstructions: driverInstructions,
            scheduledDate: scheduleStartDate,
            scheduledTime: rawTime,
        };

        try {
            if (routeLeg) {
                // If the routeLeg already exists, update it
                if (routeLeg.id) {
                    //console.log('updating leg', routeLeg);
                    const updatedLeg = await updateRouteLeg(load.id, routeLegDetails, routeLeg.id, sendSMS);
                    //console.log('updated leg', updatedLeg);

                    // Update the load context with the updated driver assignment
                    const curRoute = load.route;
                    const updatedRouteLegs = curRoute.routeLegs.map((leg) =>
                        leg.id === routeLeg.id ? updatedLeg : leg,
                    ) as [];
                    const newRoute: ExpandedRoute = {
                        id: curRoute.id,
                        routeLegs: updatedRouteLegs,
                    };
                    setLoad((prev) => ({
                        ...prev,
                        route: JSON.parse(JSON.stringify(newRoute)),
                    }));

                    notify({ title: 'Load Assignment', message: 'Load assignment successfully updated' });
                }
            } else {
                // If the routeLeg does not exist, create it
                const newLegAssignment: ExpandedRoute = await createRouteLeg(load.id, routeLegDetails, sendSMS);

                // Update the load context with the new driver assignment
                setLoad((prev) => ({
                    ...prev,
                    route: JSON.parse(JSON.stringify(newLegAssignment)),
                }));

                notify({ title: 'Load Assignment', message: 'New load assignment created successfully' });
                //console.log('New leg assignment', newLegAssignment);
            }

            close(true); // Close the modal

            setSaveLoading(false); // Stop the loading spinner
        } catch (error) {
            setSaveLoading(false);
            notify({ title: 'Error', message: 'Error creating/updating driver assignment', type: 'error' });
        }
    };

    const repositionSelectedStops = (index: number, direction: 'up' | 'down') => {
        const toIndex = direction == 'up' ? index - 1 : index + 1;
        const currentStop = selectedStops[index] as LoadStop;
        selectedStops.splice(index, 1);
        selectedStops.splice(toIndex, 0, currentStop);
        const newSelectedStops = [...selectedStops];
        setSelectedStops(newSelectedStops);
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
                                    {showDriverSearch && (
                                        <div className="relative flex flex-col h-full px-5 py-6 space-y-4 bg-white shadow-xl">
                                            <LegDriverSelectionModalSearch
                                                title="Select Drivers"
                                                selectedDrivers={selectedDrivers}
                                                selectDrivers={selectDrivers}
                                                goBack={() => setShowDriverSearch(false)}
                                                close={(value) => close(value)}
                                            ></LegDriverSelectionModalSearch>
                                        </div>
                                    )}
                                    {showStopSearch && (
                                        <div className="relative flex flex-col h-full px-5 py-6 space-y-4 bg-white shadow-xl">
                                            <LegStopsSelectionModalSearch
                                                title="Select Stops"
                                                selectedStops={selectedStops}
                                                selectStops={selectStops}
                                                goBack={() => {
                                                    setShowStopSearch(false);
                                                }}
                                                close={(value) => close(value)}
                                            ></LegStopsSelectionModalSearch>
                                        </div>
                                    )}
                                    <div className="relative flex flex-col h-full px-5 py-6 overflow-y-scroll bg-white shadow-xl">
                                        {saveLoading && <LoadingOverlay />}
                                        {!showDriverSearch && !showStopSearch && (
                                            <div className="fixed bottom-0 right-0 z-10 w-full px-5 pb-5 text-center pr-9 ">
                                                <div className="flex flex-col">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            selectedDrivers.length < 1 ||
                                                            selectedStops.length < 2 ||
                                                            saveLoading
                                                        }
                                                        className={`inline-flex items-center px-3 py-2  text-sm font-medium leading-4 text-white ${
                                                            selectedDrivers.length < 1 || selectedStops.length < 2
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
                                                {selectedDrivers.length != 0 && (
                                                    <div className="p-2 mb-3 rounded-lg bg-slate-100">
                                                        <ul role="list" className="overflow-y-auto divide-gray-200 ">
                                                            {selectedDrivers?.map((driver, index) => (
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
                                                {selectedDrivers.length > 0 && (
                                                    <div className="col-span-12 my-3 sm:col-span-4 lg:col-span-3">
                                                        <label className="block text-sm font-base text-slate-700">
                                                            Driver Instructions
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={driverInstructions}
                                                            onChange={(e) => setDriverInstructions(e.target.value)}
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
                                                            selectedDrivers.length == 0
                                                                ? 'bg-blue-600'
                                                                : 'bg-gray-400/80'
                                                        }  rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600`}
                                                        onClick={() => setShowDriverSearch(true)}
                                                    >
                                                        <UserPlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                                                        <p className="w-full text-sm font-semibold text-center">
                                                            Add Driver(s)
                                                        </p>
                                                    </button>
                                                </div>
                                            </div>

                                            {selectedDrivers.length != 0 && (
                                                <div className="my-4">
                                                    <div className="mb-2">
                                                        <h5 className="text-sm font-semibold text-slate-600">
                                                            Select Stops
                                                        </h5>
                                                        <p className="text-xs font-light text-slate-400">
                                                            Select drops for this assignment
                                                        </p>
                                                    </div>
                                                    {selectedStops.length != 0 && (
                                                        <div className="p-2 mb-3 rounded-lg bg-slate-100">
                                                            <ul role="list" className="overflow-y-auto ">
                                                                {selectedStops?.map((stop, index) => (
                                                                    <li key={index}>
                                                                        <div className="flex items-center m-1 my-2 space-x-4 border rounded-lg bg-slate-50 border-slate-200">
                                                                            <div className="flex-1">
                                                                                <label /* htmlFor={`stop-${index}`} */>
                                                                                    <div className="relative flex items-center flex-1 py-4 pl-4 space-x-4 cursor-default">
                                                                                        <div className="flex flex-col items-center gap-4 justify-items-start">
                                                                                            <p className="relative top-0 w-6 h-6 p-1 text-xs text-center rounded-full bg-slate-200">
                                                                                                {index + 1}
                                                                                            </p>
                                                                                            {/*  <BuildingOffice2Icon
                                                                                                className="w-6 h-6 text-gray-500"
                                                                                                aria-hidden="true"
                                                                                            /> */}
                                                                                        </div>

                                                                                        <div className="flex-1 truncate">
                                                                                            <p className="text-base font-semibold text-gray-900 capitalize truncate">
                                                                                                {stop.name.toLowerCase()}
                                                                                            </p>
                                                                                            <p className="text-xs text-gray-800 truncate">
                                                                                                {new Date(
                                                                                                    stop.date,
                                                                                                ).toLocaleDateString()}{' '}
                                                                                                @ {stop.time}
                                                                                            </p>
                                                                                            <p className="text-sm text-gray-500 capitalize truncate">
                                                                                                {stop.street.toLowerCase()}
                                                                                            </p>
                                                                                            <p className="text-sm text-gray-500 capitalize truncate">
                                                                                                {stop.city.toLowerCase()}
                                                                                                ,{' '}
                                                                                                {stop.state.toUpperCase()}
                                                                                                , {stop.zip}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                </label>
                                                                            </div>
                                                                            <div className="flex flex-col items-center justify-between min-h-full gap-3 pr-4">
                                                                                {index != 0 ? (
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
                                                                                            className="w-5 h-5 "
                                                                                            aria-hidden="true"
                                                                                            color="black"
                                                                                        />
                                                                                    </button>
                                                                                ) : (
                                                                                    <p className="w-4 h-4 "></p>
                                                                                )}
                                                                                <input
                                                                                    id={`stop-${index}`}
                                                                                    name={`stop-${index}`}
                                                                                    type="checkbox"
                                                                                    value={stop.id}
                                                                                    checked={true}
                                                                                    onChange={handleStopCheckboxChange}
                                                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                                                                />
                                                                                {index < selectedStops.length - 1 ? (
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
                                                                                            className="w-5 h-5 "
                                                                                            aria-hidden="true"
                                                                                            color="black"
                                                                                        />
                                                                                    </button>
                                                                                ) : (
                                                                                    <p className="w-4 h-4 "></p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col mb-4 ">
                                                        <button
                                                            type="button"
                                                            className={`inline-flex items-center px-3 py-2 text-sm font-medium   leading-4 text-white ${
                                                                selectedStops.length == 0
                                                                    ? 'bg-blue-600'
                                                                    : 'bg-gray-400/80'
                                                            }  rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600`}
                                                            onClick={() => setShowStopSearch(true)}
                                                        >
                                                            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                                                            <p className="w-full text-sm font-semibold text-center">
                                                                Add Stop(s)
                                                            </p>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedDrivers.length != 0 && selectedStops.length != 0 && (
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
                                                                if (e.target.value != '')
                                                                    setScheduleStartDate(new Date(e.target.value));
                                                            }}
                                                            value={scheduleStartDate?.toISOString()?.split('T')[0]}
                                                            type="date"
                                                            max="9999-12-31"
                                                            min={new Date().toLocaleString().split('T')[0]}
                                                            autoComplete="date"
                                                            className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm  `}
                                                        />
                                                        <input
                                                            required
                                                            type="time"
                                                            value={rawTime}
                                                            onChange={(e) => setRawTime(e.target.value)}
                                                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {selectedDrivers.length != 0 && selectedStops.length != 0 && (
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

                                            {/* <ul role="list" className="flex-1 overflow-y-auto divide-y divide-gray-200">
                                                {load?.drivers?.map((driver) => (
                                                    <li key={driver.id}>
                                                        <div className="relative flex items-center px-4 py-4 group">
                                                            <div className="relative flex items-center flex-1 min-w-0 space-x-4">
                                                                <UserCircleIcon
                                                                    className="w-6 h-6 text-gray-500"
                                                                    aria-hidden="true"
                                                                />
                                                                <div className="flex-1 truncate">
                                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                                        {driver.name}
                                                                    </p>
                                                                    <p className="text-sm text-gray-500 truncate">
                                                                        {driver.phone}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex items-center px-3 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onRemoveDriver(driver.id);
                                                                        }}
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul> */}
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

export default LegAssignmentModal;
