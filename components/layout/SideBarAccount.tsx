'use client';

import { Menu, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { useUserContext } from 'components/context/UserContext';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import type React from 'react';
import { Fragment } from 'react';

interface SideBarAccountProps {
    collapsed: boolean;
}

const SideBarAccount: React.FC<SideBarAccountProps> = ({ collapsed }) => {
    const { defaultCarrier } = useUserContext();

    if (collapsed) {
        return (
            <div className="flex justify-center p-2 border-t border-slate-200">
                <Menu as="div" className="relative">
                    <Menu.Button
                        className="flex items-center justify-center w-10 h-10 text-sm font-medium text-white rounded-lg bg-slate-600 hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white"
                        data-tooltip-id="tooltip"
                        data-tooltip-content={defaultCarrier?.name || 'Account'}
                        data-tooltip-place="right"
                    >
                        {defaultCarrier?.name?.charAt(0).toUpperCase() || <UserCircleIcon className="w-5 h-5" />}
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
                        <Menu.Items className="absolute bottom-full left-0 mb-2 w-48 origin-bottom-left bg-white rounded-lg shadow-lg ring-1 ring-slate-200 focus:outline-none z-50">
                            <div className="py-1">
                                <div className="px-4 py-3 border-b border-slate-100">
                                    <p className="text-sm font-medium text-slate-900 truncate">
                                        {defaultCarrier?.name || ''}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">{defaultCarrier?.email || ''}</p>
                                </div>
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link href={`/settings`}>
                                            <button
                                                className={classNames(
                                                    active ? 'bg-slate-50 text-slate-900' : 'text-slate-700',
                                                    'block w-full text-left px-4 py-2 text-sm transition-colors duration-150',
                                                )}
                                            >
                                                Account settings
                                            </button>
                                        </Link>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <a
                                            href={`/api/auth/signout`}
                                            className={classNames(
                                                active ? 'bg-slate-50 text-slate-900' : 'text-slate-700',
                                                'block w-full text-left px-4 py-2 text-sm transition-colors duration-150',
                                            )}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                signOut();
                                            }}
                                        >
                                            Sign out
                                        </a>
                                    )}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        );
    }

    return (
        <div className="border-t border-slate-200">
            <Menu as="div" className="relative inline-block w-full">
                <Menu.Button className="flex flex-row relative items-center w-full px-3 py-3 space-x-3 text-left hover:bg-slate-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white">
                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-medium text-white rounded-lg bg-slate-600">
                        {defaultCarrier?.name?.charAt(0).toUpperCase() || ''}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{defaultCarrier?.name || ''}</div>
                        <div className="text-xs text-slate-500 truncate">{defaultCarrier?.email || ''}</div>
                    </div>
                    <div className="flex-shrink-0">
                        <ChevronUpDownIcon className="w-4 h-4 text-slate-400" />
                    </div>
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
                    <Menu.Items className="absolute z-10 w-full bottom-full mb-2 origin-bottom bg-white rounded-lg shadow-lg ring-1 ring-slate-200 focus:outline-none">
                        <div className="py-1">
                            <Menu.Item>
                                {({ active }) => (
                                    <Link href={`/settings`}>
                                        <button
                                            className={classNames(
                                                active ? 'bg-slate-50 text-slate-900' : 'text-slate-700',
                                                'block w-full text-left px-4 py-2 text-sm transition-colors duration-150',
                                            )}
                                        >
                                            Account settings
                                        </button>
                                    </Link>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => (
                                    <a
                                        href={`/api/auth/signout`}
                                        className={classNames(
                                            active ? 'bg-slate-50 text-slate-900' : 'text-slate-700',
                                            'block w-full text-left px-4 py-2 text-sm transition-colors duration-150',
                                        )}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            signOut();
                                        }}
                                    >
                                        Sign out
                                    </a>
                                )}
                            </Menu.Item>
                        </div>
                    </Menu.Items>
                </Transition>
            </Menu>
        </div>
    );
};

export default SideBarAccount;
