import { Menu, Transition } from '@headlessui/react';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import React, { Fragment } from 'react';

type AssignmentDropDownProps = {
    disabled: boolean;
    editLegClicked: (legId: string) => void;
    deleteLegClicked: (legId: string) => void;
    openRouteInMapsClicked: (legId: string) => void;
    legId: string;
};

const AssignmentDropDown: React.FC<AssignmentDropDownProps> = ({
    disabled,
    editLegClicked,
    deleteLegClicked,
    openRouteInMapsClicked,
    legId,
}) => {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button
                    className="inline-flex justify-center w-full px-1 py-[2px] text-sm font-bold text-slate-700 bg-white shadow-lg border border-gray-300 rounded-md  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500"
                    disabled={disabled}
                >
                    <EllipsisHorizontalIcon className="w-5 h-5 mx-0" aria-hidden="true" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        editLegClicked(legId);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Edit Assignment
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openRouteInMapsClicked(legId);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Open route map
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteLegClicked(legId);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Delete Assignment
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export default AssignmentDropDown;
