import React from 'react';
import Layout from '../../components/layout/Layout';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import { CalendarIcon, ClockIcon } from '@heroicons/react/outline';
import TimeInput from '../../components/TimeInput';

const CreateLoad: React.FC = () => {
    return (
        <Layout>
            <div className="py-6">
                <div className="px-5 mx-auto max-w-7xl sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Load</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 mx-auto max-w-7xl sm:px-6 md:px-8">
                    <div className="py-4">
                        <div className="relative mt-3 md:mt-0 md:col-span-2">
                            <form action="#" method="POST">
                                <div className="grid grid-cols-6 gap-6">
                                    <div className="col-span-6 sm:col-span-3">
                                        <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
                                            Customer
                                        </label>
                                        <input
                                            type="text"
                                            name="customer"
                                            id="customer"
                                            autoComplete="customer-name"
                                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="col-span-6 sm:col-span-3">
                                        <label
                                            htmlFor="reference-num"
                                            className="block text-sm font-medium text-gray-700"
                                        >
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
                                        <label
                                            htmlFor="business-name"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Business Name
                                        </label>
                                        <input
                                            type="text"
                                            name="business-name"
                                            id="business-name"
                                            autoComplete="business-name"
                                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="col-span-6 sm:col-span-3">
                                        <label
                                            htmlFor="street-address"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Street Address
                                        </label>
                                        <input
                                            type="text"
                                            name="street-address"
                                            id="street-address"
                                            autoComplete="street-address"
                                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="col-span-6 sm:col-span-6 lg:col-span-2">
                                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                                            City
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            id="city"
                                            autoComplete="address-level2"
                                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                                        <label htmlFor="region" className="block text-sm font-medium text-gray-700">
                                            State / Province
                                        </label>
                                        <input
                                            type="text"
                                            name="region"
                                            id="region"
                                            autoComplete="state"
                                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                                        <label
                                            htmlFor="postal-code"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            ZIP / Postal Code
                                        </label>
                                        <input
                                            type="text"
                                            name="postal-code"
                                            id="postal-code"
                                            autoComplete="postal-code"
                                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="col-span-6 sm:col-span-3">
                                        <label
                                            htmlFor="pick-up-date"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Pick Up Date
                                        </label>
                                        <div className="relative mt-1">
                                            <DayPickerInput inputProps={{ type: 'text', id: 'pick-up-date' }} />
                                            <div className="absolute right-0 flex items-center pr-3 pointer-events-none inset-y-1">
                                                <CalendarIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-6 sm:col-span-3">
                                        <label
                                            htmlFor="pick-up-time"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Pick Up Time
                                        </label>

                                        <div className="relative mt-1">
                                            {/* <input
                                                type="text"
                                                name="pick-up-time"
                                                id="pick-up-time"
                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            /> */}
                                            <TimeInput
                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                initialTime="13:37"
                                                onChange={(event) => console.log(event)}
                                            />
                                            <div className="absolute right-0 flex items-center pr-3 pointer-events-none inset-y-1">
                                                <ClockIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <div className="sticky bottom-0 flex px-8 py-4 bg-white border-t-2 border-neutral-200">
                <div className="flex-1"></div>
                <button
                    type="submit"
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Create
                </button>
            </div>
        </Layout>
    );
};

export default CreateLoad;
