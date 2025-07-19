'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type React from 'react';
import { Fragment, type PropsWithChildren, useState } from 'react';
import { Tooltip } from 'react-tooltip';
import { useSidebar } from '../../contexts/SidebarContext';
import CreateNewButton from './CreateNewButton';
import Navigation from './Navigation';
import SideBarAccount from './SideBarAccount';
import SideBarFooter from './SideBarFooter';
import SideBarSearch from './SideBarSearch';

export type Props = PropsWithChildren<{
    smHeaderComponent: JSX.Element;
    className?: string;
}>;

const Layout: React.FC<Props> = ({ children, className, smHeaderComponent }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { sidebarCollapsed, toggleSidebar } = useSidebar();

    return (
        <div className={className}>
            <Tooltip
                id="tooltip"
                className="z-[99] rounded-[12px] p-0"
                style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                }}
            />

            <Transition.Root show={sidebarOpen} as={Fragment}>
                <Dialog as="div" className="fixed inset-0 z-[99999] flex md:hidden" onClose={setSidebarOpen}>
                    <Transition.Child
                        as={Fragment}
                        enter="transition-opacity ease-linear duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity ease-linear duration-300"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Dialog.Overlay className="fixed inset-0 bg-gray-600 bg-opacity-75" />
                    </Transition.Child>
                    <Transition.Child
                        as={Fragment}
                        enter="transition ease-in-out duration-300 transform"
                        enterFrom="-translate-x-full"
                        enterTo="translate-x-0"
                        leave="transition ease-in-out duration-300 transform"
                        leaveFrom="translate-x-0"
                        leaveTo="-translate-x-full"
                    >
                        <div className="relative flex flex-col flex-1 w-full max-w-xs bg-white shadow-xl">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-in-out duration-300"
                                enterFrom="opacity-0"
                                enterTo="opacity-100"
                                leave="ease-in-out duration-300"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                {/* Close button for smaller screens */}
                                <div className="absolute top-0 right-0 pt-2 -mr-12">
                                    <button
                                        type="button"
                                        className="flex items-center justify-center w-10 h-10 ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <span className="sr-only">Close sidebar</span>
                                        <XMarkIcon className="w-6 h-6 text-white" aria-hidden="true" />
                                    </button>
                                </div>
                            </Transition.Child>
                            <div className="flex-1 h-0 pt-0 pb-4 overflow-y-auto">
                                <SideBarFooter collapsed={false} onToggle={() => setSidebarOpen(false)} />
                                <SideBarSearch collapsed={false} />
                                <CreateNewButton className="mx-4 mt-4" collapsed={false} />
                                <Navigation collapsed={false} />
                            </div>
                            <SideBarAccount collapsed={false} />
                        </div>
                    </Transition.Child>
                    <div className="flex-shrink-0 w-14">{/* Force sidebar to shrink to fit close icon */}</div>
                </Dialog>
            </Transition.Root>

            {/* Static sidebar for desktop */}
            <div
                className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 z-10 transition-all duration-300 ease-in-out ${
                    sidebarCollapsed ? 'md:w-16' : 'md:w-64'
                }`}
            >
                <div className="flex flex-col flex-1 min-h-0 border-r  border-gray-200 bg-gradient-to-b from-slate-50 to-gray-100 shadow-none">
                    <div className="flex flex-col flex-1 pt-0 pb-4 overflow-visible">
                        <SideBarFooter collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
                        <SideBarSearch collapsed={sidebarCollapsed} />
                        <CreateNewButton
                            className={sidebarCollapsed ? 'mx-2 mt-4' : 'mx-4 mt-4'}
                            collapsed={sidebarCollapsed}
                        />
                        <Navigation collapsed={sidebarCollapsed} />
                    </div>

                    {/* Account section positioned at bottom */}
                    <SideBarAccount collapsed={sidebarCollapsed} />
                </div>
            </div>

            <div
                className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${
                    sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
                }`}
            >
                {/* Menu button for smaller screens */}
                <div className="sticky top-0 z-10 flex items-center px-1 pt-1 bg-white md:hidden sm:pl-3 sm:pt-3">
                    <button
                        type="button"
                        className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <span className="sr-only">Open sidebar</span>
                        <Bars3Icon className="w-6 h-6" aria-hidden="true" />
                    </button>
                    <div className="flex-1 min-w-0 ml-1 mr-1">{smHeaderComponent}</div>
                </div>

                <main className="flex-1">{children}</main>
            </div>
        </div>
    );
};

export default Layout;
