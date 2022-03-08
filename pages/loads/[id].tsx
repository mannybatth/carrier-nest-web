import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/outline';
import classNames from 'classnames';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React, { Fragment } from 'react';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import { ComponentWithAuth } from '../../interfaces/auth';
import { ExpandedLoad } from '../../interfaces/models';
import { deleteLoadById, getLoadById } from '../../lib/rest/load';

type ActionsDropdownProps = {
    load: ExpandedLoad;
    deleteLoad: (id: number) => void;
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({ load, deleteLoad }: ActionsDropdownProps) => {
    const router = useRouter();

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500">
                    Actions
                    <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" aria-hidden="true" />
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
                <Menu.Items className="absolute right-0 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/loads/edit/${load.id}`);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Edit
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
                                        deleteLoad(load.id);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Delete
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export async function getServerSideProps(context: NextPageContext) {
    const load = await getLoadById(Number(context.query.id));
    return {
        props: {
            load,
        },
    };
}

type Props = {
    load: ExpandedLoad;
};

const LoadDetailsPage: ComponentWithAuth<Props> = ({ load }: Props) => {
    const router = useRouter();

    const deleteLoad = async (id: number) => {
        await deleteLoadById(id);

        notify({ title: 'Load deleted', message: 'Load deleted successfully' });

        router.push('/loads');
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Load Details</h1>
                    <ActionsDropdown load={load} deleteLoad={deleteLoad}></ActionsDropdown>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Loads',
                            href: '/loads',
                        },
                        {
                            label: `# ${load.refNum}`,
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Load Details</h1>
                        <ActionsDropdown load={load} deleteLoad={deleteLoad}></ActionsDropdown>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <dl className="grid grid-cols-4 gap-x-4 gap-y-8">
                        <div className="col-span-4 sm:col-span-2 md:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Reference #</dt>
                            <dd className="mt-1 text-sm text-gray-900">{load.refNum}</dd>
                        </div>
                        <div className="col-span-4 sm:col-span-2 md:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Customer</dt>
                            <dd className="mt-1 text-sm text-gray-900">{load.customer.name}</dd>
                        </div>
                        <div className="col-span-4 sm:col-span-2 md:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 uppercase bg-green-100 rounded-full">
                                    {load.status}
                                </span>
                            </dd>
                        </div>
                        <div className="col-span-4 sm:col-span-2 md:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Invoice #</dt>
                            <dd className="mt-1 text-sm text-gray-900"></dd>
                        </div>
                        <div className="col-span-4 sm:col-span-2 md:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Pick Up</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <div>{load.shipper.name}</div>
                                <div>{load.shipper.street}</div>
                                <div>
                                    {load.shipper.city}, {load.shipper.state} {load.shipper.zip}
                                </div>
                            </dd>
                        </div>
                        <div className="col-span-4 sm:col-span-2 md:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Pick Up Date & Time</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <div>
                                    {new Intl.DateTimeFormat('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: '2-digit',
                                    }).format(new Date(load.shipper.date))}
                                </div>
                                <div>{load.shipper.time}</div>
                            </dd>
                        </div>
                        <div className="col-span-4 sm:col-span-2 md:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Drop Off</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <div>{load.receiver.name}</div>
                                <div>{load.receiver.street}</div>
                                <div>
                                    {load.receiver.city}, {load.receiver.state} {load.receiver.zip}
                                </div>
                            </dd>
                        </div>
                        <div className="col-span-4 sm:col-span-2 md:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Drop Off Date & Time</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <div>
                                    {new Intl.DateTimeFormat('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: '2-digit',
                                    }).format(new Date(load.receiver.date))}
                                </div>
                                <div>{load.receiver.time}</div>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </Layout>
    );
};

LoadDetailsPage.authenticationEnabled = true;

export default LoadDetailsPage;
