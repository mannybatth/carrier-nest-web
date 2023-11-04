import { Carrier } from '@prisma/client';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { notify } from '../../components/Notification';
import { PageWithAuth } from '../../interfaces/auth';
import { createNewCarrier, isCarrierCodeUnique } from '../../lib/rest/carrier';

const CarrierSetup: PageWithAuth = () => {
    const [isLoading, setIsLoading] = useState(false); // add this state
    const formHook = useForm<Carrier>();
    const { replace } = useRouter();
    const { update } = useSession();

    const countryOptions = ['United States', 'Canada', 'Mexico']; // Add or fetch your country list here

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

    // Add a function to generate a carrier code based on the company name
    const generateCarrierCode = (name: string) => {
        const code = name.substring(0, 3).toLowerCase() + Math.floor(Math.random() * 1000).toString();
        return code;
    };

    // Add a function to check for uniqueness and set the carrier code
    const handleCarrierCode = async (name: string) => {
        console.log('handleCarrierCode', name);
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
                return;
            }

            const carrier = await createNewCarrier(data);

            if (carrier) {
                notify({ title: 'Carrier created successfully', type: 'success' });
                await update();
                await replace('/');
            }
        } catch (error) {
            notify({ title: error.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = (e) => {
        e.preventDefault();
        signOut();
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-blue-500">
            <button
                onClick={handleLogout}
                className="absolute px-4 py-2 font-bold text-white bg-blue-700 border border-transparent rounded-md shadow-sm top-4 right-4 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700"
            >
                Logout
            </button>
            <div className="w-full max-w-lg px-10 py-10 my-10 mb-4 bg-white rounded-lg shadow-2xl">
                <div className="flex flex-col mb-4">
                    <div className="flex justify-center">
                        <h1 className="mb-6 text-4xl font-semibold text-gray-800">Carrier Setup</h1>
                    </div>
                    <form onSubmit={formHook.handleSubmit(onSubmit)}>
                        {fields.map((field) => (
                            <div key={field.id} className="mb-4">
                                <label htmlFor={field.id} className="block mb-2 text-sm font-bold text-gray-700">
                                    {field.label} {field.required && <span className="text-red-600">*</span>}
                                    {field.id === 'carrierCode' && (
                                        <span className="ml-2 text-sm text-right text-gray-500">
                                            (Used by the driver to login)
                                        </span>
                                    )}
                                </label>
                                {field.type === 'input' ? (
                                    <input
                                        className={
                                            formHook.formState.errors[field.id]
                                                ? 'w-full px-3 py-2 leading-tight text-gray-700 border-red-600 rounded shadow appearance-none focus:outline-none focus:shadow-outline-red'
                                                : 'w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow appearance-none focus:outline-none focus:shadow-outline'
                                        }
                                        id={field.id}
                                        type="text"
                                        {...formHook.register(field.id, {
                                            required: field.required ? field.label + ' is required' : false,
                                            onBlur:
                                                field.id === 'name' &&
                                                (async (e) => {
                                                    if (e.target.value.trim() !== '') {
                                                        handleCarrierCode(e.target.value);
                                                    }
                                                }),
                                        })}
                                    />
                                ) : (
                                    <select
                                        className={
                                            formHook.formState.errors[field.id]
                                                ? 'w-full px-3 py-2 leading-tight text-gray-700 border-red-600 rounded shadow appearance-none focus:outline-none focus:shadow-outline-red'
                                                : 'w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow appearance-none focus:outline-none focus:shadow-outline'
                                        }
                                        id={field.id}
                                        {...formHook.register(field.id, {
                                            required: field.required ? field.label + ' is required' : false,
                                        })}
                                    >
                                        {countryOptions.map((country) => (
                                            <option key={country} value={country}>
                                                {country}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {formHook.formState.errors[field.id] && (
                                    <p className="mt-2 text-sm text-red-600">
                                        {formHook.formState.errors[field.id].message}
                                    </p>
                                )}
                            </div>
                        ))}
                        <div className="flex items-center justify-between mt-8">
                            <button
                                type="submit"
                                disabled={isLoading} // disable button during loading
                                className={`w-full px-4 py-2 font-bold text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                    isLoading ? 'opacity-50' : ''
                                }`}
                            >
                                {isLoading ? 'Creating...' : 'Create New Carrier'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

CarrierSetup.authenticationEnabled = true;

export default CarrierSetup;
