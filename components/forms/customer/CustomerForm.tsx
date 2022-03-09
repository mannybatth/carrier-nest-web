import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { SimpleCustomer } from '../../../interfaces/models';

export interface CustomerFormData {
    name: string;
}

type Props = {
    formHook: UseFormReturn<SimpleCustomer>;
    condensed?: boolean;
};

const CustomerForm: React.FC<Props> = ({
    formHook: {
        register,
        formState: { errors },
    },
    condensed,
}: Props) => {
    return (
        <div className="relative mt-3 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
                {condensed ? (
                    <div className="col-span-6">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Name
                        </label>
                        <input
                            {...register('name', { required: 'Customer name is required' })}
                            type="text"
                            id="name"
                            autoComplete="name"
                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name?.message}</p>}
                    </div>
                ) : (
                    <>
                        <div className="col-span-6">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Name
                            </label>
                            <input
                                {...register('name', { required: 'Customer name is required' })}
                                type="text"
                                id="name"
                                autoComplete="off"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name?.message}</p>}
                        </div>
                        <div className="col-span-6 lg:col-span-2">
                            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                                Contact Email
                            </label>
                            <input
                                {...register('contactEmail')}
                                type="text"
                                id="contactEmail"
                                autoComplete="off"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.contactEmail && (
                                <p className="mt-2 text-sm text-red-600">{errors.contactEmail?.message}</p>
                            )}
                        </div>
                        <div className="col-span-6 lg:col-span-2">
                            <label htmlFor="billingEmail" className="block text-sm font-medium text-gray-700">
                                Billing Email
                            </label>
                            <input
                                {...register('billingEmail')}
                                type="text"
                                id="billingEmail"
                                autoComplete="off"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.billingEmail && (
                                <p className="mt-2 text-sm text-red-600">{errors.billingEmail?.message}</p>
                            )}
                        </div>
                        <div className="col-span-6 lg:col-span-2">
                            <label htmlFor="paymentStatusEmail" className="block text-sm font-medium text-gray-700">
                                Payment Status Email
                            </label>
                            <input
                                {...register('paymentStatusEmail')}
                                type="text"
                                id="paymentStatusEmail"
                                autoComplete="off"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.paymentStatusEmail && (
                                <p className="mt-2 text-sm text-red-600">{errors.paymentStatusEmail?.message}</p>
                            )}
                        </div>
                        <div className="col-span-6">
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
                            {errors.street && <p className="mt-2 text-sm text-red-600">{errors.street?.message}</p>}
                        </div>
                        <div className="col-span-6 sm:col-span-2">
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
                            {errors.city && <p className="mt-2 text-sm text-red-600">{errors.city?.message}</p>}
                        </div>
                        <div className="col-span-6 sm:col-span-2">
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
                            {errors.state && <p className="mt-2 text-sm text-red-600">{errors.state?.message}</p>}
                        </div>
                        <div className="col-span-6 sm:col-span-2">
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
                            {errors.zip && <p className="mt-2 text-sm text-red-600">{errors.zip?.message}</p>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CustomerForm;
