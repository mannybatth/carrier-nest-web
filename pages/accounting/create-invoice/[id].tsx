import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, PlusSmIcon, SelectorIcon, TruckIcon } from '@heroicons/react/outline';
import classNames from 'classnames';
import { NextPageContext } from 'next';
import React, { Fragment } from 'react';
import Layout from '../../../components/layout/Layout';
import { ComponentWithAuth } from '../../../interfaces/auth';
import { ExpandedLoad } from '../../../interfaces/models';
import { getLoadById } from '../../../lib/rest/load';

export async function getServerSideProps(context: NextPageContext) {
    const load = await getLoadById(Number(context.query.id));

    if (!load) {
        return {
            redirect: {
                permanent: false,
                destination: '/accounting',
            },
        };
    }

    if (load.invoice) {
        return {
            redirect: {
                permanent: false,
                destination: `/accounting/invoice/${load.invoice.id}`,
            },
        };
    }

    return {
        props: {
            load,
        },
    };
}

type Props = {
    load: ExpandedLoad;
};

const invoiceTermOptions = [
    {
        value: '0',
        label: 'Due on Receipt',
    },
    {
        value: '15',
        label: 'Net 15 days',
    },
    {
        value: '30',
        label: 'Net 30 days',
    },
    {
        value: '45',
        label: 'Net 45 days',
    },
];

const CreateInvoice: ComponentWithAuth = ({ load }: Props) => {
    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Create Invoice</h1>
                </div>
            }
        >
            <div className="max-w-4xl py-2 mx-auto">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Create Invoice</h1>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 space-y-6 sm:px-6 md:px-8">
                    <LoadCard load={load} />

                    <div className="col-span-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center">
                                <button
                                    type="button"
                                    className="inline-flex items-center px-4 py-0.5 text-xs font-medium leading-5 text-gray-700 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={() => {}}
                                >
                                    <PlusSmIcon className="-ml-1.5 mr-1 h-4 w-4 text-gray-400" aria-hidden="true" />
                                    <span>Add Invoice Item</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <Listbox value={`net-30`} onChange={() => {}}>
                            {({ open }) => (
                                <>
                                    <Listbox.Label className="block text-sm font-medium text-gray-700">
                                        Invoice Terms
                                    </Listbox.Label>
                                    <div className="relative mt-1">
                                        <Listbox.Button className="relative w-full py-2 pl-3 pr-10 text-left bg-white border border-gray-300 rounded-md shadow-sm cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <span className="block truncate">Net 30 days</span>
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                                <SelectorIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                                            </span>
                                        </Listbox.Button>

                                        <Transition
                                            show={open}
                                            as={Fragment}
                                            leave="transition ease-in duration-100"
                                            leaveFrom="opacity-100"
                                            leaveTo="opacity-0"
                                        >
                                            <Listbox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                                {invoiceTermOptions.map(({ value, label }) => (
                                                    <Listbox.Option
                                                        key={value}
                                                        className={({ active }) =>
                                                            classNames(
                                                                active ? 'text-white bg-blue-600' : 'text-gray-900',
                                                                'cursor-default select-none relative py-2 pl-3 pr-9',
                                                            )
                                                        }
                                                        value={value}
                                                    >
                                                        {({ selected, active }) => (
                                                            <>
                                                                <span
                                                                    className={classNames(
                                                                        selected ? 'font-semibold' : 'font-normal',
                                                                        'block truncate',
                                                                    )}
                                                                >
                                                                    {label}
                                                                </span>

                                                                {selected ? (
                                                                    <span
                                                                        className={classNames(
                                                                            active ? 'text-white' : 'text-blue-600',
                                                                            'absolute inset-y-0 right-0 flex items-center pr-4',
                                                                        )}
                                                                    >
                                                                        <CheckIcon
                                                                            className="w-5 h-5"
                                                                            aria-hidden="true"
                                                                        />
                                                                    </span>
                                                                ) : null}
                                                            </>
                                                        )}
                                                    </Listbox.Option>
                                                ))}
                                            </Listbox.Options>
                                        </Transition>
                                    </div>
                                </>
                            )}
                        </Listbox>
                    </div>

                    <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                        <div className="flex-1"></div>
                        <button
                            type="submit"
                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Create Invoice
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

CreateInvoice.authenticationEnabled = true;

type LoadCardProps = {
    load: ExpandedLoad;
};

const LoadCard: React.FC<Props> = ({ load }: LoadCardProps) => {
    return (
        <div className="overflow-hidden rounded-lg outline-none bg-gray-50 ring-2 ring-offset-2 ring-gray-200">
            <div className="px-5 py-3">
                <div className="flex items-center">
                    <div className="flex-shrink-0 hidden md:block">
                        <TruckIcon className="text-gray-400 w-7 h-7" aria-hidden="true" />
                    </div>
                    <div className="flex-1 w-0 ml-0 md:ml-5">
                        <dl className="space-y-1">
                            <dt className="flex">
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-500 truncate">
                                        Load Ref: # {load.refNum}
                                    </div>
                                    <div>
                                        <div className="text-lg font-medium text-gray-900">{load.customer.name}</div>
                                    </div>
                                </div>
                                <div className="text-lg font-medium">${load.rate}</div>
                            </dt>
                            <dd>
                                <div className="flow-root">
                                    <ul role="list" className="-mb-8">
                                        <li>
                                            <div className="relative pb-3">
                                                <span
                                                    className="absolute top-4 left-3 -ml-px h-full w-0.5 bg-gray-500"
                                                    aria-hidden="true"
                                                />
                                                <div className="relative flex items-start space-x-1">
                                                    <>
                                                        <div className="relative flex items-center justify-center w-6 h-6 px-1">
                                                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs text-gray-500">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {new Intl.DateTimeFormat('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: '2-digit',
                                                                    }).format(new Date(load.shipper.date))}
                                                                </span>
                                                                <div className="block md:hidden">
                                                                    {load.shipper.city}, {load.shipper.state}
                                                                </div>
                                                                <div className="hidden md:block">
                                                                    {load.shipper.name} {load.shipper.street}{' '}
                                                                    {load.shipper.city}, {load.shipper.state}{' '}
                                                                    {load.shipper.zip}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                </div>
                                            </div>
                                        </li>
                                        {load.stops && load.stops.length > 0 && (
                                            <li className="hidden md:block">
                                                <div className="relative pb-3">
                                                    <span
                                                        className="absolute top-4 left-3 -ml-px h-full w-0.5 bg-gray-500"
                                                        aria-hidden="true"
                                                    />
                                                    <div className="relative flex items-center space-x-1">
                                                        <div className="relative flex items-center justify-center w-6 h-6 px-1">
                                                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border-[1px] border-gray-300 bg-gray-50 text-gray-800">
                                                                {load.stops.length} Stops
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        )}
                                        <li>
                                            <div className="relative pb-8">
                                                <div className="relative flex items-start space-x-1">
                                                    <>
                                                        <div className="relative flex items-center justify-center w-6 h-6 px-1">
                                                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs text-gray-500">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {new Intl.DateTimeFormat('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: '2-digit',
                                                                    }).format(new Date(load.receiver.date))}
                                                                </span>
                                                                <div className="block md:hidden">
                                                                    {load.receiver.city}, {load.receiver.state}
                                                                </div>
                                                                <div className="hidden md:block">
                                                                    {load.receiver.name} {load.receiver.street}{' '}
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
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateInvoice;
