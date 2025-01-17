import { Driver, ChargeType } from '@prisma/client';
import React from 'react';
import { UseFormReturn } from 'react-hook-form';

type Props = {
    formHook: UseFormReturn<Driver>;
    condensed?: boolean;
};

const DriverForm: React.FC<Props> = ({
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
                    <div className="col-span-6">
                        <label htmlFor="driver-name" className="block text-sm font-medium text-gray-700">
                            Name
                        </label>
                        <input
                            {...register('name', { required: 'Driver name is required' })}
                            type="text"
                            id="driver-name"
                            autoComplete="driver-name"
                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name?.message}</p>}
                    </div>
                ) : (
                    <>
                        <div className="col-span-6">
                            <label htmlFor="driver-name" className="block text-sm font-medium text-gray-700">
                                Name
                            </label>
                            <input
                                {...register('name', { required: 'Driver name is required' })}
                                type="text"
                                id="driver-name"
                                autoComplete="driver-name"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name?.message}</p>}
                        </div>
                        <div className="col-span-6 lg:col-span-3">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                {...register('email')}
                                type="text"
                                id="email"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email?.message}</p>}
                        </div>
                        <div className="col-span-6 lg:col-span-3">
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                Phone
                            </label>
                            <input
                                {...register('phone', { required: 'Phone number is required' })}
                                type="text"
                                id="phone"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.phone && <p className="mt-2 text-sm text-red-600">{errors.phone?.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 col-span-6 gap-6 lg:grid-cols-4">
                            <div>
                                <label htmlFor="defaultChargeType" className="block text-sm font-medium text-gray-700">
                                    Default Pay Type
                                </label>
                                <select
                                    {...register('defaultChargeType')}
                                    id="defaultChargeType"
                                    defaultValue=""
                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                >
                                    <option value="" disabled>
                                        Select Pay Type
                                    </option>
                                    <option value={ChargeType.PER_MILE}>Per Mile</option>
                                    <option value={ChargeType.PER_HOUR}>Per Hour</option>
                                    <option value={ChargeType.FIXED_PAY}>Fixed Pay</option>
                                    <option value={ChargeType.PERCENTAGE_OF_LOAD}>Percentage of Load</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="perMileRate" className="block text-sm font-medium text-gray-700">
                                    Per Mile Rate
                                </label>
                                <input
                                    type="number"
                                    {...register('perMileRate', {
                                        valueAsNumber: true,
                                    })}
                                    id="perMileRate"
                                    placeholder="Enter rate per mile"
                                    step="any"
                                    min="0"
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="perHourRate" className="block text-sm font-medium text-gray-700">
                                    Per Hour Rate
                                </label>
                                <input
                                    type="number"
                                    {...register('perHourRate', {
                                        valueAsNumber: true,
                                    })}
                                    id="perHourRate"
                                    placeholder="Enter rate per hour"
                                    step="any"
                                    min="0"
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="takeHomePercent" className="block text-sm font-medium text-gray-700">
                                    Take Home Percent
                                </label>
                                <input
                                    type="number"
                                    {...register('takeHomePercent', {
                                        valueAsNumber: true,
                                    })}
                                    id="takeHomePercent"
                                    placeholder="Enter percentage of load"
                                    step="any"
                                    min="0"
                                    max="100"
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DriverForm;
