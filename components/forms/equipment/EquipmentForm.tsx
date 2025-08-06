import React from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { Driver } from '@prisma/client';
import { ExpandedEquipment } from 'interfaces/models';
import { Listbox, Transition } from '@headlessui/react';
import {
    ChevronUpDownIcon,
    CheckIcon,
    TruckIcon,
    CalendarDaysIcon,
    UserGroupIcon,
    WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

type EquipmentFormProps = {
    formHook: UseFormReturn<ExpandedEquipment>;
    drivers: Driver[];
    condensed?: boolean;
};

const EquipmentForm: React.FC<EquipmentFormProps> = ({
    formHook: {
        register,
        formState: { errors },
        setValue,
        control,
    },
    drivers,
    condensed,
}) => {
    const selectedDrivers = useWatch({ control, name: 'drivers' }) || [];
    const selectedStatus = useWatch({ control, name: 'status' }) || '';

    const handleDriverChange = (selectedOptions: Driver[]) => {
        setValue('drivers', selectedOptions);
    };

    const handleStatusChange = (value: string) => {
        setValue('status', value as any);
    };

    // Apple-style input classes
    const inputClasses =
        'block w-full px-4 py-3 text-base bg-white border-2 border-gray-200 rounded-2xl shadow-sm transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-500';
    const labelClasses = 'block text-sm font-semibold text-gray-900 mb-2';
    const errorClasses = 'mt-2 text-sm text-red-600 font-medium';

    // Equipment status options with thoughtful descriptions
    const statusOptions = [
        { value: 'AVAILABLE', label: 'Available', description: 'Ready for assignments and operations' },
        { value: 'MAINTENANCE', label: 'In Maintenance', description: 'Currently being serviced or repaired' },
        { value: 'INACTIVE', label: 'Inactive', description: 'Not in service, stored or retired' },
    ];

    return (
        <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
            {/* Header Section */}
            <div className="mb-8 pb-6 border-b border-gray-200">
                <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-xl">
                        <TruckIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Equipment Details</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                    Provide essential information about the equipment including vehicle specifications, identification
                    details, and operational status. All required fields must be completed to ensure proper fleet
                    management and regulatory compliance.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Equipment Number */}
                <div>
                    <label htmlFor="equipment-number" className={labelClasses}>
                        Equipment Number
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                        Unique identifier used for tracking and fleet management
                    </p>
                    <input
                        type="text"
                        id="equipment-number"
                        placeholder="Enter equipment number"
                        {...register('equipmentNumber')}
                        className={inputClasses}
                    />
                    {errors.equipmentNumber && <span className={errorClasses}>{errors.equipmentNumber.message}</span>}
                </div>

                {/* Type */}
                <div>
                    <label htmlFor="equipment-type" className={labelClasses}>
                        Type <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Vehicle category (e.g., Truck, Trailer, Van)</p>
                    <input
                        type="text"
                        id="equipment-type"
                        placeholder="e.g., Semi Truck, Trailer"
                        {...register('type', { required: 'Equipment type is required' })}
                        className={inputClasses}
                    />
                    {errors.type && <span className={errorClasses}>{errors.type.message}</span>}
                </div>

                {/* Make */}
                <div>
                    <label htmlFor="equipment-make" className={labelClasses}>
                        Make <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                        Manufacturer name (e.g., Freightliner, Volvo, Peterbilt)
                    </p>
                    <input
                        type="text"
                        id="equipment-make"
                        placeholder="e.g., Freightliner"
                        {...register('make', { required: 'Make is required' })}
                        className={inputClasses}
                    />
                    {errors.make && <span className={errorClasses}>{errors.make.message}</span>}
                </div>

                {/* Model */}
                <div>
                    <label htmlFor="equipment-model" className={labelClasses}>
                        Model <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Specific model designation from the manufacturer</p>
                    <input
                        type="text"
                        id="equipment-model"
                        placeholder="e.g., Cascadia, VNL"
                        {...register('model', { required: 'Model is required' })}
                        className={inputClasses}
                    />
                    {errors.model && <span className={errorClasses}>{errors.model.message}</span>}
                </div>

                {/* Year */}
                <div>
                    <label htmlFor="equipment-year" className={labelClasses}>
                        Year <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-3 flex items-center">
                        <CalendarDaysIcon className="w-4 h-4 mr-1" />
                        Manufacturing year for registration and compliance
                    </p>
                    <input
                        type="number"
                        id="equipment-year"
                        placeholder="e.g., 2023"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        {...register('year', {
                            required: 'Year is required',
                            valueAsNumber: true,
                            min: { value: 1900, message: 'Year must be after 1900' },
                            max: { value: new Date().getFullYear() + 1, message: 'Year cannot be in the future' },
                        })}
                        onWheel={(e) => e.currentTarget.blur()}
                        className={inputClasses}
                    />
                    {errors.year && <span className={errorClasses}>{errors.year.message}</span>}
                </div>

                {/* VIN */}
                <div>
                    <label htmlFor="equipment-vin" className={labelClasses}>
                        VIN (Vehicle Identification Number)
                    </label>
                    <p className="text-xs text-gray-500 mb-3">17-character unique identifier for DOT compliance</p>
                    <input
                        type="text"
                        id="equipment-vin"
                        placeholder="Enter 17-character VIN"
                        maxLength={17}
                        {...register('vin', {
                            pattern: {
                                value: /^[A-HJ-NPR-Z0-9]{17}$/,
                                message: 'VIN must be exactly 17 characters (no I, O, Q)',
                            },
                        })}
                        className={inputClasses}
                    />
                    {errors.vin && <span className={errorClasses}>{errors.vin.message}</span>}
                </div>

                {/* License Plate */}
                <div>
                    <label htmlFor="equipment-license-plate" className={labelClasses}>
                        License Plate
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Current registration plate number</p>
                    <input
                        type="text"
                        id="equipment-license-plate"
                        placeholder="Enter license plate"
                        {...register('licensePlate')}
                        className={inputClasses}
                        style={{ textTransform: 'uppercase' }}
                    />
                    {errors.licensePlate && <span className={errorClasses}>{errors.licensePlate.message}</span>}
                </div>

                {/* Status Dropdown */}
                <div>
                    <label className={labelClasses}>
                        <WrenchScrewdriverIcon className="w-4 h-4 inline mr-2" />
                        Equipment Status <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                        Current operational status affecting availability for assignments
                    </p>
                    <input type="hidden" {...register('status', { required: 'Status is required' })} />
                    <Listbox value={selectedStatus} onChange={handleStatusChange}>
                        <div className="relative">
                            <Listbox.Button className="relative w-full px-4 py-3 text-left bg-white border-2 border-gray-200 rounded-2xl shadow-sm cursor-pointer transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300">
                                <span className="block truncate text-base">
                                    {selectedStatus
                                        ? statusOptions.find((option) => option.value === selectedStatus)?.label ||
                                          'Select equipment status'
                                        : 'Select equipment status'}
                                </span>
                                <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                    <ChevronUpDownIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
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
                                <Listbox.Options className="absolute z-20 w-full py-2 mt-2 overflow-auto bg-white border-2 border-gray-200 rounded-2xl shadow-xl max-h-60 focus:outline-none">
                                    {statusOptions.map((option) => (
                                        <Listbox.Option
                                            key={option.value}
                                            className={({ active }) =>
                                                `cursor-pointer select-none relative px-4 py-3 transition-all duration-150 ${
                                                    active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                                }`
                                            }
                                            value={option.value}
                                        >
                                            {({ selected, active }) => (
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span
                                                            className={`text-base block ${
                                                                selected ? 'font-semibold' : 'font-medium'
                                                            }`}
                                                        >
                                                            {option.label}
                                                        </span>
                                                        <span className="text-xs text-gray-500 block mt-1">
                                                            {option.description}
                                                        </span>
                                                    </div>
                                                    {selected && (
                                                        <CheckIcon
                                                            className="w-5 h-5 text-blue-600 flex-shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </Transition>
                        </div>
                    </Listbox>
                    {selectedStatus && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                            <p className="text-xs text-blue-800">
                                <span className="font-semibold">
                                    Status: {statusOptions.find((option) => option.value === selectedStatus)?.label}
                                </span>{' '}
                                — {statusOptions.find((option) => option.value === selectedStatus)?.description}
                            </p>
                        </div>
                    )}
                    {errors.status && <span className={errorClasses}>{errors.status.message}</span>}
                </div>

                {/* Driver Assignment */}
                <div className="lg:col-span-2">
                    <label className={labelClasses}>
                        <UserGroupIcon className="w-4 h-4 inline mr-2" />
                        Assigned Drivers
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                        Select active drivers who are authorized to operate this equipment. Only active drivers appear
                        in this list for operational safety.
                    </p>
                    <Listbox value={selectedDrivers} onChange={handleDriverChange} multiple by="id">
                        <div className="relative">
                            <Listbox.Button className="relative w-full px-4 py-3 text-left bg-white border-2 border-gray-200 rounded-2xl shadow-sm cursor-pointer transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300">
                                <span className="block truncate text-base">
                                    {selectedDrivers.length > 0
                                        ? `${selectedDrivers.length} driver${
                                              selectedDrivers.length > 1 ? 's' : ''
                                          } selected: ${selectedDrivers.map((driver) => driver.name).join(', ')}`
                                        : 'Select drivers for this equipment'}
                                </span>
                                <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                    <ChevronUpDownIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
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
                                <Listbox.Options className="absolute z-20 w-full py-2 mt-2 overflow-auto bg-white border-2 border-gray-200 rounded-2xl shadow-xl max-h-60 focus:outline-none">
                                    {drivers.length > 0 ? (
                                        drivers.map((driver) => (
                                            <Listbox.Option
                                                key={driver.id}
                                                className={({ active }) =>
                                                    `cursor-pointer select-none relative px-4 py-3 transition-all duration-150 ${
                                                        active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                                    }`
                                                }
                                                value={driver}
                                            >
                                                {({ selected, active }) => (
                                                    <div className="flex items-center justify-between">
                                                        <span
                                                            className={`text-base ${
                                                                selected ? 'font-semibold' : 'font-medium'
                                                            }`}
                                                        >
                                                            {driver.name}
                                                        </span>
                                                        {selected && (
                                                            <CheckIcon
                                                                className="w-5 h-5 text-blue-600"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </Listbox.Option>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                            No active drivers available
                                        </div>
                                    )}
                                </Listbox.Options>
                            </Transition>
                        </div>
                    </Listbox>
                    {selectedDrivers.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                            <p className="text-xs text-blue-800">
                                <span className="font-semibold">{selectedDrivers.length} driver(s) assigned:</span>{' '}
                                These drivers will have access to operate this equipment and can be assigned to loads
                                requiring this vehicle.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EquipmentForm;
