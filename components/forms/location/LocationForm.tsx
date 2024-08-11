import { Location } from '@prisma/client';
import React from 'react';
import { UseFormReturn } from 'react-hook-form';

type Props = {
    formHook: UseFormReturn<Location>;
    condensed?: boolean;
};

const LocationForm: React.FC<Props> = ({
    formHook: {
        register,
        formState: { errors },
    },
    condensed,
}) => {
    return (
        <div className="relative mt-3 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
                {condensed ? (
                    <>
                        <div className="col-span-6 sm:col-span-3">
                            <label htmlFor="location-name" className="block text-sm font-medium text-gray-700">
                                Name
                            </label>
                            <input
                                type="text"
                                id="location-name"
                                {...register('name', { required: 'Name is required' })}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                            />
                            {errors.name && <span className="text-red-600">{errors.name.message}</span>}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="col-span-6 sm:col-span-6">
                            <label htmlFor="location-name" className="block text-sm font-medium text-gray-700">
                                Name
                            </label>
                            <input
                                type="text"
                                id="location-name"
                                {...register('name', { required: 'Name is required' })}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                            />
                            {errors.name && <span className="text-red-600">{errors.name.message}</span>}
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                            <label htmlFor="location-street" className="block text-sm font-medium text-gray-700">
                                Street
                            </label>
                            <input
                                type="text"
                                id="location-street"
                                {...register('street', { required: 'Street is required' })}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                            />
                            {errors.street && <span className="text-red-600">{errors.street.message}</span>}
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                            <label htmlFor="location-city" className="block text-sm font-medium text-gray-700">
                                City
                            </label>
                            <input
                                type="text"
                                id="location-city"
                                {...register('city', { required: 'City is required' })}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                            />
                            {errors.city && <span className="text-red-600">{errors.city.message}</span>}
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                            <label htmlFor="location-state" className="block text-sm font-medium text-gray-700">
                                State
                            </label>
                            <input
                                type="text"
                                id="location-state"
                                {...register('state', { required: 'State is required' })}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                            />
                            {errors.state && <span className="text-red-600">{errors.state.message}</span>}
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                            <label htmlFor="location-zip" className="block text-sm font-medium text-gray-700">
                                Zip
                            </label>
                            <input
                                type="text"
                                id="location-zip"
                                {...register('zip', { required: 'Zip is required' })}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                            />
                            {errors.zip && <span className="text-red-600">{errors.zip.message}</span>}
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                            <label htmlFor="location-country" className="block text-sm font-medium text-gray-700">
                                Country
                            </label>
                            <input
                                type="text"
                                id="location-country"
                                {...register('country', { required: 'Country is required' })}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                            />
                            {errors.country && <span className="text-red-600">{errors.country.message}</span>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LocationForm;
