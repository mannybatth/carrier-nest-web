import React from 'react';
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/solid';
import { signOut } from 'next-auth/react';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const SideBarAccount: React.FC = () => (
    <div className="flex">
        <Menu as="div" className="relative inline-block w-full">
            <Menu.Button className="flex flex-row items-center w-full px-4 py-3 space-x-2 text-left hover:bg-gray-200 hover:cursor-pointer active:bg-gray-300">
                <div className="flex items-center justify-center flex-shrink-0 w-4 h-4 text-xs font-medium text-white rounded-sm bg-neutral-400">
                    P
                </div>
                <div className="flex-1">
                    <div className="text-sm font-medium leading-4 text-zinc-600 line-clamp-1">PSB EXPRESS INC</div>
                    <div className="text-xs font-medium leading-4 text-zinc-500 line-clamp-1">
                        psbexpressinc@gmail.com
                    </div>
                </div>
                <div className="flex-shrink-0">
                    <ChevronDownIcon className="w-4 h-4 text-zinc-500"></ChevronDownIcon>
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
                <Menu.Items className="absolute w-56 mt-1 origin-top-right bg-white rounded-md shadow-lg right-3 ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block w-full text-left px-4 py-2 text-sm',
                                    )}
                                >
                                    Account settings
                                </button>
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

export default SideBarAccount;
