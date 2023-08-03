import { Dialog, Transition } from '@headlessui/react';
import { UserCircleIcon, XIcon } from '@heroicons/react/outline';
import { PlusIcon } from '@heroicons/react/solid';
import React, { Fragment } from 'react';
import { removeDriverFromLoad } from '../../lib/rest/driver';
import { useLoadContext } from '../context/LoadContext';
import { LoadingOverlay } from '../LoadingOverlay';
import DriverSelectionModalSearch from './DriverSelectionModalSearch';

type Props = {
    show: boolean;
    onClose: (value: boolean) => void;
};

const DriverSelectionModal: React.FC<Props> = ({ show, onClose }: Props) => {
    const [load, setLoad] = useLoadContext();
    const [showSearch, setShowSearch] = React.useState(false);
    const [saveLoading, setSaveLoading] = React.useState(false);

    // If no drivers are assigned to the load, show the search modal
    React.useEffect(() => {
        if (show) {
            if (load?.drivers?.length === 0) {
                setShowSearch(true);
            }
        }
    }, [show]);

    const close = (value: boolean) => {
        onClose(value);
        setShowSearch(false);
    };

    const onRemoveDriver = async (driverIdToRemove: string) => {
        setSaveLoading(true);
        await removeDriverFromLoad(load.id, driverIdToRemove);
        setLoad((prev) => ({ ...prev, drivers: prev.drivers.filter((driver) => driver.id !== driverIdToRemove) }));
        setSaveLoading(false);
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
                                enter="transform transition ease-in-out duration-500 sm:duration-200"
                                enterFrom="translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-500 sm:duration-200"
                                leaveFrom="translate-x-0"
                                leaveTo="translate-x-full"
                            >
                                <Dialog.Panel className="w-screen max-w-md pointer-events-auto">
                                    {showSearch ? (
                                        <div className="relative flex flex-col h-full px-5 py-6 space-y-4 bg-white shadow-xl">
                                            <DriverSelectionModalSearch
                                                goBack={() => setShowSearch(false)}
                                                close={(value) => close(value)}
                                            ></DriverSelectionModalSearch>
                                        </div>
                                    ) : (
                                        <div className="relative flex flex-col h-full px-5 py-6 overflow-y-scroll bg-white shadow-xl">
                                            {saveLoading && <LoadingOverlay />}
                                            <div className="space-y-4">
                                                <div className="flex items-start justify-between">
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
                                                <div className="flex flex-col flex-none">
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center px-3 py-2 text-sm font-medium leading-4 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600"
                                                        onClick={() => setShowSearch(true)}
                                                    >
                                                        <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                                                        <p className="w-full text-sm font-semibold text-center">
                                                            Add Driver to Load
                                                        </p>
                                                    </button>
                                                </div>
                                                <ul
                                                    role="list"
                                                    className="flex-1 overflow-y-auto divide-y divide-gray-200"
                                                >
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
                                                </ul>
                                            </div>
                                        </div>
                                    )}
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
