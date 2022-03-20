import { Menu, Transition } from '@headlessui/react';
import {
    ChevronDownIcon,
    DocumentDownloadIcon,
    LocationMarkerIcon,
    PaperClipIcon,
    StopIcon,
    TruckIcon,
} from '@heroicons/react/outline';
import classNames from 'classnames';
import { NextPageContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { Fragment } from 'react';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad } from '../../interfaces/models';
import { loadStatus } from '../../lib/load/load-utils';
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

const LoadDetailsPage: PageWithAuth<Props> = ({ load }: Props) => {
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
            <div className="max-w-4xl py-2 mx-auto">
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
                <div className="grid grid-cols-8 gap-2 px-5 sm:gap-8 md:gap-2 lg:gap-8 sm:px-6 md:px-8">
                    <div className="col-span-8 sm:col-span-3 md:col-span-8 lg:col-span-3">
                        <aside className="overflow-y-auto bg-white border-gray-200">
                            <div className="pb-0 space-y-6 lg:pb-10">
                                <dl className="border-gray-200 divide-y divide-gray-200">
                                    <div className="flex justify-between py-3 text-sm font-medium">
                                        <dt className="text-gray-500">Reference #</dt>
                                        <dd className="text-gray-900">{load.refNum}</dd>
                                    </div>
                                    <div className="flex justify-between py-3 text-sm font-medium">
                                        <dt className="text-gray-500">Status</dt>
                                        <dd className="text-gray-900">
                                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 uppercase bg-green-100 rounded-full">
                                                {loadStatus(load)}
                                            </span>
                                        </dd>
                                    </div>
                                    <div className="flex justify-between py-3 text-sm font-medium">
                                        <dt className="text-gray-500">Customer</dt>
                                        <dd className="text-gray-900">
                                            <Link href={`/customers/${load.customer.id}`}>{load.customer?.name}</Link>
                                        </dd>
                                    </div>
                                    <div className="flex justify-between py-3 text-sm font-medium">
                                        <dt className="text-gray-500">Driver</dt>
                                        <dd className="text-gray-900">
                                            <a>Assign Driver</a>
                                        </dd>
                                    </div>
                                    <div className="flex justify-between py-3 text-sm font-medium">
                                        <dt className="text-gray-500">Rate</dt>
                                        <dd className="text-gray-900">${load.rate}</dd>
                                    </div>
                                    <div className="flex justify-between py-3 text-sm font-medium">
                                        <dt className="text-gray-500">Invoice</dt>
                                        <dd className="text-gray-900">
                                            {load.invoice ? (
                                                <Link href={`/accounting/invoices/${load.invoice.id}`} passHref>
                                                    <a># {load.invoice.id}</a>
                                                </Link>
                                            ) : (
                                                <Link href={`/accounting/create-invoice/${load.id}`}>
                                                    Create Invoice
                                                </Link>
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <div className="flex justify-between py-3 text-sm font-medium">
                                            <dt className="text-gray-500">Documents</dt>
                                            <dd className="text-gray-900">
                                                <a>Download All</a>
                                            </dd>
                                        </div>
                                        <ul
                                            role="list"
                                            className="border border-gray-200 divide-y divide-gray-200 rounded-md"
                                        >
                                            {[
                                                {
                                                    name: 'invoice.pdf',
                                                    href: '',
                                                },
                                                {
                                                    name: 'bol.pdf',
                                                    href: '',
                                                },
                                            ].map((attachment) => (
                                                <li
                                                    key={attachment.name}
                                                    className="flex items-center justify-between py-2 pl-3 pr-4 text-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                                                >
                                                    <div className="flex items-center flex-1 w-0">
                                                        <PaperClipIcon
                                                            className="flex-shrink-0 w-4 h-4 text-gray-400"
                                                            aria-hidden="true"
                                                        />
                                                        <span className="flex-1 w-0 ml-2 truncate">
                                                            {attachment.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex-shrink-0 ml-4">
                                                        <DocumentDownloadIcon className="w-5 h-5 text-gray-500"></DocumentDownloadIcon>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </dl>
                            </div>
                        </aside>
                    </div>

                    <div className="col-span-8 sm:col-span-5 md:col-span-8 lg:col-span-5">
                        <div className="mt-4">
                            <div className="flow-root">
                                <ul role="list" className="-mb-8">
                                    <li>
                                        <div className="relative pb-8">
                                            <span
                                                className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                                                aria-hidden="true"
                                            />
                                            <div className="relative flex items-start space-x-3">
                                                <>
                                                    <div className="relative px-1">
                                                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full ring-8 ring-white">
                                                            <TruckIcon
                                                                className="w-5 h-5 text-green-800"
                                                                aria-hidden="true"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-gray-500">
                                                            <span className="text-lg font-medium text-gray-900">
                                                                {new Intl.DateTimeFormat('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: '2-digit',
                                                                }).format(new Date(load.shipper.date))}
                                                            </span>{' '}
                                                            @ {load.shipper.time}
                                                            <div>{load.shipper.name}</div>
                                                            <div>{load.shipper.street}</div>
                                                            <div>
                                                                {load.shipper.city}, {load.shipper.state}{' '}
                                                                {load.shipper.zip}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            </div>
                                        </div>
                                    </li>
                                    {load.stops.map((stop, index) => (
                                        <li key={index}>
                                            <div className="relative pb-8">
                                                <span
                                                    className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                                                    aria-hidden="true"
                                                />
                                                <div className="relative flex items-start space-x-3">
                                                    <>
                                                        <div className="relative px-1">
                                                            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ring-8 ring-white">
                                                                <StopIcon
                                                                    className="w-5 h-5 text-gray-500"
                                                                    aria-hidden="true"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm text-gray-500">
                                                                <span className="text-lg font-medium text-gray-900">
                                                                    {new Intl.DateTimeFormat('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'long',
                                                                        day: '2-digit',
                                                                    }).format(new Date(stop.date))}
                                                                </span>{' '}
                                                                @ {stop.time}
                                                                <div>{stop.name}</div>
                                                                <div>{stop.street}</div>
                                                                <div>
                                                                    {stop.city}, {stop.state} {stop.zip}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                    <li>
                                        <div className="relative pb-8">
                                            <div className="relative flex items-start space-x-3">
                                                <>
                                                    <div>
                                                        <div className="relative px-1">
                                                            <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full ring-8 ring-white">
                                                                <LocationMarkerIcon
                                                                    className="w-5 h-5 text-red-800"
                                                                    aria-hidden="true"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-gray-500">
                                                            <span className="text-lg font-medium text-gray-900">
                                                                {new Intl.DateTimeFormat('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: '2-digit',
                                                                }).format(new Date(load.receiver.date))}
                                                            </span>{' '}
                                                            @ {load.receiver.time}
                                                            <div>{load.receiver.name}</div>
                                                            <div>{load.receiver.street}</div>
                                                            <div>
                                                                {load.receiver.city}, {load.receiver.state}{' '}
                                                                {load.receiver.zip}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            </div>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

LoadDetailsPage.authenticationEnabled = true;

export default LoadDetailsPage;
