import { Carrier, SubscriptionPlan } from '@prisma/client';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { notify } from '../../components/Notification';
import { PageWithAuth } from '../../interfaces/auth';
import { createNewCarrier, isCarrierCodeUnique } from '../../lib/rest/carrier';
import { createCheckoutSession } from '../../lib/rest/stripe';
import { RadioGroup } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/20/solid';

const CarrierSetup: PageWithAuth = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [plan, setPlan] = useState<SubscriptionPlan>(SubscriptionPlan.BASIC);
    const formHook = useForm<Carrier>();
    const { replace } = useRouter();
    const { update } = useSession();

    const countryOptions = ['United States', 'Canada', 'Mexico'];
    const planOptions = [
        { id: SubscriptionPlan.BASIC, title: 'Basic Plan', description: 'Basic features', users: 'Free' },
        { id: SubscriptionPlan.PRO, title: 'Pro Plan', description: 'Advanced features', users: '$20/month' },
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

    const generateCarrierCode = (name: string) => {
        const code = name.substring(0, 3).toLowerCase() + Math.floor(Math.random() * 1000).toString();
        return code;
    };

    const handleCarrierCode = async (name: string) => {
        let code = generateCarrierCode(name);
        let isUnique = await isCarrierCodeUnique(code);
        while (!isUnique) {
            code = generateCarrierCode(name);
            isUnique = await isCarrierCodeUnique(code);
        }
        formHook.setValue('carrierCode', code);
    };

    const onSubmit = async (data: Carrier) => {
        setIsLoading(true);
        try {
            const isUnique = await isCarrierCodeUnique(data.carrierCode);

            if (!isUnique) {
                notify({ title: 'Carrier code is not unique', type: 'error' });
                setIsLoading(false);
                return;
            }

            const carrier = await createNewCarrier(data);

            if (carrier) {
                if (plan === SubscriptionPlan.PRO) {
                    const url = await createCheckoutSession(SubscriptionPlan.PRO, data.email);
                    window.location.href = url;
                } else {
                    notify({ title: 'Carrier created successfully', type: 'success' });
                    await update();
                    await replace('/');
                }
            } else {
                notify({ title: 'Failed to create carrier', type: 'error' });
                setIsLoading(false);
            }
        } catch (error) {
            notify({ title: error.message, type: 'error' });
            setIsLoading(false);
        }
    };

    const handleLogout = (e) => {
        e.preventDefault();
        signOut({
            callbackUrl: '/',
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600">
            <button
                onClick={handleLogout}
                className="absolute px-4 py-2 font-medium text-blue-600 bg-white rounded-lg shadow-sm top-4 right-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-3 focus:ring-white"
            >
                Logout
            </button>

            <div className="container px-4 py-8 mx-auto max-w-7xl">
                <div className="max-w-3xl px-8 py-10 mx-auto bg-white shadow-xl rounded-2xl">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-gray-900">Set Up Your Carrier Account</h1>
                        <p className="mt-2 text-gray-600">Please fill in your carrier information to get started</p>
                    </div>

                    <form onSubmit={formHook.handleSubmit(onSubmit)} className="space-y-8">
                        {/* Company Information Section */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                {fields
                                    .filter((f) => ['name', 'email', 'phone'].includes(f.id))
                                    .map((field) => (
                                        <div key={field.id}>
                                            <label
                                                htmlFor={field.id}
                                                className="block text-sm font-medium text-gray-700"
                                            >
                                                {field.label}{' '}
                                                {field.required && <span className="text-red-500">*</span>}
                                            </label>
                                            <input
                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                id={field.id}
                                                type="text"
                                                {...formHook.register(field.id, {
                                                    required: field.required ? `${field.label} is required` : false,
                                                    onBlur:
                                                        field.id === 'name'
                                                            ? async (e) => {
                                                                  if (e.target.value.trim() !== '') {
                                                                      handleCarrierCode(e.target.value);
                                                                  }
                                                              }
                                                            : undefined,
                                                })}
                                            />
                                            {formHook.formState.errors[field.id] && (
                                                <p className="mt-1 text-sm text-red-600">
                                                    {formHook.formState.errors[field.id].message}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Registration Numbers Section */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Registration Info</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                {fields
                                    .filter((f) => ['mcNum', 'dotNum', 'carrierCode'].includes(f.id))
                                    .map((field) => (
                                        <div key={field.id}>
                                            <label
                                                htmlFor={field.id}
                                                className="block text-sm font-medium text-gray-700"
                                            >
                                                {field.label}{' '}
                                                {field.required && <span className="text-red-500">*</span>}
                                                {field.id === 'carrierCode' && (
                                                    <span className="ml-2 text-sm text-gray-500">
                                                        (Driver login code)
                                                    </span>
                                                )}
                                            </label>
                                            <input
                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                id={field.id}
                                                type="text"
                                                {...formHook.register(field.id, {
                                                    required: field.required ? `${field.label} is required` : false,
                                                })}
                                            />
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Address Section */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Address</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                {fields
                                    .filter((f) => ['street', 'city', 'state', 'zip', 'country'].includes(f.id))
                                    .map((field) => (
                                        <div key={field.id} className={field.id === 'street' ? 'md:col-span-2' : ''}>
                                            <label
                                                htmlFor={field.id}
                                                className="block text-sm font-medium text-gray-700"
                                            >
                                                {field.label}{' '}
                                                {field.required && <span className="text-red-500">*</span>}
                                            </label>
                                            {field.type === 'select' ? (
                                                <select
                                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    id={field.id}
                                                    {...formHook.register(field.id)}
                                                >
                                                    {countryOptions.map((country) => (
                                                        <option key={country} value={country}>
                                                            {country}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    id={field.id}
                                                    type="text"
                                                    {...formHook.register(field.id, {
                                                        required: field.required ? `${field.label} is required` : false,
                                                    })}
                                                />
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Subscription Plan Section */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Select a Plan</h2>
                            <RadioGroup value={plan} onChange={setPlan} className="grid gap-4 mt-4 md:grid-cols-2">
                                {planOptions.map((planOption) => (
                                    <RadioGroup.Option
                                        key={planOption.id}
                                        value={planOption.id}
                                        className={({ checked, active }) =>
                                            `relative flex cursor-pointer rounded-lg p-6 shadow-sm focus:outline-none
                                            ${
                                                checked
                                                    ? 'bg-blue-50 border-2 border-blue-500'
                                                    : 'border border-gray-300'
                                            }
                                            ${active ? 'ring-2 ring-blue-500' : ''}
                                            hover:border-blue-500 transition-colors`
                                        }
                                    >
                                        {({ checked }) => (
                                            <>
                                                <div className="flex flex-1">
                                                    <div className="flex flex-col">
                                                        <RadioGroup.Label
                                                            as="span"
                                                            className="block text-lg font-medium text-gray-900"
                                                        >
                                                            {planOption.title}
                                                        </RadioGroup.Label>
                                                        <RadioGroup.Description
                                                            as="span"
                                                            className="mt-2 text-sm text-gray-500"
                                                        >
                                                            {planOption.description}
                                                        </RadioGroup.Description>
                                                        <RadioGroup.Description
                                                            as="span"
                                                            className="mt-4 text-lg font-medium text-gray-900"
                                                        >
                                                            {planOption.users}
                                                        </RadioGroup.Description>
                                                    </div>
                                                </div>
                                                {checked && (
                                                    <CheckCircleIcon
                                                        className="w-6 h-6 text-blue-600"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </>
                                        )}
                                    </RadioGroup.Option>
                                ))}
                            </RadioGroup>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors
                                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'Creating...' : 'Create Carrier'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

CarrierSetup.authenticationEnabled = true;

export default CarrierSetup;
