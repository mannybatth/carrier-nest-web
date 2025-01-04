import React from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { Driver } from '@prisma/client';
import { ExpandedEquipment } from 'interfaces/models';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';

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

    const handleDriverChange = (selectedOptions: Driver[]) => {
        setValue('drivers', selectedOptions);
    };

    return (
        <div className="relative mt-3 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="equipment-number" className="block text-sm font-medium text-gray-700">
                        Equipment Number
                    </label>
                    <input
                        type="text"
                        id="equipment-number"
                        {...register('equipmentNumber')}
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                    {errors.equipmentNumber && <span className="text-red-600">{errors.equipmentNumber.message}</span>}
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="equipment-type" className="block text-sm font-medium text-gray-700">
                        Type
                    </label>
                    <input
                        type="text"
                        id="equipment-type"
                        {...register('type', { required: 'Type is required' })}
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                    {errors.type && <span className="text-red-600">{errors.type.message}</span>}
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="equipment-make" className="block text-sm font-medium text-gray-700">
                        Make
                    </label>
                    <input
                        type="text"
                        id="equipment-make"
                        {...register('make', { required: 'Make is required' })}
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                    {errors.make && <span className="text-red-600">{errors.make.message}</span>}
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="equipment-model" className="block text-sm font-medium text-gray-700">
                        Model
                    </label>
                    <input
                        type="text"
                        id="equipment-model"
                        {...register('model')}
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                    {errors.model && <span className="text-red-600">{errors.model.message}</span>}
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="equipment-year" className="block text-sm font-medium text-gray-700">
                        Year
                    </label>
                    <input
                        type="number"
                        id="equipment-year"
                        {...register('year', {
                            valueAsNumber: true,
                        })}
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                    {errors.year && <span className="text-red-600">{errors.year.message}</span>}
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="equipment-vin" className="block text-sm font-medium text-gray-700">
                        VIN
                    </label>
                    <input
                        type="text"
                        id="equipment-vin"
                        {...register('vin')}
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                    {errors.vin && <span className="text-red-600">{errors.vin.message}</span>}
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="equipment-license-plate" className="block text-sm font-medium text-gray-700">
                        License Plate
                    </label>
                    <input
                        type="text"
                        id="equipment-license-plate"
                        {...register('licensePlate')}
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                    {errors.licensePlate && <span className="text-red-600">{errors.licensePlate.message}</span>}
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="equipment-status" className="block text-sm font-medium text-gray-700">
                        Status
                    </label>
                    <select
                        id="equipment-status"
                        {...register('status', { required: 'Status is required' })}
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm sm:text-sm"
                    >
                        <option value="AVAILABLE">Available</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                    {errors.status && <span className="text-red-600">{errors.status.message}</span>}
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="equipment-drivers" className="block text-sm font-medium text-gray-700">
                        Drivers
                    </label>
                    <Listbox value={selectedDrivers} onChange={handleDriverChange} multiple by="id">
                        <div className="relative mt-1">
                            <Listbox.Button className="relative w-full py-2 pl-3 pr-10 text-left bg-white border border-gray-300 rounded-md shadow-sm cursor-default cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                <span className="block truncate">
                                    {selectedDrivers.length > 0
                                        ? selectedDrivers.map((driver) => driver.name).join(', ')
                                        : 'Select drivers'}
                                </span>
                                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                    <ChevronUpDownIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                                </span>
                            </Listbox.Button>
                            <Transition
                                as={React.Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <Listbox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                    {drivers.map((driver) => (
                                        <Listbox.Option
                                            key={driver.id}
                                            className={({ active }) =>
                                                `cursor-pointer select-none relative py-2 pl-10 pr-4 ${
                                                    active ? 'text-white bg-blue-600' : 'text-gray-900'
                                                }`
                                            }
                                            value={driver}
                                        >
                                            {({ selected, active }) => (
                                                <>
                                                    <span
                                                        className={`block truncate ${
                                                            selected ? 'font-medium' : 'font-normal'
                                                        }`}
                                                    >
                                                        {driver.name}
                                                    </span>
                                                    {selected ? (
                                                        <span
                                                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                                                active ? 'text-white' : 'text-blue-600'
                                                            }`}
                                                        >
                                                            <CheckIcon className="w-5 h-5" aria-hidden="true" />
                                                        </span>
                                                    ) : null}
                                                </>
                                            )}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </Transition>
                        </div>
                    </Listbox>
                </div>
            </div>
        </div>
    );
};

export default EquipmentForm;
