'use client';

import { Menu, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { useUserContext } from 'components/context/UserContext';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import type React from 'react';
import { Fragment } from 'react';
import NotificationBell from '../../components/NotificationBell';

interface SideBarAccountProps {
    collapsed: boolean;
}

const SideBarAccount: React.FC<SideBarAccountProps> = ({ collapsed }) => {
    const { defaultCarrier } = useUserContext();

    if (collapsed) {
        return (
            <div className="flex flex-col items-center space-y-4 p-3 border-t border-slate-200/80 bg-gradient-to-b from-slate-50/50 to-white">
                {/* Notification Bell - Collapsed */}
                <div className="relative">
                    <NotificationBell collapsed={true} />
                </div>

                {/* Account Menu - Collapsed */}
                <Menu as="div" className="relative">
                    <Menu.Button
                        className="flex items-center justify-center w-10 h-10 text-sm font-bold text-white rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white overflow-hidden"
                        data-tooltip-id="tooltip"
                        data-tooltip-content={defaultCarrier?.name || 'Account'}
                        data-tooltip-place="right"
                    >
                        {defaultCarrier?.name?.charAt(0).toUpperCase() || <UserCircleIcon className="w-5 h-5" />}
                    </Menu.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="transform opacity-0 scale-95 translate-y-2"
                        enterTo="transform opacity-100 scale-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="transform opacity-100 scale-100 translate-y-0"
                        leaveTo="transform opacity-0 scale-95 translate-y-2"
                    >
                        <Menu.Items className="fixed bottom-20 left-2 mb-2 w-56 origin-bottom-left bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-slate-200/60 focus:outline-none z-[9999] border border-white/20">
                            <div className="py-2">
                                {/* Account Header */}
                                <div className="px-4 py-3 border-b border-slate-100/80">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center justify-center w-10 h-10 text-sm font-bold text-white rounded-xl bg-gradient-to-br from-slate-600 to-slate-700">
                                            {defaultCarrier?.name?.charAt(0).toUpperCase() || ''}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 truncate">
                                                {defaultCarrier?.name || ''}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {defaultCarrier?.email || ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="py-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <Link href={`/billing`}>
                                                <button
                                                    className={classNames(
                                                        active ? 'bg-slate-50/80 text-slate-900' : 'text-slate-700',
                                                        'block w-full text-left px-4 py-3 text-sm font-medium transition-all duration-150 hover:bg-slate-50/80',
                                                    )}
                                                >
                                                    Plan & Billing
                                                </button>
                                            </Link>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <Link href={`/settings`}>
                                                <button
                                                    className={classNames(
                                                        active ? 'bg-slate-50/80 text-slate-900' : 'text-slate-700',
                                                        'block w-full text-left px-4 py-3 text-sm font-medium transition-all duration-150 hover:bg-slate-50/80',
                                                    )}
                                                >
                                                    Account Settings
                                                </button>
                                            </Link>
                                        )}
                                    </Menu.Item>
                                    <div className="border-t border-slate-100/80 mt-1 pt-1">
                                        <Menu.Item>
                                            {({ active }) => (
                                                <a
                                                    href={`/api/auth/signout`}
                                                    className={classNames(
                                                        active ? 'bg-red-50/80 text-red-700' : 'text-slate-700',
                                                        'block w-full text-left px-4 py-3 text-sm font-medium transition-all duration-150 hover:bg-red-50/80 hover:text-red-700',
                                                    )}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        signOut();
                                                    }}
                                                >
                                                    Sign Out
                                                </a>
                                            )}
                                        </Menu.Item>
                                    </div>
                                </div>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        );
    }

    return (
        <div className="border-t border-slate-200/80 bg-gradient-to-b from-slate-50/30 to-white">
            {/* Enhanced Account & Notification Section - Expanded */}
            <div className="p-4 space-y-4">
                {/* Notification Bell for expanded sidebar */}
                <div className="flex justify-center">
                    <NotificationBell collapsed={false} />
                </div>

                {/* Account Menu for expanded sidebar */}
                <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center w-full p-3 rounded-2xl hover:bg-slate-100/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white group overflow-hidden">
                        <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 text-sm font-bold text-white rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 group-hover:from-slate-700 group-hover:to-slate-800 shadow-lg transition-all duration-200">
                            {defaultCarrier?.name?.charAt(0).toUpperCase() || ''}
                        </div>
                        <div className="flex-1 min-w-0 ml-3">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                                {defaultCarrier?.name || ''}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{defaultCarrier?.email || ''}</div>
                        </div>
                        <div className="flex items-center flex-shrink-0 ml-2">
                            <ChevronUpDownIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors duration-200" />
                        </div>
                    </Menu.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="transform opacity-0 scale-95 translate-y-2"
                        enterTo="transform opacity-100 scale-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="transform opacity-100 scale-100 translate-y-0"
                        leaveTo="transform opacity-0 scale-95 translate-y-2"
                    >
                        <Menu.Items className="absolute bottom-full left-0 right-0 mb-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-slate-200/60 focus:outline-none z-[9999] border border-white/20 overflow-hidden">
                            <div className="py-2">
                                {/* Menu Items */}
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link href={`/billing`}>
                                            <button
                                                className={classNames(
                                                    active ? 'bg-slate-50/80 text-slate-900' : 'text-slate-700',
                                                    'block w-full text-left px-4 py-3 text-sm font-medium transition-all duration-150 hover:bg-slate-50/80',
                                                )}
                                            >
                                                Plan & Billing
                                            </button>
                                        </Link>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link href={`/settings`}>
                                            <button
                                                className={classNames(
                                                    active ? 'bg-slate-50/80 text-slate-900' : 'text-slate-700',
                                                    'block w-full text-left px-4 py-3 text-sm font-medium transition-all duration-150 hover:bg-slate-50/80',
                                                )}
                                            >
                                                Account Settings
                                            </button>
                                        </Link>
                                    )}
                                </Menu.Item>
                                <div className="border-t border-slate-100/80 mt-1 pt-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <a
                                                href={`/api/auth/signout`}
                                                className={classNames(
                                                    active ? 'bg-red-50/80 text-red-700' : 'text-slate-700',
                                                    'block w-full text-left px-4 py-3 text-sm font-medium transition-all duration-150 hover:bg-red-50/80 hover:text-red-700',
                                                )}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    signOut();
                                                }}
                                            >
                                                Sign Out
                                            </a>
                                        )}
                                    </Menu.Item>
                                </div>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </div>
    );
};

export default SideBarAccount;
