import React from 'react';
import Layout from '../../components/layout/Layout';
import { LoadStopType } from '@prisma/client';
import BreadCrumb from '../../components/layout/BreadCrumb';
import LoadFormStop from '../../components/load-form/loadFormStop';

const CreateLoad: React.FC = () => {
    const [stops, setStops] = React.useState<number>(0);

    const removeStop = (index: number) => {
        setStops(stops - 1);
    };

    return (
        <Layout>
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb className="sm:px-6 md:px-8"></BreadCrumb>
                <div className="px-5 mt-4 sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Load</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <div className="py-4">
                        <div className="relative mt-3 md:mt-0 md:col-span-2">
                            <form action="#" method="POST">
                                <div className="grid grid-cols-6 gap-6">
                                    <div className="col-span-6">
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
                                        <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
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
                                                className="block w-full pr-12 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pl-7 sm:text-sm"
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

                                    {[...Array(stops)].map((x, i) => (
                                        <LoadFormStop
                                            key={i}
                                            type={LoadStopType.STOP}
                                            totalStops={stops}
                                            index={i}
                                            onRemoveStop={removeStop}
                                        />
                                    ))}

                                    <div className="col-span-6">
                                        <a
                                            onClick={() => {
                                                setStops(stops + 1);
                                            }}
                                        >
                                            + Add Stop
                                        </a>
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
            </div>
        </Layout>
    );
};

export default CreateLoad;
