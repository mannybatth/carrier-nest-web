import React, { useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Customer, LoadStopType } from '@prisma/client';
import BreadCrumb from '../../components/layout/BreadCrumb';
import LoadFormStop from '../../components/load-form/LoadFormStop';
import { SimpleLoad, SimpleLoadStop } from '../../interfaces/models';
import { CheckIcon, PlusSmIcon, SelectorIcon } from '@heroicons/react/outline';
import { debounceTime, Subject } from 'rxjs';
import { searchCustomersByName } from '../../lib/rest/customer';
import { Combobox } from '@headlessui/react';
import classNames from 'classnames';
import { ComponentWithAuth } from '../../interfaces/auth';

const CreateLoad: ComponentWithAuth = () => {
    const [load, setLoad] = React.useState<SimpleLoad>(null);
    const [stops, setStops] = React.useState<SimpleLoadStop[]>([]);

    const [searchCustomers, setSearchCustomers] = React.useState<Customer[]>([]);
    const [customerSearchLoading, setCustomerSearchLoading] = React.useState<boolean>(false);
    const [customerSearchSubject] = React.useState(() => new Subject<string>());
    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer>(null);

    useEffect(() => {
        const subscription = customerSearchSubject.pipe(debounceTime(1000)).subscribe(async (query: string) => {
            setCustomerSearchLoading(false);
            if (!query) {
                setSearchCustomers([]);
                return;
            }
            const customers = await searchCustomersByName(query);
            setSearchCustomers(customers);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const onCustomerSearchChange = (query: string) => {
        setCustomerSearchLoading(true);
        customerSearchSubject.next(query);
    };

    const addStop = () => {
        setStops([
            ...stops,
            {
                type: LoadStopType.STOP,
                name: `${stops.length + 1}`,
                street: '',
                city: '',
                state: '',
                zip: '',
                country: '',
                date: new Date(),
                time: '',
            },
        ]);
    };

    const removeStop = (index: number) => {
        setStops(stops.filter((_, i) => i !== index));
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Create New Load</h1>}>
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb className="sm:px-6 md:px-8"></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Load</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <div className="relative mt-3 md:mt-0 md:col-span-2">
                        <form action="#" method="POST">
                            <div className="grid grid-cols-6 gap-6">
                                <div className="col-span-6">
                                    <Combobox as="div" value={selectedCustomer} onChange={setSelectedCustomer}>
                                        <Combobox.Label className="block text-sm font-medium text-gray-700">
                                            Assigned to
                                        </Combobox.Label>
                                        <div className="relative mt-1">
                                            <Combobox.Input
                                                autoComplete="off"
                                                className="w-full py-2 pl-3 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                                                onChange={(e) => onCustomerSearchChange(e.target.value)}
                                                displayValue={(customer: Customer) => customer?.name || null}
                                            />
                                            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center px-2 rounded-r-md focus:outline-none">
                                                <SelectorIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                                            </Combobox.Button>

                                            {searchCustomers.length > 0 && (
                                                <Combobox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                                    {searchCustomers.map((customer) => (
                                                        <Combobox.Option
                                                            key={customer.id}
                                                            value={customer}
                                                            className={({ active }) =>
                                                                classNames(
                                                                    'relative cursor-default select-none py-2 pl-3 pr-9',
                                                                    active
                                                                        ? 'bg-indigo-600 text-white'
                                                                        : 'text-gray-900',
                                                                )
                                                            }
                                                        >
                                                            {({ active, selected }) => (
                                                                <>
                                                                    <span
                                                                        className={classNames(
                                                                            'block truncate',
                                                                            selected && 'font-semibold',
                                                                        )}
                                                                    >
                                                                        {customer.name}
                                                                    </span>

                                                                    {selected && (
                                                                        <span
                                                                            className={classNames(
                                                                                'absolute inset-y-0 right-0 flex items-center pr-4',
                                                                                active
                                                                                    ? 'text-white'
                                                                                    : 'text-indigo-600',
                                                                            )}
                                                                        >
                                                                            <CheckIcon
                                                                                className="w-5 h-5"
                                                                                aria-hidden="true"
                                                                            />
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </Combobox.Option>
                                                    ))}
                                                </Combobox.Options>
                                            )}
                                        </div>
                                    </Combobox>
                                </div>

                                <div className="col-span-6 sm:col-span-3">
                                    <label htmlFor="reference-num" className="block text-sm font-medium text-gray-700">
                                        Reference #
                                    </label>
                                    <input
                                        type="text"
                                        name="reference-num"
                                        id="reference-num"
                                        autoComplete="reference-num"
                                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>

                                <div className="col-span-6 sm:col-span-3">
                                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                                        Rate
                                    </label>
                                    <div className="relative mt-1 rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm">$</span>
                                        </div>
                                        <input
                                            type="text"
                                            name="price"
                                            id="price"
                                            className="block w-full pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pl-7 sm:text-sm"
                                            placeholder="0.00"
                                            aria-describedby="price-currency"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm" id="price-currency">
                                                USD
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <LoadFormStop type={LoadStopType.SHIPPER} />

                                {stops.map((x, i) => (
                                    <LoadFormStop
                                        key={i}
                                        type={LoadStopType.STOP}
                                        totalStops={stops.length}
                                        index={i}
                                        onRemoveStop={() => removeStop(i)}
                                    />
                                ))}

                                <div className="col-span-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                            <div className="w-full border-t border-gray-300" />
                                        </div>
                                        <div className="relative flex justify-center">
                                            <button
                                                type="button"
                                                className="inline-flex items-center px-4 py-0.5 text-xs font-medium leading-5 text-gray-700 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                onClick={() => {
                                                    addStop();
                                                }}
                                            >
                                                <PlusSmIcon
                                                    className="-ml-1.5 mr-1 h-4 w-4 text-gray-400"
                                                    aria-hidden="true"
                                                />
                                                <span>Add Stop</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <LoadFormStop type={LoadStopType.RECEIVER} />
                            </div>
                        </form>
                    </div>
                    <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                        <div className="flex-1"></div>
                        <button
                            type="submit"
                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Create Load
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

CreateLoad.authenticationEnabled = true;

export default CreateLoad;