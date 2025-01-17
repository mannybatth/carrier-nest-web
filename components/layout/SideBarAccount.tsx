import { Menu, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { useUserContext } from 'components/context/UserContext';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import React, { Fragment } from 'react';

const SideBarAccount: React.FC = () => {
    const { defaultCarrier } = useUserContext();

    return (
        <div className="flex">
            <Menu as="div" className="relative inline-block w-full bg-slate-100/60 mb-2">
                <Menu.Button className="flex flex-row items-center w-full px-4 py-4 space-x-2 text-left hover:bg-gray-200 hover:cursor-pointer active:bg-gray-300">
                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-lg font-bold text-slate-100 rounded-full shadow-md border-2 border-gray-400 bg-neutral-400">
                        {defaultCarrier?.name?.charAt(0).toUpperCase() || ''}
                    </div>
                    <div className="flex-1 h-8">
                        <div className="text-sm font-medium leading-4 text-zinc-600 line-clamp-1">
                            {defaultCarrier?.name || ''}
                        </div>
                        <div className="text-xs font-medium leading-4 text-zinc-500 line-clamp-1">
                            {defaultCarrier?.email || ''}
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        <ChevronUpDownIcon className="w-6 h-6 text-zinc-500"></ChevronUpDownIcon>
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
                    <Menu.Items className="absolute z-10 w-10/12 right-4 -mt-[160px] origin-top-right bg-white rounded-md shadow-lg m-auto ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                            {/* <Menu.Item>
                            {({ active }) => (
                                <Link href={`/settings?page=switchcarrier`}>
                                    <button
                                        className={classNames(
                                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                            'block w-full text-left px-4 py-2 text-sm',
                                        )}
                                    >
                                        Switch Carrier
                                    </button>
                                </Link>
                            )}
                        </Menu.Item> */}
                            <Menu.Item>
                                {({ active }) => (
                                    <Link href={`/settings`}>
                                        <button
                                            className={classNames(
                                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                'block w-full text-left px-4 py-2 text-sm',
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
                                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                            'block w-full text-left px-4 py-2 text-sm',
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
