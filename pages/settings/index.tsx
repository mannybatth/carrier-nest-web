'use client';

import React, { useEffect, useState } from 'react';
import type { Carrier } from '@prisma/client';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import Layout from '../../components/layout/Layout';
import type { PageWithAuth } from '../../interfaces/auth';
import { updateCarrier } from '../../lib/rest/carrier';
import SettingsPageSkeleton from '../../components/skeletons/SettingsPageSkeleton';
import { notify } from '../../components/Notification';
import { useUserContext } from '../../components/context/UserContext';
import type { ExpandedCarrier } from 'interfaces/models';
import { InformationCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const SettingsPage: PageWithAuth = () => {
    const { setCarriers, defaultCarrier, setDefaultCarrier } = useUserContext();
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isDirty },
    } = useForm<Carrier>();
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    // Group fields by category for better organization
    const fieldGroups = [
        {
            id: 'company',
            title: 'Company',
            description: 'Update your company information and contact details',
            fields: [
                { id: 'name' as keyof Carrier, label: 'Company Name', required: true, type: 'input' },
                { id: 'email' as keyof Carrier, label: 'Contact Email', required: true, type: 'input' },
                { id: 'phone' as keyof Carrier, label: 'Phone Number', required: true, type: 'input' },
            ],
        },
        {
            id: 'regulatory',
            title: 'Regulatory',
            description: 'Manage your regulatory information and carrier code',
            fields: [
                { id: 'mcNum' as keyof Carrier, label: 'MC Number', required: false, type: 'input' },
                { id: 'dotNum' as keyof Carrier, label: 'DOT Number', required: false, type: 'input' },
                {
                    id: 'carrierCode' as keyof Carrier,
                    label: 'Carrier Code',
                    required: true,
                    type: 'input',
                    disabled: true,
                    hint: 'This code is used by drivers to sign in to the driver app. It cannot be changed.',
                    icon: <LockClosedIcon className="w-4 h-4 text-gray-400" />,
                },
            ],
        },
        {
            id: 'address',
            title: 'Address',
            description: "Update your company's physical address",
            fields: [
                { id: 'street' as keyof Carrier, label: 'Street Address', required: true, type: 'input' },
                { id: 'city' as keyof Carrier, label: 'City', required: true, type: 'input' },
                { id: 'state' as keyof Carrier, label: 'State', required: true, type: 'input' },
                { id: 'zip' as keyof Carrier, label: 'Zip Code', required: true, type: 'input' },
                { id: 'country' as keyof Carrier, label: 'Country', required: true, type: 'select' },
            ],
        },
    ];

    const countryOptions = ['United States', 'Canada', 'Mexico'];

    useEffect(() => {
        if (defaultCarrier) {
            applyCarrierToForm(defaultCarrier);
        }
    }, [defaultCarrier]);

    const applyCarrierToForm = (carrier: ExpandedCarrier) => {
        if (carrier) {
            // Flatten all fields from all groups
            const allFields = fieldGroups.flatMap((group) => group.fields);

            allFields.forEach((field) => {
                const value = carrier[field.id];
                if (value !== undefined) {
                    setValue(field.id, value);
                }
            });
        }
    };

    const onSubmit = async (data: Carrier) => {
        try {
            setSaving(true);

            // Ensure we're using the original carrier code
            if (defaultCarrier) {
                data.carrierCode = defaultCarrier.carrierCode;
            }

            const newCarrier = await updateCarrier(defaultCarrier?.id, data);

            notify({
                title: 'Changes Saved',
                message: 'Your settings have been updated successfully',
                type: 'success',
            });

            setCarriers((prevCarriers) => {
                const index = prevCarriers.findIndex((carrier) => carrier.id === newCarrier.id);
                const newCarriers = [...prevCarriers];
                newCarriers[index] = newCarrier;
                return newCarriers;
            });

            setDefaultCarrier(newCarrier);
            setSaving(false);
        } catch (error) {
            notify({ title: error.message, type: 'error' });
            setSaving(false);
        }
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-medium text-gray-900">Settings</h1>
                </div>
            }
        >
            <div className="max-w-3xl py-6 mx-auto">
                {defaultCarrier ? (
                    <div className="px-4 sm:px-6 md:px-8">
                        <div className="mb-8">
                            <h1 className="text-3xl font-medium text-gray-900">Settings</h1>
                            <p className="mt-2 text-lg text-gray-500">Manage your carrier information</p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="space-y-10">
                                {fieldGroups.map((group) => (
                                    <div
                                        key={group.id}
                                        className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
                                        id={group.id}
                                    >
                                        <div className="px-8 py-6 border-b border-gray-100">
                                            <h2 className="text-xl font-medium text-gray-900">{group.title}</h2>
                                            <p className="mt-1 text-sm text-gray-500">{group.description}</p>
                                        </div>

                                        <div className="px-8 py-6">
                                            <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
                                                {group.fields.map((field) => (
                                                    <div
                                                        key={field.id}
                                                        className={field.id === 'street' ? 'sm:col-span-2' : ''}
                                                    >
                                                        <label
                                                            htmlFor={field.id}
                                                            className="block text-sm font-medium text-gray-700 mb-1"
                                                        >
                                                            {field.label}
                                                            {field.required && (
                                                                <span className="text-red-400 ml-0.5">*</span>
                                                            )}
                                                        </label>

                                                        <div className="relative">
                                                            {field.type === 'input' ? (
                                                                <>
                                                                    <div className="relative">
                                                                        {field.icon && (
                                                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                                                {field.icon}
                                                                            </div>
                                                                        )}
                                                                        <input
                                                                            type="text"
                                                                            id={field.id}
                                                                            disabled={field.disabled}
                                                                            {...register(field.id, {
                                                                                required: field.required
                                                                                    ? `${field.label} is required`
                                                                                    : false,
                                                                            })}
                                                                            className={`
                                        block w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-gray-900
                                        shadow-sm ring-1 ring-inset ring-gray-200
                                        placeholder:text-gray-400
                                        focus:ring-2 focus:ring-inset focus:ring-gray-900
                                        transition-all duration-200
                                        ${field.icon ? 'pl-10' : ''}
                                        ${errors[field.id] ? 'ring-red-300 focus:ring-red-500' : ''}
                                        ${
                                            field.disabled
                                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-75'
                                                : ''
                                        }
                                      `}
                                                                        />
                                                                    </div>
                                                                </>
                                                            ) : field.type === 'select' ? (
                                                                <select
                                                                    id={field.id}
                                                                    disabled={field.disabled}
                                                                    {...register(field.id, {
                                                                        required: field.required
                                                                            ? `${field.label} is required`
                                                                            : false,
                                                                    })}
                                                                    className={`
                                    block w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-gray-900
                                    shadow-sm ring-1 ring-inset ring-gray-200
                                    focus:ring-2 focus:ring-inset focus:ring-gray-900
                                    transition-all duration-200
                                    ${errors[field.id] ? 'ring-red-300 focus:ring-red-500' : ''}
                                    ${field.disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-75' : ''}
                                  `}
                                                                >
                                                                    {countryOptions.map((option) => (
                                                                        <option key={option} value={option}>
                                                                            {option}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : null}
                                                        </div>

                                                        {field.hint && (
                                                            <div className="mt-2 flex items-start">
                                                                {field.id === 'carrierCode' && (
                                                                    <div className="flex-shrink-0 mt-0.5">
                                                                        <InformationCircleIcon className="h-4 w-4 text-blue-500" />
                                                                    </div>
                                                                )}
                                                                <p
                                                                    className={`text-sm ${
                                                                        field.id === 'carrierCode'
                                                                            ? 'text-blue-700 ml-2'
                                                                            : 'text-gray-500'
                                                                    }`}
                                                                >
                                                                    {field.hint}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {field.id === 'carrierCode' && (
                                                            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                                                <div className="flex">
                                                                    <div className="flex-shrink-0">
                                                                        <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                                                                    </div>
                                                                    <div className="ml-3">
                                                                        <h3 className="text-sm font-medium text-blue-800">
                                                                            Driver Sign-In Information
                                                                        </h3>
                                                                        <div className="mt-1 text-sm text-blue-700">
                                                                            <p>
                                                                                This carrier code is required for
                                                                                drivers to sign in to the driver app.
                                                                                Please share this code with your
                                                                                drivers.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {errors[field.id] && (
                                                            <p className="mt-1.5 text-sm text-red-500">
                                                                {errors[field.id].message}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="sticky bottom-0 mt-8 py-4 bg-white/80 backdrop-blur-md border-t border-gray-100">
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!isDirty || saving}
                                        className={`
                      inline-flex items-center justify-center ml-3 px-5 py-2.5 text-sm font-medium text-white
                      rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200
                      ${
                          isDirty && !saving
                              ? 'bg-gray-900 hover:bg-gray-800 focus:ring-gray-900'
                              : 'bg-gray-400 cursor-not-allowed'
                      }
                    `}
                                    >
                                        {saving ? (
                                            <>
                                                <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                        fill="none"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    />
                                                </svg>
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="mt-10 mb-16">
                            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                <div className="px-8 py-6 border-b border-gray-100">
                                    <h2 className="text-xl font-medium text-red-500">Danger Zone</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Permanent actions that cannot be undone
                                    </p>
                                </div>
                                <div className="px-8 py-6">
                                    <button
                                        type="button"
                                        className="px-5 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
                                    >
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <SettingsPageSkeleton />
                )}
            </div>
        </Layout>
    );
};

SettingsPage.authenticationEnabled = true;

export default SettingsPage;
