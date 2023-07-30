import { Dialog, Transition } from '@headlessui/react';
import { TrashIcon, UserCircleIcon, XIcon } from '@heroicons/react/outline';
import { UsersIcon } from '@heroicons/react/solid';
import { Driver } from '@prisma/client';
import React, { Fragment, useEffect } from 'react';
import { getAllDrivers } from '../../lib/rest/driver';

type Props = {
    show: boolean;
    onClose: (value: boolean) => void;
    onDriversListChange: (drivers: Driver[]) => void;
};

const DriverSelectionModal: React.FC<Props> = ({ show, onClose, onDriversListChange }: Props) => {
    const [drivers, setDrivers] = React.useState<Driver[] | null>(null);

    useEffect(() => {
        if (show && !drivers) {
            fetchDrivers();
        }
    }, [show]);

    const fetchDrivers = async () => {
        const response = await getAllDrivers({ limit: 99, offset: 0 });
        setDrivers(response.drivers);
    };

    const close = (value: boolean) => {
        onClose(value);
    };

    const onRemoveDriver = (driver: Driver) => {
        const newDrivers = drivers?.filter((d) => d.id !== driver.id);
        setDrivers(newDrivers);
    };

    return (
        <Transition.Root show={show} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={(value) => close(value)}>
                <div className="fixed inset-0" />

                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none sm:pl-16">
                            <Transition.Child
                                as={Fragment}
                                enter="transform transition ease-in-out duration-500 sm:duration-700"
                                enterFrom="translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-500 sm:duration-700"
                                leaveFrom="translate-x-0"
                                leaveTo="translate-x-full"
                            >
                                <Dialog.Panel className="w-screen max-w-md pointer-events-auto">
                                    <div className="flex flex-col h-full px-5 py-6 overflow-y-scroll bg-white shadow-xl">
                                        <div className="flex items-start justify-between mb-4">
                                            <Dialog.Title className="text-lg font-semibold leading-6 text-gray-900">
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
                                        <div>
                                            <div className="flex mt-2 rounded-md shadow-sm">
                                                <div className="relative flex items-stretch flex-grow focus-within:z-10">
                                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                        <UsersIcon
                                                            className="w-5 h-5 text-gray-400"
                                                            aria-hidden="true"
                                                        />
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
                                        </div>
                                        <ul role="list" className="flex-1 overflow-y-auto divide-y divide-gray-200">
                                            {drivers?.map((driver) => (
                                                <li key={driver.id}>
                                                    <div className="relative flex items-center px-4 py-6 group">
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
                                                                    className="inline-flex items-center px-3 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onRemoveDriver(driver);
                                                                    }}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
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

export default DriverSelectionModal;
