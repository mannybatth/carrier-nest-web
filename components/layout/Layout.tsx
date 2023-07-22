import React, { Fragment, PropsWithChildren, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ChevronDoubleLeftIcon, MenuIcon, XIcon } from '@heroicons/react/outline';
import Navigation from './Navigation';
import SideBarAccount from './SideBarAccount';
import SideBarFooter from './SideBarFooter';
import SideBarSearch from './SideBarSearch';
import { useSession } from 'next-auth/react';
import { getCarriers } from '../../lib/rest/carrier';
import CreateNewButton from './CreateNewButton';

export type Props = PropsWithChildren<{
    smHeaderComponent: JSX.Element;
    className?: string;
}>;

const Layout: React.FC<Props> = ({ children, className, smHeaderComponent }) => {
    const { data: session } = useSession();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [defaultCarrier, setDefaultCarrier] = useState(null);
    const [carrierList, setCarrierList] = useState(null);

    React.useEffect(() => {
        if (session?.user?.defaultCarrierId) {
            getCarriers().then((carriers) => {
                const defaultCarrier = carriers.find((carrier) => carrier.id === session.user.defaultCarrierId);
                setDefaultCarrier(defaultCarrier);
                setCarrierList(carriers);
            });
        }
    }, [session]);

    return (
        <div className={className}>
            <Transition.Root show={sidebarOpen} as={Fragment}>
                <Dialog as="div" className="fixed inset-0 z-40 flex md:hidden" onClose={setSidebarOpen}>
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
                        <div className="relative flex flex-col flex-1 w-full max-w-xs bg-white">
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
                                        <XIcon className="w-6 h-6 text-white" aria-hidden="true" />
                                    </button>
                                </div>
                            </Transition.Child>
                            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                                <div className="flex px-3 pb-1">
                                    <div className="flex-1"></div>
                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-zinc-500 hover:bg-gray-200 active:bg-gray-300"
                                    >
                                        <ChevronDoubleLeftIcon className="w-4 h-4 text-zinc-500"></ChevronDoubleLeftIcon>
                                    </button>
                                </div>
                                <SideBarAccount
                                    defaultCarrier={defaultCarrier}
                                    carrierList={carrierList}
                                ></SideBarAccount>
                                <SideBarSearch></SideBarSearch>
                                <Navigation></Navigation>
                            </div>
                            <SideBarFooter></SideBarFooter>
                        </div>
                    </Transition.Child>
                    <div className="flex-shrink-0 w-14">{/* Force sidebar to shrink to fit close icon */}</div>
                </Dialog>
            </Transition.Root>

            {/* Static sidebar for desktop */}
            <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
                <div className="flex flex-col flex-1 min-h-0 border-r border-gray-200 bg-zinc-100">
                    <div className="flex flex-col flex-1 pt-3 pb-4 overflow-y-auto">
                        <div className="flex px-3 pb-1">
                            <div className="flex-1"></div>
                            <button
                                type="button"
                                className="inline-flex items-center justify-center w-6 h-6 rounded-md text-zinc-500 hover:bg-gray-200 active:bg-gray-300"
                            >
                                <ChevronDoubleLeftIcon className="w-4 h-4 text-zinc-500"></ChevronDoubleLeftIcon>
                            </button>
                        </div>
                        <SideBarAccount defaultCarrier={defaultCarrier} carrierList={carrierList}></SideBarAccount>
                        <SideBarSearch></SideBarSearch>
                        <CreateNewButton className="mx-4 mt-4"></CreateNewButton>
                        <Navigation></Navigation>
                    </div>
                    <SideBarFooter></SideBarFooter>
                </div>
            </div>
            <div className="flex flex-col flex-1 md:pl-64">
                {/* Menu button for smaller screens */}
                <div className="sticky top-0 z-10 flex items-center px-1 pt-1 bg-white md:hidden sm:pl-3 sm:pt-3">
                    <button
                        type="button"
                        className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <span className="sr-only">Open sidebar</span>
                        <MenuIcon className="w-6 h-6" aria-hidden="true" />
                    </button>
                    <div className="flex-1 ml-1 mr-1">{smHeaderComponent}</div>
                </div>

                <main className="flex-1">{children}</main>
            </div>
        </div>
    );
};

export default Layout;
