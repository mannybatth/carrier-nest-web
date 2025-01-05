import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { RouteLegStatus } from '@prisma/client';
import classNames from 'classnames';
import React, { Fragment } from 'react';

type AssignmentStatusDropDownProps = {
    disabled: boolean;
    status: RouteLegStatus;
    legId: string;
    startedAt: Date;
    endedAt: Date;
    changeStatusClicked: (newStatus: RouteLegStatus, legId: string) => void;
};

const statusDotColors = {
    [RouteLegStatus.ASSIGNED]: 'bg-gray-400',
    [RouteLegStatus.IN_PROGRESS]: 'bg-yellow-500',
    [RouteLegStatus.COMPLETED]: 'bg-green-500',
};

const humanReadableStatus = {
    [RouteLegStatus.ASSIGNED]: 'Assigned',
    [RouteLegStatus.IN_PROGRESS]: 'In Progress',
    [RouteLegStatus.COMPLETED]: 'Completed',
};

const AssignmentStatusDropDown: React.FC<AssignmentStatusDropDownProps> = ({
    disabled,
    status,
    legId,
    startedAt,
    endedAt,
    changeStatusClicked,
}) => {
    let qTipText = startedAt && !endedAt ? `Started at: ${new Date(startedAt).toLocaleString()}` : '';
    qTipText = endedAt ? `Completed at: ${new Date(endedAt).toLocaleString()}` : qTipText;

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button
                    data-tooltip-id="tooltip"
                    data-tooltip-content={qTipText}
                    data-tooltip-place="top-start"
                    className="inline-flex justify-center items-center w-full px-2 py-[4px] text-xs font-semibold text-slate-700 bg-white shadow-none border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500"
                    disabled={disabled}
                >
                    <span className={`inline-block w-2 h-2 mr-2 rounded-full ${statusDotColors[status]}`}></span>
                    {humanReadableStatus[status]}
                    <ChevronDownIcon className="w-5 h-4 pl-1 mx-0" aria-hidden="true" />
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
                <Menu.Items
                    key={'load-status-dropdown'}
                    className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                    {Object.values(RouteLegStatus).map((thisStatus, index) => {
                        return (
                            thisStatus !== status && (
                                <div className="py-1" key={`leg-status-item-${index}`}>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <a
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    changeStatusClicked(thisStatus, legId);
                                                }}
                                                className={classNames(
                                                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                    'px-4 py-2 text-sm flex items-center',
                                                )}
                                            >
                                                <span
                                                    className={`inline-block w-2 h-2 mr-2 rounded-full ${statusDotColors[thisStatus]}`}
                                                ></span>
                                                <p className="font-bold">{humanReadableStatus[thisStatus]}</p>
                                            </a>
                                        )}
                                    </Menu.Item>
                                </div>
                            )
                        );
                    })}
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export default AssignmentStatusDropDown;
