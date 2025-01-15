import React, { useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { Carrier } from '@prisma/client';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import Layout from '../../components/layout/Layout';
import { PageWithAuth } from '../../interfaces/auth';
import { isCarrierCodeUnique, updateCarrier } from '../../lib/rest/carrier';
import SettingsPageSkeleton from '../../components/skeletons/SettingsPageSkeleton';
import { notify } from '../../components/Notification';
import { useUserContext } from '../../components/context/UserContext';
import { ExpandedCarrier } from 'interfaces/models';

const SettingsPage: PageWithAuth = () => {
    const { setCarriers, defaultCarrier, setDefaultCarrier } = useUserContext();
    const { register, handleSubmit, setValue, formState } = useForm<Carrier>();
    const router = useRouter();

    const navigation = [
        { name: 'Edit Carrier', href: '/settings?page=carrier' },
        // { name: 'Switch Carrier', href: '/settings?page=switchcarrier' },
        // { name: 'Delete Account', href: '/settings?page=deleteaccount' },
    ];

    const fields: Array<{ id: keyof Carrier; label: string; required: boolean; type: string }> = [
        { id: 'name', label: 'Company Name', required: true, type: 'input' },
        { id: 'email', label: 'Contact Email', required: true, type: 'input' },
        { id: 'phone', label: 'Phone Number', required: true, type: 'input' },
        { id: 'mcNum', label: 'MC Number', required: false, type: 'input' },
        { id: 'dotNum', label: 'DOT Number', required: false, type: 'input' },
        { id: 'street', label: 'Street Address', required: true, type: 'input' },
        { id: 'city', label: 'City', required: true, type: 'input' },
        { id: 'state', label: 'State', required: true, type: 'input' },
        { id: 'zip', label: 'Zip Code', required: true, type: 'input' },
        { id: 'country', label: 'Country', required: true, type: 'select' },
        { id: 'carrierCode', label: 'Carrier Code', required: true, type: 'input' },
    ];

    const countryOptions = ['United States', 'Canada', 'Mexico']; // Add or fetch your country list here

    const queryToIndex = (queryPage: string) => {
        const index = navigation.findIndex((tab) => tab.name.toLowerCase().replace(' ', '') === queryPage);
        return index === -1 ? 0 : index;
    };

    const tabIndex = queryToIndex(router.query.page as string);

    useEffect(() => {
        applyCarrierToForm(defaultCarrier);
    }, [defaultCarrier]);

    const applyCarrierToForm = (carrier: ExpandedCarrier) => {
        if (carrier) {
            fields.forEach((field) => {
                const value = carrier[field.id];
                if (value) {
                    setValue(field.id, value);
                }
            });
        }
    };

    const onSubmit = async (data: Carrier) => {
        try {
            const didCarrierCodeChange = data.carrierCode !== defaultCarrier?.carrierCode;

            if (didCarrierCodeChange) {
                const isUnique = await isCarrierCodeUnique(data.carrierCode);

                if (!isUnique) {
                    notify({ title: 'Carrier code is not unique', type: 'error' });
                    return;
                }
            }

            const newCarrier = await updateCarrier(defaultCarrier?.id, data);

            notify({ title: 'Carrier updated', message: 'Carrier updated successfully' });

            setCarriers((prevCarriers) => {
                const index = prevCarriers.findIndex((carrier) => carrier.id === newCarrier.id);
                const newCarriers = [...prevCarriers];
                newCarriers[index] = newCarrier;
                return newCarriers;
            });

            setDefaultCarrier(newCarrier);
        } catch (error) {
            notify({ title: error.message, type: 'error' });
        }
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Settings</h1>
                </div>
            }
        >
            <div className="max-w-4xl py-2 mx-auto">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Settings</h1>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>

                <div className="mx-auto max-w-7xl lg:flex lg:gap-x-16 lg:px-8">
                    {defaultCarrier ? (
                        <Tab.Group vertical key={router.query.page as string} defaultIndex={tabIndex}>
                            <aside className="flex py-4 overflow-x-auto border-b border-gray-900/5 lg:block lg:w-64 lg:flex-none lg:border-0">
                                <Tab.List className="flex-none px-4 sm:px-6 lg:px-1">
                                    <ul role="list" className="flex gap-x-3 gap-y-1 whitespace-nowrap lg:flex-col">
                                        {navigation.map((item, index) => (
                                            <Link href={item.href} key={item.name}>
                                                <Tab
                                                    key={item.name}
                                                    className={({ selected }) =>
                                                        classNames(
                                                            selected
                                                                ? 'bg-gray-50 text-indigo-600'
                                                                : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                                            'flex w-full gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm leading-6 font-semibold',
                                                        )
                                                    }
                                                >
                                                    {item.name}
                                                </Tab>
                                            </Link>
                                        ))}
                                    </ul>
                                </Tab.List>
                            </aside>
                            <main className="px-4 py-4 sm:px-6 lg:flex-auto lg:px-0">
                                <div className="max-w-2xl mx-auto space-y-16 sm:space-y-20 lg:mx-0 lg:max-w-none">
                                    <Tab.Panels>
                                        <Tab.Panel>
                                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                                {fields.map(({ id, label, required, type }) => (
                                                    <div key={id}>
                                                        <label
                                                            htmlFor={id}
                                                            className="block text-sm font-medium text-gray-700"
                                                        >
                                                            {label}
                                                            {required && <span>*</span>}
                                                            {id === 'carrierCode' && (
                                                                <span className="ml-2 text-sm text-right text-gray-500">
                                                                    (Used by the driver to login)
                                                                </span>
                                                            )}
                                                        </label>
                                                        {type === 'input' ? (
                                                            <input
                                                                type="text"
                                                                id={id}
                                                                {...register(id, {
                                                                    required: required ? label + ' is required' : false,
                                                                })}
                                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            />
                                                        ) : type === 'select' ? (
                                                            <select
                                                                className="block w-full py-2 pl-3 pr-10 mt-1 text-base border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                                id={id}
                                                                {...register(id, {
                                                                    required: required ? label + ' is required' : false,
                                                                })}
                                                            >
                                                                {countryOptions.map((country) => (
                                                                    <option key={country} value={country}>
                                                                        {country}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : null}
                                                        {formState.errors[id] && (
                                                            <p className="mt-2 text-sm text-red-600">
                                                                {formState.errors[id].message}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                                <div className="flex w-full px-0 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                                                    <button
                                                        type="submit"
                                                        className="flex justify-center w-full px-10 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </form>
                                        </Tab.Panel>
                                        {/* <Tab.Panel>
                                            <h2 className="text-xl font-semibold">Switch Carrier</h2> */}
                                        {/* List of carriers and switch button */}
                                        {/* </Tab.Panel> */}
                                        {/* <Tab.Panel>
                                            <h2 className="text-xl font-semibold">Delete Account</h2> */}
                                        {/* Delete confirmation dialog */}
                                        {/* </Tab.Panel> */}
                                    </Tab.Panels>
                                </div>
                            </main>
                        </Tab.Group>
                    ) : (
                        <SettingsPageSkeleton></SettingsPageSkeleton>
                    )}
                </div>
            </div>
        </Layout>
    );
};

SettingsPage.authenticationEnabled = true;

export default SettingsPage;
