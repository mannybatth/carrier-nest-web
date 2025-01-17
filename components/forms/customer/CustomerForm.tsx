import React from 'react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { countryCodes } from '../../../interfaces/country-codes';
import { Customer } from '@prisma/client';

type Props = {
    formHook: UseFormReturn<Customer>;
    condensed?: boolean;
};

const CustomerForm: React.FC<Props> = ({
    formHook: {
        register,
        control,
        formState: { errors },
    },
    condensed,
}) => {
    return (
        <div className="relative mt-3 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-12 gap-6">
                {condensed ? (
                    <div className="col-span-12">
                        <label htmlFor="customer-name" className="block text-sm font-medium text-gray-700">
                            Name
                        </label>
                        <input
                            {...register('name', { required: 'Customer name is required' })}
                            type="text"
                            id="customer-name"
                            autoComplete="customer-name"
                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {errors.name && <p className="text-sm text-red-600">{errors.name?.message}</p>}
                    </div>
                ) : (
                    <>
                        <div className="col-span-12">
                            <label htmlFor="customer-name" className="block text-sm font-medium text-gray-700">
                                Name
                            </label>
                            <input
                                {...register('name', { required: 'Customer name is required' })}
                                type="text"
                                id="customer-name"
                                autoComplete="customer-name"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.name && <p className="text-sm text-red-600">{errors.name?.message}</p>}
                        </div>
                        <div className="col-span-12 lg:col-span-4">
                            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                                Contact Email
                            </label>
                            <input
                                {...register('contactEmail')}
                                type="text"
                                id="contactEmail"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.contactEmail && (
                                <p className="text-sm text-red-600">{errors.contactEmail?.message}</p>
                            )}
                        </div>
                        <div className="col-span-12 lg:col-span-4">
                            <label htmlFor="billingEmail" className="block text-sm font-medium text-gray-700">
                                Billing Email
                            </label>
                            <input
                                {...register('billingEmail')}
                                type="text"
                                id="billingEmail"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.billingEmail && (
                                <p className="text-sm text-red-600">{errors.billingEmail?.message}</p>
                            )}
                        </div>
                        <div className="col-span-12 lg:col-span-4">
                            <label htmlFor="paymentStatusEmail" className="block text-sm font-medium text-gray-700">
                                Payment Status Email
                            </label>
                            <input
                                {...register('paymentStatusEmail')}
                                type="text"
                                id="paymentStatusEmail"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.paymentStatusEmail && (
                                <p className="text-sm text-red-600">{errors.paymentStatusEmail?.message}</p>
                            )}
                        </div>
                        <div className="col-span-12 sm:col-span-6 lg:col-span-12">
                            <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                                Street Address
                            </label>
                            <input
                                {...register('street')}
                                type="text"
                                id="street"
                                autoComplete="off"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.street && <p className="text-sm text-red-600">{errors.street?.message}</p>}
                        </div>
                        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                                City
                            </label>
                            <input
                                {...register('city')}
                                type="text"
                                id="city"
                                autoComplete="off"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.city && <p className="text-sm text-red-600">{errors.city?.message}</p>}
                        </div>
                        <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                                State / Province
                            </label>
                            <input
                                {...register('state')}
                                type="text"
                                id="state"
                                autoComplete="off"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.state && <p className="text-sm text-red-600">{errors.state?.message}</p>}
                        </div>
                        <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                            <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                                Zip / Postal Code
                            </label>
                            <input
                                {...register('zip')}
                                type="text"
                                id="zip"
                                autoComplete="off"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.zip && <p className="text-sm text-red-600">{errors.zip?.message}</p>}
                        </div>
                        <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                            <Controller
                                control={control}
                                rules={{ required: 'Country is required' }}
                                name="country"
                                defaultValue="US"
                                render={({ field, fieldState: { error } }) => (
                                    <>
                                        <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                                            Country
                                        </label>
                                        <select
                                            {...field}
                                            className="block w-full py-2 pl-3 pr-10 mt-1 text-base border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            {countryCodes.map((countryCode) => (
                                                <option key={countryCode.code} value={countryCode.code}>
                                                    {countryCode.name}
                                                </option>
                                            ))}
                                        </select>
                                        {error && <p className="text-sm text-red-600">{error.message}</p>}
                                    </>
                                )}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CustomerForm;
