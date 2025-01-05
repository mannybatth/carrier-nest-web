import React, { Fragment, useEffect, useState } from 'react';
import { LoadStatus } from '@prisma/client';
import { ExpandedLoad } from 'interfaces/models';
import { isDate24HrInThePast, loadStatus, UILoadStatus } from 'lib/load/load-utils';
import { Menu, Transition } from '@headlessui/react';
import classNames from 'classnames';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

type LoadDetailsToolbarProps = {
    className?: string;
    load: ExpandedLoad;
    disabled: boolean;
    editLoadClicked: () => void;
    viewInvoiceClicked?: () => void;
    createInvoiceClicked?: () => void;
    assignDriverClicked: () => void;
    changeLoadStatus: (newStatus: LoadStatus) => void;
};

const LoadDetailsToolbar: React.FC<LoadDetailsToolbarProps> = ({
    className,
    load,
    disabled,
    editLoadClicked,
    viewInvoiceClicked,
    createInvoiceClicked,
    assignDriverClicked,
    changeLoadStatus,
}) => {
    const [dropOffDatePassed, setDropOffDatePassed] = useState(false);
    const [loadStatusValue, setLoadStatusValue] = useState(null);

    useEffect(() => {
        if (load) {
            setDropOffDatePassed(isDate24HrInThePast(new Date(load.receiver.date)));
            setLoadStatusValue(loadStatus(load));
        }
    }, [load]);

    return (
        <div className={`z-10 top-0 flex flex-row place-content-between md:sticky ${className}`}>
            <span className="hidden rounded-md shadow-sm md:inline-flex isolate">
                <button
                    type="button"
                    className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-900 bg-white md:text-sm rounded-l-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 active:bg-gray-100"
                    onClick={editLoadClicked}
                    disabled={disabled}
                >
                    Edit Load
                </button>
                <button
                    type="button"
                    className="relative inline-flex items-center px-3 py-2 -ml-px text-xs font-semibold text-gray-900 bg-white md:text-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 active:bg-gray-100"
                    onClick={assignDriverClicked}
                    disabled={disabled}
                >
                    Add Driver Assignment
                </button>
                <button
                    type="button"
                    className="relative inline-flex items-center px-3 py-2 -ml-px text-xs font-semibold text-gray-900 bg-white md:text-sm rounded-r-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 active:bg-gray-100"
                    onClick={() => {
                        if (load.invoice) {
                            viewInvoiceClicked();
                        } else {
                            createInvoiceClicked();
                        }
                    }}
                    disabled={disabled}
                >
                    {load?.invoice ? 'Go to Invoice' : 'Create Invoice'}
                </button>
            </span>

            <span className="inline-flex rounded-md shadow-sm isolate">
                {load &&
                    !dropOffDatePassed &&
                    (loadStatusValue === UILoadStatus.BOOKED ||
                        loadStatusValue === UILoadStatus.IN_PROGRESS ||
                        loadStatusValue === UILoadStatus.DELIVERED) && (
                        <div className="relative inline-flex rounded-md shadow-sm">
                            <button
                                type="button"
                                className="relative inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 bg-white rounded-l-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
                            >
                                Status: {loadStatusValue.toUpperCase()}
                            </button>
                            <Menu as="div" className="block -ml-px">
                                <Menu.Button className="relative inline-flex items-center h-full px-2 py-2 text-gray-400 bg-white rounded-r-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10">
                                    <span className="sr-only">Open options</span>
                                    <ChevronDownIcon className="w-5 h-5" aria-hidden="true" />
                                </Menu.Button>
                                <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-100"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-75"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                >
                                    <Menu.Items className="absolute left-0 z-10 w-56 mt-2 -mr-1 origin-top-right bg-white rounded-md shadow-lg md:right-0 md:left-auto ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        <div className="py-1">
                                            {loadStatusValue !== UILoadStatus.BOOKED && (
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <a
                                                            onClick={() => changeLoadStatus(LoadStatus.CREATED)}
                                                            className={classNames(
                                                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                                'block px-4 py-2 text-sm',
                                                            )}
                                                        >
                                                            Change status to Booked
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                            )}
                                            {loadStatusValue !== UILoadStatus.IN_PROGRESS && (
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <a
                                                            onClick={() => changeLoadStatus(LoadStatus.IN_PROGRESS)}
                                                            className={classNames(
                                                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                                'block px-4 py-2 text-sm',
                                                            )}
                                                        >
                                                            Change status to In Progress
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                            )}
                                            {loadStatusValue !== UILoadStatus.DELIVERED && (
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <a
                                                            onClick={() => changeLoadStatus(LoadStatus.DELIVERED)}
                                                            className={classNames(
                                                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                                'block px-4 py-2 text-sm',
                                                            )}
                                                        >
                                                            Change status to Delivered
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                            )}
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        </div>
                    )}
            </span>
        </div>
    );
};

export default LoadDetailsToolbar;
