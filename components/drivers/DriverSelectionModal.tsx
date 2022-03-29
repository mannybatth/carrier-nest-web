import { Dialog, Transition } from '@headlessui/react';
import { Driver } from '@prisma/client';
import React, { Fragment, useEffect } from 'react';
import { getAllDrivers } from '../../lib/rest/driver';
import Spinner from '../Spinner';

type Props = {
    show: boolean;
    onSelect: (driver: Driver) => void;
    onClose: (value: boolean) => void;
};

const DriverSelectionModal: React.FC<Props> = ({ show, onSelect, onClose }: Props) => {
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

    return (
        <Transition.Root show={show} as={Fragment}>
            <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={(value) => close(value)}>
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Dialog.Overlay className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
                    </Transition.Child>

                    {/* This element is to trick the browser into centering the modal contents. */}
                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                        &#8203;
                    </span>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    >
                        <div className="relative inline-block w-full px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div className="block mb-4 mr-8">
                                <h1 className="text-xl font-semibold text-gray-900">Select Driver</h1>
                            </div>

                            {drivers === null ? (
                                <div className="text-center ">
                                    <Spinner className="inline-block"></Spinner>
                                </div>
                            ) : (
                                <div className="mt-4">
                                    {drivers.map((driver) => (
                                        <button
                                            key={driver.id}
                                            className="block w-full px-4 py-2 text-left transition-colors duration-200 bg-white hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                                            onClick={() => onSelect(driver)}
                                        >
                                            <div className="flex items-center">
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium leading-5 text-gray-900">
                                                        {driver.name}
                                                    </div>
                                                    <div className="mt-1 text-sm font-medium leading-5 text-gray-500">
                                                        {driver.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="absolute top-0 right-0 mt-4 mr-4">
                                <button
                                    type="button"
                                    className="p-2 text-gray-400 rounded-md hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:text-gray-500"
                                    onClick={() => close(false)}
                                >
                                    <svg className="w-6 h-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default DriverSelectionModal;
