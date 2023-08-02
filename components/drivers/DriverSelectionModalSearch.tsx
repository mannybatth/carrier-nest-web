import { Dialog } from '@headlessui/react';
import { ArrowLeftIcon, UserCircleIcon, XIcon } from '@heroicons/react/outline';
import { UsersIcon } from '@heroicons/react/solid';
import { Driver } from '@prisma/client';
import React, { useEffect } from 'react';
import { getAllDrivers } from '../../lib/rest/driver';
import { useLoadContext } from '../context/LoadContext';

type Props = {
    goBack: () => void;
    close: (value: boolean) => void;
    onDriversListChange: (drivers: Driver[]) => void;
};

const DriverSelectionModalSearch: React.FC<Props> = ({ goBack, close, onDriversListChange }: Props) => {
    const [load, setLoad] = useLoadContext();
    const [allDrivers, setAllDrivers] = React.useState<Driver[]>([]);
    const [selectedDriverIds, setSelectedDriverIds] = React.useState<string[]>([]);

    useEffect(() => {
        const loadDrivers = async () => {
            const { drivers } = await getAllDrivers({
                limit: 999,
                offset: 0,
            });
            const availableDrivers = drivers.filter((d) => !load.drivers?.find((ld) => ld.id === d.id));
            setAllDrivers(availableDrivers);
        };

        loadDrivers();
    }, [load]);

    const doSearch = async (name: string) => {
        //
    };

    const handleCheckboxChange = (event) => {
        if (event.target.checked) {
            setSelectedDriverIds((prev) => [...prev, event.target.value]);
        } else {
            setSelectedDriverIds((prev) => prev.filter((item) => item !== event.target.value));
        }
    };

    // const assignDrivers = async (drivers: Driver[]) => {
    //     const newDrivers = [...(assignedDrivers || []), ...drivers];

    //     try {
    //         await assignDriversToLoad(
    //             loadId,
    //             newDrivers.map((d) => d.id),
    //         );

    //         setAssignedDrivers(newDrivers);
    //         onDriversListChange(newDrivers as Driver[]);
    //         notify({ title: 'Drivers assigned', message: 'Drivers assigned to load successfully' });
    //     } catch (e) {
    //         notify({ title: 'Error Assigning Drivers', message: e.message, type: 'error' });
    //     }
    // };

    return (
        <div className="space-y-4">
            <div className="flex items-start space-x-4">
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
                    Drivers Assigned to Load
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
            <div className="flex mt-2 rounded-md shadow-sm">
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
            </div>
            <ul role="list" className="flex-1 overflow-y-auto divide-y divide-gray-200">
                {allDrivers?.map((driver) => (
                    <li key={driver.id}>
                        <div className="flex items-center space-x-4">
                            <div className="flex-1">
                                <label htmlFor={`driver-${driver.id}`}>
                                    <div className="relative flex items-center flex-1 py-4 pl-4 space-x-4 cursor-pointer">
                                        <UserCircleIcon className="w-6 h-6 text-gray-500" aria-hidden="true" />
                                        <div className="flex-1 truncate">
                                            <p className="text-sm font-medium text-gray-900 truncate">{driver.name}</p>
                                            <p className="text-sm text-gray-500 truncate">{driver.phone}</p>
                                        </div>
                                    </div>
                                </label>
                            </div>
                            <div className="flex items-center h-6 pr-4">
                                <input
                                    id={`driver-${driver.id}`}
                                    name={`driver-${driver.id}`}
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
        </div>
    );
};

export default DriverSelectionModalSearch;
