import { Driver, ChargeType, DriverType } from '@prisma/client';
import { tenDigitPhone } from 'lib/helpers/regExpressions';
import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';

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
        setValue,
        watch,
        formState: { errors },
    },
    condensed,
}) => {
    // Pay type options with descriptions
    const payTypeOptions = [
        {
            value: ChargeType.PER_MILE,
            label: 'Per Mile',
            description: 'Rate paid per mile driven (including empty miles)',
        },
        {
            value: ChargeType.PER_HOUR,
            label: 'Per Hour',
            description: 'Hourly rate for time-based assignments',
        },
        {
            value: ChargeType.FIXED_PAY,
            label: 'Fixed Pay',
            description: 'Fixed amount per assignment regardless of time/distance',
        },
        {
            value: ChargeType.PERCENTAGE_OF_LOAD,
            label: 'Percentage of Load',
            description: 'Percentage of total load revenue (0-100%)',
        },
    ];

    // Driver type options with descriptions
    const driverTypeOptions = [
        {
            value: DriverType.DRIVER,
            label: 'Driver',
            description: 'Company employee driver',
        },
        {
            value: DriverType.OWNER_OPERATOR,
            label: 'Owner Operator',
            description: 'Independent contractor with own equipment',
        },
    ];

    const selectedPayType = watch('defaultChargeType');
    const selectedDriverType = watch('type');
    const selectedPayTypeOption = payTypeOptions.find((option) => option.value === selectedPayType);
    const selectedDriverTypeOption = driverTypeOptions.find((option) => option.value === selectedDriverType);

    const handlePayTypeChange = (value: ChargeType) => {
        setValue('defaultChargeType', value);
        trigger('defaultChargeType');
        clearErrors('perMileRate');
        clearErrors('perHourRate');
        clearErrors('takeHomePercent');
    };

    const handleDriverTypeChange = (value: DriverType) => {
        setValue('type', value);
        trigger('type');
    };
    return (
        <div className="relative mt-3 md:mt-0 md:col-span-2">
            {condensed ? (
                <div className="grid grid-cols-6 gap-6">
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
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Personal Information Section */}
                    <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h3>
                            <p className="text-base text-gray-600 leading-relaxed">
                                Basic contact details for the driver. This information will be used for communications
                                and invoicing.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label htmlFor="driver-name" className="block text-sm font-semibold text-gray-900 mb-2">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Enter the driver&apos;s full legal name as it appears on their license
                                </p>
                                <input
                                    {...register('name', { required: 'Driver name is required' })}
                                    type="text"
                                    id="driver-name"
                                    autoComplete="driver-name"
                                    className="block w-full px-4 py-4 text-base border-2 border-gray-300 rounded-2xl shadow-lg focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 bg-white hover:border-gray-400 placeholder-gray-400 font-medium"
                                    placeholder="e.g., John Smith"
                                />
                                {errors.name && (
                                    <p className="mt-2 text-sm text-red-600 font-medium">{errors.name?.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                                        Email Address
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Used for invoice notifications and communication
                                    </p>
                                    <input
                                        {...register('email')}
                                        type="email"
                                        id="email"
                                        autoComplete="email"
                                        className="block w-full px-4 py-4 text-base border-2 border-gray-300 rounded-2xl shadow-lg focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 bg-white hover:border-gray-400 placeholder-gray-400 font-medium"
                                        placeholder="e.g., john@example.com"
                                    />
                                    {errors.email && (
                                        <p className="mt-2 text-sm text-red-600 font-medium">{errors.email?.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                                        Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        10-digit US phone number for SMS notifications
                                    </p>
                                    <input
                                        {...register('phone', {
                                            required: 'Phone number is required',
                                            pattern: {
                                                value: tenDigitPhone,
                                                message: 'Invalid phone number, valid format: 2134561111',
                                            },
                                            onBlur: (e) => trigger('phone'),
                                        })}
                                        type="tel"
                                        id="phone"
                                        autoComplete="tel"
                                        className="block w-full px-4 py-4 text-base border-2 border-gray-300 rounded-2xl shadow-lg focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 bg-white hover:border-gray-400 placeholder-gray-400 font-medium"
                                        placeholder="e.g., 2134561111"
                                    />
                                    {errors.phone && (
                                        <p className="mt-2 text-sm text-red-600 font-medium">{errors.phone?.message}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="driver-type" className="block text-sm font-semibold text-gray-900 mb-2">
                                    Driver Type <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Select whether this person is a company driver or an owner-operator
                                </p>

                                {/* Apple-style Headless UI Dropdown */}
                                <Listbox value={selectedDriverType || ''} onChange={handleDriverTypeChange}>
                                    <div className="relative">
                                        <Listbox.Button className="relative w-full px-4 py-4 text-base border-2 border-gray-300 rounded-2xl shadow-lg focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 bg-white hover:border-gray-400 font-medium text-left cursor-pointer">
                                            <span className="flex items-center">
                                                {selectedDriverTypeOption ? (
                                                    <span className="block truncate text-gray-900">
                                                        {selectedDriverTypeOption.label}
                                                    </span>
                                                ) : (
                                                    <span className="block truncate text-gray-500">
                                                        Select driver type...
                                                    </span>
                                                )}
                                            </span>
                                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                                                <ChevronUpDownIcon
                                                    className="h-5 w-5 text-gray-400"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        </Listbox.Button>

                                        <Transition
                                            as={React.Fragment}
                                            enter="transition ease-out duration-200"
                                            enterFrom="opacity-0 translate-y-1"
                                            enterTo="opacity-100 translate-y-0"
                                            leave="transition ease-in duration-150"
                                            leaveFrom="opacity-100 translate-y-0"
                                            leaveTo="opacity-0 translate-y-1"
                                        >
                                            <Listbox.Options className="absolute z-50 mt-2 w-full bg-white shadow-xl rounded-2xl border border-gray-200 py-2 max-h-60 overflow-auto focus:outline-none">
                                                {driverTypeOptions.map((option) => (
                                                    <Listbox.Option
                                                        key={option.value}
                                                        className={({ active }) =>
                                                            classNames(
                                                                'relative cursor-pointer select-none px-4 py-3 mx-2 rounded-xl transition-all duration-150',
                                                                active ? 'bg-blue-50 text-blue-900' : 'text-gray-900',
                                                            )
                                                        }
                                                        value={option.value}
                                                    >
                                                        {({ selected, active }) => (
                                                            <div className="flex items-center">
                                                                <div className="flex-1">
                                                                    <div
                                                                        className={classNames(
                                                                            'block text-sm font-medium truncate',
                                                                            selected
                                                                                ? 'text-blue-900'
                                                                                : 'text-gray-900',
                                                                        )}
                                                                    >
                                                                        {option.label}
                                                                    </div>
                                                                    <div
                                                                        className={classNames(
                                                                            'block text-xs truncate mt-0.5',
                                                                            active ? 'text-blue-700' : 'text-gray-500',
                                                                        )}
                                                                    >
                                                                        {option.description}
                                                                    </div>
                                                                </div>
                                                                {selected && (
                                                                    <span className="ml-2 flex items-center text-blue-600">
                                                                        <CheckIcon
                                                                            className="h-4 w-4"
                                                                            aria-hidden="true"
                                                                        />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Listbox.Option>
                                                ))}
                                            </Listbox.Options>
                                        </Transition>
                                    </div>
                                </Listbox>

                                {errors.type && (
                                    <p className="mt-2 text-sm text-red-600 font-medium">{errors.type?.message}</p>
                                )}

                                {/* Hidden input for form validation */}
                                <input
                                    type="hidden"
                                    {...register('type', {
                                        required: 'Driver type is required',
                                    })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Default Pay Configuration Section */}
                    <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Default Pay Configuration</h3>
                            <p className="text-base text-gray-600 leading-relaxed">
                                Set the driver&apos;s preferred payment method and rates. These will be automatically
                                applied when creating new assignments.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label
                                    htmlFor="defaultChargeType"
                                    className="block text-sm font-semibold text-gray-900 mb-2"
                                >
                                    Preferred Pay Type <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Choose how this driver is typically compensated for assignments
                                </p>

                                {/* Apple-style Headless UI Dropdown */}
                                <Listbox value={selectedPayType || ''} onChange={handlePayTypeChange}>
                                    <div className="relative">
                                        <Listbox.Button className="relative w-full px-4 py-4 text-base border-2 border-gray-300 rounded-2xl shadow-lg focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 bg-white hover:border-gray-400 font-medium text-left cursor-pointer">
                                            <span className="flex items-center">
                                                {selectedPayTypeOption ? (
                                                    <span className="block truncate text-gray-900">
                                                        {selectedPayTypeOption.label}
                                                    </span>
                                                ) : (
                                                    <span className="block truncate text-gray-500">
                                                        Select Pay Type
                                                    </span>
                                                )}
                                            </span>
                                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                                                <ChevronUpDownIcon
                                                    className="h-5 w-5 text-gray-400"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        </Listbox.Button>

                                        <Transition
                                            as={React.Fragment}
                                            enter="transition ease-out duration-200"
                                            enterFrom="opacity-0 translate-y-1"
                                            enterTo="opacity-100 translate-y-0"
                                            leave="transition ease-in duration-150"
                                            leaveFrom="opacity-100 translate-y-0"
                                            leaveTo="opacity-0 translate-y-1"
                                        >
                                            <Listbox.Options className="absolute z-50 mt-2 w-full bg-white shadow-xl rounded-2xl border border-gray-200 py-2 max-h-60 overflow-auto focus:outline-none">
                                                {payTypeOptions.map((option) => (
                                                    <Listbox.Option
                                                        key={option.value}
                                                        className={({ active }) =>
                                                            classNames(
                                                                'relative cursor-pointer select-none px-4 py-3 mx-2 rounded-xl transition-all duration-150',
                                                                active ? 'bg-blue-50 text-blue-900' : 'text-gray-900',
                                                            )
                                                        }
                                                        value={option.value}
                                                    >
                                                        {({ selected, active }) => (
                                                            <div className="flex items-center">
                                                                <div className="flex-1">
                                                                    <div
                                                                        className={classNames(
                                                                            'block text-sm font-medium truncate',
                                                                            selected
                                                                                ? 'text-blue-900'
                                                                                : 'text-gray-900',
                                                                        )}
                                                                    >
                                                                        {option.label}
                                                                    </div>
                                                                    <div
                                                                        className={classNames(
                                                                            'block text-xs truncate mt-0.5',
                                                                            active ? 'text-blue-700' : 'text-gray-500',
                                                                        )}
                                                                    >
                                                                        {option.description}
                                                                    </div>
                                                                </div>
                                                                {selected && (
                                                                    <span className="ml-2 flex items-center text-blue-600">
                                                                        <CheckIcon
                                                                            className="h-4 w-4"
                                                                            aria-hidden="true"
                                                                        />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Listbox.Option>
                                                ))}
                                            </Listbox.Options>
                                        </Transition>
                                    </div>
                                </Listbox>

                                {errors.defaultChargeType && (
                                    <p className="mt-2 text-sm text-red-600 font-medium">
                                        {errors.defaultChargeType?.message}
                                    </p>
                                )}

                                {/* Hidden input for form validation */}
                                <input
                                    type="hidden"
                                    {...register('defaultChargeType', {
                                        required: 'Pay type is required',
                                    })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                                <div
                                    className={`relative transition-all duration-300 ${
                                        getValues('defaultChargeType') === ChargeType.PER_MILE
                                            ? 'ring-1 ring-blue-400/30 bg-blue-50/30 rounded-2xl p-4 -m-2'
                                            : getValues('defaultChargeType')
                                            ? 'ring-1 ring-gray-300/40 bg-gray-50/40 rounded-2xl p-4 -m-2 opacity-80'
                                            : ''
                                    }`}
                                >
                                    {getValues('defaultChargeType') === ChargeType.PER_MILE && (
                                        <div className="absolute -top-4 right-2 z-10 px-2 py-1 text-xs font-bold text-blue-700 bg-blue-200 rounded-full border-2 border-white shadow-sm">
                                            REQUIRED
                                        </div>
                                    )}
                                    <label
                                        htmlFor="perMileRate"
                                        className={`block text-sm font-semibold mb-2 ${
                                            getValues('defaultChargeType') === ChargeType.PER_MILE
                                                ? 'text-blue-800'
                                                : getValues('defaultChargeType')
                                                ? 'text-gray-700'
                                                : 'text-gray-900'
                                        }`}
                                    >
                                        Per Mile Rate
                                    </label>
                                    <p
                                        className={`text-xs mb-3 line-clamp-2 ${
                                            getValues('defaultChargeType') === ChargeType.PER_MILE
                                                ? 'text-blue-600'
                                                : getValues('defaultChargeType')
                                                ? 'text-gray-600'
                                                : 'text-gray-500'
                                        }`}
                                        title="Rate paid per mile driven (including empty miles)"
                                    >
                                        Rate paid per mile driven (including empty miles)
                                    </p>
                                    <div className="relative">
                                        <span
                                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-base font-medium ${
                                                getValues('defaultChargeType') === ChargeType.PER_MILE
                                                    ? 'text-blue-500'
                                                    : getValues('defaultChargeType')
                                                    ? 'text-gray-400'
                                                    : 'text-gray-500'
                                            }`}
                                        >
                                            $
                                        </span>
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
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className={`block w-full pl-10 pr-4 py-4 text-base border-2 rounded-2xl shadow-lg transition-all duration-300 bg-white placeholder-gray-400 font-medium ${
                                                getValues('defaultChargeType') === ChargeType.PER_MILE
                                                    ? 'border-blue-300 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 hover:border-blue-400'
                                                    : getValues('defaultChargeType')
                                                    ? 'border-gray-200 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 hover:border-gray-300'
                                                    : 'border-gray-300 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 hover:border-gray-400'
                                            }`}
                                        />
                                    </div>
                                    {errors.perMileRate && (
                                        <p className="mt-2 text-sm text-red-600 font-medium">
                                            {errors.perMileRate?.message}
                                        </p>
                                    )}
                                </div>

                                <div
                                    className={`relative transition-all duration-300 ${
                                        getValues('defaultChargeType') === ChargeType.PER_HOUR
                                            ? 'ring-1 ring-blue-400/30 bg-blue-50/30 rounded-2xl p-4 -m-2'
                                            : getValues('defaultChargeType')
                                            ? 'ring-1 ring-gray-300/40 bg-gray-50/40 rounded-2xl p-4 -m-2 opacity-80'
                                            : ''
                                    }`}
                                >
                                    {getValues('defaultChargeType') === ChargeType.PER_HOUR && (
                                        <div className="absolute -top-4 right-2  z-10 px-2 py-1 text-xs font-bold text-blue-700 bg-blue-200 rounded-full border-2 border-white shadow-sm">
                                            REQUIRED
                                        </div>
                                    )}
                                    <label
                                        htmlFor="perHourRate"
                                        className={`block text-sm font-semibold mb-2 ${
                                            getValues('defaultChargeType') === ChargeType.PER_HOUR
                                                ? 'text-blue-800'
                                                : getValues('defaultChargeType')
                                                ? 'text-gray-700'
                                                : 'text-gray-900'
                                        }`}
                                    >
                                        Per Hour Rate
                                    </label>
                                    <p
                                        className={`text-xs mb-3 line-clamp-2 ${
                                            getValues('defaultChargeType') === ChargeType.PER_HOUR
                                                ? 'text-blue-600'
                                                : getValues('defaultChargeType')
                                                ? 'text-gray-600'
                                                : 'text-gray-500'
                                        }`}
                                        title="Hourly rate for time-based assignments"
                                    >
                                        Hourly rate for time-based assignments
                                    </p>
                                    <div className="relative">
                                        <span
                                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-base font-medium ${
                                                getValues('defaultChargeType') === ChargeType.PER_HOUR
                                                    ? 'text-blue-500'
                                                    : getValues('defaultChargeType')
                                                    ? 'text-gray-400'
                                                    : 'text-gray-500'
                                            }`}
                                        >
                                            $
                                        </span>
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
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className={`block w-full pl-10 pr-4 py-4 text-base border-2 rounded-2xl shadow-lg transition-all duration-300 bg-white placeholder-gray-400 font-medium ${
                                                getValues('defaultChargeType') === ChargeType.PER_HOUR
                                                    ? 'border-blue-300 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 hover:border-blue-400'
                                                    : getValues('defaultChargeType')
                                                    ? 'border-gray-200 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 hover:border-gray-300'
                                                    : 'border-gray-300 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 hover:border-gray-400'
                                            }`}
                                        />
                                    </div>
                                    {errors.perHourRate && (
                                        <p className="mt-2 text-sm text-red-600 font-medium">
                                            {errors.perHourRate?.message}
                                        </p>
                                    )}
                                </div>

                                <div
                                    className={`relative transition-all duration-300 ${
                                        getValues('defaultChargeType') === ChargeType.FIXED_PAY
                                            ? 'ring-1 ring-blue-400/30 bg-blue-50/30 rounded-2xl p-4 -m-2'
                                            : getValues('defaultChargeType')
                                            ? 'ring-1 ring-gray-300/40 bg-gray-50/40 rounded-2xl p-4 -m-2 opacity-80'
                                            : ''
                                    }`}
                                >
                                    {getValues('defaultChargeType') === ChargeType.FIXED_PAY && (
                                        <div className="absolute -top-4 right-2 z-10 px-2 py-1 text-xs font-bold text-blue-700 bg-blue-200 rounded-full border-2 border-white shadow-sm">
                                            REQUIRED
                                        </div>
                                    )}
                                    <label
                                        htmlFor="defaultFixedPay"
                                        className={`block text-sm font-semibold mb-2 ${
                                            getValues('defaultChargeType') === ChargeType.FIXED_PAY
                                                ? 'text-blue-800'
                                                : getValues('defaultChargeType')
                                                ? 'text-gray-700'
                                                : 'text-gray-900'
                                        }`}
                                    >
                                        Default Fixed Pay
                                    </label>
                                    <p
                                        className={`text-xs mb-3 line-clamp-2 ${
                                            getValues('defaultChargeType') === ChargeType.FIXED_PAY
                                                ? 'text-blue-600'
                                                : getValues('defaultChargeType')
                                                ? 'text-gray-600'
                                                : 'text-gray-500'
                                        }`}
                                        title="Fixed amount per assignment regardless of time/distance"
                                    >
                                        Fixed amount per assignment regardless of time/distance
                                    </p>
                                    <div className="relative">
                                        <span
                                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-base font-medium ${
                                                getValues('defaultChargeType') === ChargeType.FIXED_PAY
                                                    ? 'text-blue-500'
                                                    : getValues('defaultChargeType')
                                                    ? 'text-gray-400'
                                                    : 'text-gray-500'
                                            }`}
                                        >
                                            $
                                        </span>
                                        <input
                                            type="number"
                                            {...register('defaultFixedPay', {
                                                valueAsNumber: true,
                                                required:
                                                    getValues('defaultChargeType') === ChargeType.FIXED_PAY
                                                        ? 'Default Fixed Pay is required'
                                                        : false,
                                            })}
                                            id="defaultFixedPay"
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className={`block w-full pl-10 pr-4 py-4 text-base border-2 rounded-2xl shadow-lg transition-all duration-300 bg-white placeholder-gray-400 font-medium ${
                                                getValues('defaultChargeType') === ChargeType.FIXED_PAY
                                                    ? 'border-blue-300 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 hover:border-blue-400'
                                                    : getValues('defaultChargeType')
                                                    ? 'border-gray-200 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 hover:border-gray-300'
                                                    : 'border-gray-300 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 hover:border-gray-400'
                                            }`}
                                        />
                                    </div>
                                    {errors.defaultFixedPay && (
                                        <p className="mt-2 text-sm text-red-600 font-medium">
                                            {errors.defaultFixedPay?.message}
                                        </p>
                                    )}
                                </div>

                                <div
                                    className={`relative transition-all duration-300 ${
                                        getValues('defaultChargeType') === ChargeType.PERCENTAGE_OF_LOAD
                                            ? 'ring-1 ring-blue-400/30 bg-blue-50/30 rounded-2xl p-4 -m-2'
                                            : getValues('defaultChargeType')
                                            ? 'ring-1 ring-gray-300/40 bg-gray-50/40 rounded-2xl p-4 -m-2 opacity-80'
                                            : ''
                                    }`}
                                >
                                    {getValues('defaultChargeType') === ChargeType.PERCENTAGE_OF_LOAD && (
                                        <div className="absolute -top-4 right-2  z-10 px-2 py-1 text-xs font-bold text-blue-700 bg-blue-200 rounded-full border-2 border-white shadow-sm">
                                            REQUIRED
                                        </div>
                                    )}
                                    <label
                                        htmlFor="takeHomePercent"
                                        className={`block text-sm font-semibold mb-2 ${
                                            getValues('defaultChargeType') === ChargeType.PERCENTAGE_OF_LOAD
                                                ? 'text-blue-800'
                                                : getValues('defaultChargeType')
                                                ? 'text-gray-700'
                                                : 'text-gray-900'
                                        }`}
                                    >
                                        Load Percentage
                                    </label>
                                    <p
                                        className={`text-xs mb-3 line-clamp-2 ${
                                            getValues('defaultChargeType') === ChargeType.PERCENTAGE_OF_LOAD
                                                ? 'text-blue-600'
                                                : getValues('defaultChargeType')
                                                ? 'text-gray-600'
                                                : 'text-gray-500'
                                        }`}
                                        title="Percentage of total load revenue (0-100%)"
                                    >
                                        Percentage of total load revenue (0-100%)
                                    </p>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            {...register('takeHomePercent', {
                                                valueAsNumber: true,
                                                required:
                                                    getValues('defaultChargeType') === ChargeType.PERCENTAGE_OF_LOAD
                                                        ? 'Load Percentage is required'
                                                        : false,
                                            })}
                                            id="takeHomePercent"
                                            placeholder="0"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className={`block w-full px-4 py-4 pr-10 text-base border-2 rounded-2xl shadow-lg transition-all duration-300 bg-white placeholder-gray-400 font-medium ${
                                                getValues('defaultChargeType') === ChargeType.PERCENTAGE_OF_LOAD
                                                    ? 'border-blue-300 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 hover:border-blue-400'
                                                    : getValues('defaultChargeType')
                                                    ? 'border-gray-200 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 hover:border-gray-300'
                                                    : 'border-gray-300 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 hover:border-gray-400'
                                            }`}
                                        />
                                        <span
                                            className={`absolute right-4 top-1/2 transform -translate-y-1/2 text-base font-medium ${
                                                getValues('defaultChargeType') === ChargeType.PERCENTAGE_OF_LOAD
                                                    ? 'text-blue-500'
                                                    : getValues('defaultChargeType')
                                                    ? 'text-gray-400'
                                                    : 'text-gray-500'
                                            }`}
                                        >
                                            %
                                        </span>
                                    </div>
                                    {errors.takeHomePercent && (
                                        <p className="mt-2 text-sm text-red-600 font-medium">
                                            {errors.takeHomePercent?.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Base Guarantee Amount Section */}
                            <div>
                                <label
                                    htmlFor="baseGuaranteeAmount"
                                    className="block text-sm font-semibold text-gray-900 mb-2"
                                >
                                    Base Guarantee Amount
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Optional minimum guaranteed amount per pay period (weekly/monthly)
                                </p>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-base font-medium text-gray-500">
                                        $
                                    </span>
                                    <input
                                        {...register('baseGuaranteeAmount', {
                                            setValueAs: (value) => (value === '' ? null : parseFloat(value)),
                                            validate: (value) => {
                                                if (value !== null && value !== undefined && Number(value) < 0) {
                                                    return 'Base guarantee amount cannot be negative';
                                                }
                                                return true;
                                            },
                                        })}
                                        type="number"
                                        id="baseGuaranteeAmount"
                                        step="0.01"
                                        min="0"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="block w-full px-4 py-4 pl-8 text-base border-2 border-gray-300 rounded-2xl shadow-lg focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 bg-white hover:border-gray-400 placeholder-gray-400 font-medium"
                                        placeholder="0.00"
                                    />
                                </div>
                                {errors.baseGuaranteeAmount && (
                                    <p className="mt-2 text-sm text-red-600 font-medium">
                                        {errors.baseGuaranteeAmount?.message}
                                    </p>
                                )}
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-6">
                                <div className="text-left">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Pay Configuration Tips</h4>
                                    <div className="text-left">
                                        <ul className="text-xs text-gray-600 space-y-1">
                                            <li className="flex items-start">
                                                <span className="text-gray-400 mr-2 mt-0.5">•</span>
                                                <span>
                                                    You can fill in rates for multiple pay types, but only the selected
                                                    default will be used initially
                                                </span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-gray-400 mr-2 mt-0.5">•</span>
                                                <span>
                                                    These rates can be adjusted for individual assignments when needed
                                                </span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-gray-400 mr-2 mt-0.5">•</span>
                                                <span>
                                                    Fixed pay amounts are set per assignment and don&apos;t use these
                                                    default rates
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverForm;
