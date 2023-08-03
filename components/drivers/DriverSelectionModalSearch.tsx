import { Dialog } from '@headlessui/react';
import { ArrowLeftIcon, UserCircleIcon, XIcon } from '@heroicons/react/outline';
import { Driver } from '@prisma/client';
import React, { useEffect } from 'react';
import { assignDriversToLoad, getAllDrivers } from '../../lib/rest/driver';
import { useLoadContext } from '../context/LoadContext';
import { LoadingOverlay } from '../LoadingOverlay';
import { notify } from '../Notification';
import Spinner from '../Spinner';

type Props = {
    goBack: () => void;
    close: (value: boolean) => void;
};

const DriverSelectionModalSearch: React.FC<Props> = ({ goBack, close }: Props) => {
    const [load, setLoad] = useLoadContext();

    const [loadingAllDrivers, setLoadingAllDrivers] = React.useState<boolean>(false);
    const [saveLoading, setSaveLoading] = React.useState<boolean>(false);

    const [allDrivers, setAllDrivers] = React.useState<Driver[]>([]);
    const [availableDrivers, setAvailableDrivers] = React.useState<Driver[]>([]);
    const [selectedDriverIds, setSelectedDriverIds] = React.useState<string[]>([]);
    const [sendSMS, setSendSMS] = React.useState<boolean>(false);

    useEffect(() => {
        const loadDrivers = async () => {
            setLoadingAllDrivers(true);
            const { drivers } = await getAllDrivers({
                limit: 999,
                offset: 0,
            });
            setAllDrivers(drivers);

            const availableDrivers = drivers.filter((d) => !load.drivers?.find((ld) => ld.id === d.id));
            setAvailableDrivers(availableDrivers);

            setLoadingAllDrivers(false);
        };

        loadDrivers();
    }, [load]);

    const handleCheckboxChange = (event) => {
        if (event.target.checked) {
            setSelectedDriverIds((prev) => [...prev, event.target.value]);
        } else {
            setSelectedDriverIds((prev) => prev.filter((item) => item !== event.target.value));
        }
    };

    const saveSelectedDrivers = async () => {
        setSaveLoading(true);
        const newDriverIds = [...selectedDriverIds, ...load.drivers.map((d) => d.id)];
        const newDrivers = allDrivers.filter((d) => newDriverIds.includes(d.id));

        try {
            await assignDriversToLoad(load.id, selectedDriverIds, sendSMS);
            setLoad((prev) => ({
                ...prev,
                drivers: newDrivers,
            }));
            setSelectedDriverIds([]);
            goBack();
            notify({ title: 'Drivers assigned', message: 'Drivers assigned to load successfully' });
        } catch (e) {
            notify({ title: 'Error Assigning Drivers', message: e.message, type: 'error' });
        }

        setSaveLoading(false);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-start flex-none space-x-4">
                <button
                    type="button"
                    className="inline-flex items-center flex-none px-3 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={(e) => {
                        e.stopPropagation();
                        goBack();
                    }}
                >
                    <ArrowLeftIcon className="w-4 h-4"></ArrowLeftIcon>
                    <span className="ml-1">Back</span>
                </button>
                <Dialog.Title className="flex-1 text-lg font-semibold leading-6 text-gray-900">
                    Add Drivers to Load
                </Dialog.Title>
                <div className="flex items-center ml-3 h-7">
                    <button
                        type="button"
                        className="relative text-gray-400 bg-white rounded-md hover:text-gray-500 focus:ring-2 focus:ring-blue-500"
                        onClick={() => close(false)}
                    >
                        <span className="absolute -inset-2.5" />
                        <span className="sr-only">Close panel</span>
                        <XIcon className="w-6 h-6" aria-hidden="true" />
                    </button>
                </div>
            </div>
            {/* <div className="flex flex-none mt-2 rounded-md shadow-sm">
                <div className="relative flex items-stretch flex-grow focus-within:z-10">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <UsersIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        id="driver-name"
                        autoComplete="driver-name"
                        className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                        placeholder="Search drivers to add to this load"
                    />
                </div>
            </div> */}
            {loadingAllDrivers ? (
                <div className="flex items-start justify-center flex-1 h-32">
                    <div className="flex items-center mt-10 space-x-2 text-gray-500">
                        <Spinner />
                        <span>Loading drivers...</span>
                    </div>
                </div>
            ) : (
                <>
                    {saveLoading && <LoadingOverlay />}

                    {availableDrivers.length > 0 ? (
                        <div className="flex flex-col flex-1 overflow-auto">
                            <ul role="list" className="pb-4 overflow-y-auto divide-y divide-gray-200">
                                {availableDrivers?.map((driver, index) => (
                                    <li key={index}>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-1">
                                                <label htmlFor={`driver-${index}`}>
                                                    <div className="relative flex items-center flex-1 py-4 pl-4 space-x-4 cursor-pointer">
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
                                                    </div>
                                                </label>
                                            </div>
                                            <div className="flex items-center h-6 pr-4">
                                                <input
                                                    id={`driver-${index}`}
                                                    name={`driver-${index}`}
                                                    type="checkbox"
                                                    value={driver.id}
                                                    checked={selectedDriverIds.includes(driver.id)}
                                                    onChange={handleCheckboxChange}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                                />
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            {selectedDriverIds.length > 0 && (
                                <div className="sticky py-2 bg-white border-t-[1px] flex sm:px-2">
                                    <div className="space-x-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            onClick={saveSelectedDrivers}
                                        >
                                            Save ({selectedDriverIds.length})
                                        </button>
                                        <button
                                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            onClick={() => goBack()}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    <div className="flex-1" />
                                    <div className="flex items-center justify-center h-full">
                                        <input
                                            id={'sms-send'}
                                            name={'sms-send'}
                                            type="checkbox"
                                            onChange={(e) => setSendSMS(e.target.checked)}
                                            className="w-4 h-4 mr-2 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                        />
                                        <label
                                            htmlFor={'sms-send'}
                                            className="text-xs font-medium text-gray-900 cursor-pointer sm:text-sm"
                                        >
                                            Send SMS
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-start justify-center flex-1 h-32">
                            <div className="flex items-center mt-10 space-x-2 text-gray-500">
                                <span>No drivers available to add</span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DriverSelectionModalSearch;
