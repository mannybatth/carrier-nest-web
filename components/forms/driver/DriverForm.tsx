import { Driver, ChargeType } from '@prisma/client';
import { tenDigitPhone } from 'lib/helpers/regExpressions';
import React from 'react';
import { UseFormReturn } from 'react-hook-form';

type Props = {
    formHook: UseFormReturn<Driver>;
    condensed?: boolean;
};

const DriverForm: React.FC<Props> = ({
    formHook: {
        register,
        trigger,
        getValues,
        clearErrors,
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
                        {errors.name && <p className="text-sm text-red-600">{errors.name?.message}</p>}
                    </div>
                ) : (
                    <>
                        <div className="col-span-6">
                            <label htmlFor="driver-name" className="block text-sm font-medium text-gray-700">
                                Name <span className="text-red-600">*</span>
                            </label>
                            <input
                                {...register('name', { required: 'Driver name is required' })}
                                type="text"
                                id="driver-name"
                                autoComplete="driver-name"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.name && <p className="text-sm text-red-600">{errors.name?.message}</p>}
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
                            {errors.email && <p className="text-sm text-red-600">{errors.email?.message}</p>}
                        </div>
                        <div className="col-span-6 lg:col-span-3">
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                Phone <span className="text-red-600">*</span>
                            </label>
                            <input
                                {...register('phone', {
                                    required: 'Phone number is required',
                                    pattern: {
                                        value: tenDigitPhone,
                                        message: 'Invalid phone number, valid format: 2134561111',
                                    },
                                    onBlur: (e) => trigger('phone'),
                                })}
                                type="text"
                                id="phone"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.phone && <p className="text-sm text-red-600">{errors.phone?.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 col-span-6 gap-6 lg:grid-cols-4">
                            <div>
                                <label htmlFor="defaultChargeType" className="block text-sm font-medium text-gray-700">
                                    Default Pay Type <span className="text-red-600">*</span>
                                </label>
                                <select
                                    {...register('defaultChargeType', {
                                        required: 'Pay type is required',
                                        onChange: () => {
                                            trigger('defaultChargeType');
                                            clearErrors('perMileRate');
                                            clearErrors('perHourRate');
                                            clearErrors('takeHomePercent');
                                        },
                                    })}
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
                                {errors.defaultChargeType && (
                                    <p className="text-sm text-red-600">{errors.defaultChargeType?.message}</p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="perMileRate" className="block text-sm font-medium text-gray-700">
                                    Per Mile Rate{' '}
                                    {getValues('defaultChargeType') === ChargeType.PER_MILE && (
                                        <span className="text-red-600">*</span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    {...register('perMileRate', {
                                        valueAsNumber: true,
                                        required:
                                            getValues('defaultChargeType') === ChargeType.PER_MILE
                                                ? 'Per Mile Rate is required'
                                                : false,
                                    })}
                                    id="perMileRate"
                                    placeholder="Enter rate per mile"
                                    step="any"
                                    min="0"
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                                {errors.perMileRate && (
                                    <p className="text-sm text-red-600">{errors.perMileRate?.message}</p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="perHourRate" className="block text-sm font-medium text-gray-700">
                                    Per Hour Rate{' '}
                                    {getValues('defaultChargeType') === ChargeType.PER_HOUR && (
                                        <span className="text-red-600">*</span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    {...register('perHourRate', {
                                        valueAsNumber: true,
                                        required:
                                            getValues('defaultChargeType') === ChargeType.PER_HOUR
                                                ? 'Per Hour Rate is required'
                                                : false,
                                    })}
                                    id="perHourRate"
                                    placeholder="Enter rate per hour"
                                    step="any"
                                    min="0"
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                                {errors.perHourRate && (
                                    <p className="text-sm text-red-600">{errors.perHourRate?.message}</p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="takeHomePercent" className="block text-sm font-medium text-gray-700">
                                    Take Home Percent{' '}
                                    {getValues('defaultChargeType') === ChargeType.PERCENTAGE_OF_LOAD && (
                                        <span className="text-red-600">*</span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    {...register('takeHomePercent', {
                                        valueAsNumber: true,
                                        required:
                                            getValues('defaultChargeType') === ChargeType.PERCENTAGE_OF_LOAD
                                                ? 'Take Home Percent is required'
                                                : false,
                                    })}
                                    id="takeHomePercent"
                                    placeholder="Enter percentage of load"
                                    step="any"
                                    min="0"
                                    max="100"
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                                {errors.takeHomePercent && (
                                    <p className="text-sm text-red-600">{errors.takeHomePercent?.message}</p>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DriverForm;
