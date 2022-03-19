import React from 'react';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import { CalendarIcon, ClockIcon } from '@heroicons/react/outline';
import { LoadStopType } from '@prisma/client';
import { Control, Controller, FieldErrors, UseFormRegister } from 'react-hook-form';
import { ExpandedLoad } from '../../../interfaces/models';
import TimeField from '../TimeField';

export type LoadFormStopProps = {
    type: LoadStopType;
    totalStops?: number;
    index?: number;
    onRemoveStop?: () => void;
    register: UseFormRegister<ExpandedLoad>;
    errors: FieldErrors<ExpandedLoad>;
    control: Control<ExpandedLoad, any>;
};

const LoadFormStop: React.FC<LoadFormStopProps> = ({
    register,
    errors,
    control,
    index,
    onRemoveStop,
    ...props
}: LoadFormStopProps) => {
    const borderColor = () => {
        switch (props.type) {
            case LoadStopType.SHIPPER:
                return 'border-emerald-500';
            case LoadStopType.RECEIVER:
                return 'border-violet-500';
            default:
                return 'border-gray-500';
        }
    };

    const title = () => {
        switch (props.type) {
            case LoadStopType.SHIPPER:
                return 'Shipper';
            case LoadStopType.RECEIVER:
                return 'Receiver';
            default:
                return props.totalStops > 1 ? `Stop #${index + 1}` : 'Stop';
        }
    };

    const errorMessage = (errors: FieldErrors<ExpandedLoad>, name: string) => {
        if (props.type === LoadStopType.SHIPPER) {
            return (
                errors.shipper &&
                errors.shipper[name] &&
                errors.shipper[name].message && (
                    <p className="mt-2 text-sm text-red-600">{errors.shipper[name].message}</p>
                )
            );
        } else if (props.type === LoadStopType.RECEIVER) {
            return (
                errors.receiver &&
                errors.receiver[name] &&
                errors.receiver[name].message && (
                    <p className="mt-2 text-sm text-red-600">{errors.receiver[name].message}</p>
                )
            );
        } else {
            return (
                errors?.stops &&
                errors?.stops[index] &&
                errors?.stops[index][name] && (
                    <p className="mt-2 text-sm text-red-600">{errors?.stops[index][name]?.message}</p>
                )
            );
        }
    };

    const fieldId = (name: string): any => {
        if (props.type === LoadStopType.SHIPPER) {
            return `shipper.${name}`;
        } else if (props.type === LoadStopType.RECEIVER) {
            return `receiver.${name}`;
        } else {
            return `stops.${index}.${name}`;
        }
    };

    return (
        <div className={`col-span-6 pl-4 border-l-4 ${borderColor()}`}>
            {index !== undefined && (
                <input
                    {...register(fieldId('stopIndex'), {
                        valueAsNumber: true,
                    })}
                    type="hidden"
                    value={index}
                ></input>
            )}
            <div className="flex flex-row">
                <div className="flex-1 mb-3 font-medium leading-6 text-gray-900 uppercase">{title()}</div>
                {props.type === LoadStopType.STOP && (
                    <div>
                        <a
                            className="text-sm"
                            onClick={() => {
                                onRemoveStop();
                            }}
                        >
                            Remove Stop
                        </a>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor={fieldId('name')} className="block text-sm font-medium text-gray-700">
                        Business Name
                    </label>
                    <input
                        {...register(fieldId('name'), { required: 'Business Name is required' })}
                        type="text"
                        id={fieldId('name')}
                        autoComplete="business-name"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errorMessage(errors, 'name')}
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor={fieldId('street')} className="block text-sm font-medium text-gray-700">
                        Street Address
                    </label>
                    <input
                        {...register(fieldId('street'), { required: 'Street Address is required' })}
                        type="text"
                        id={fieldId('street')}
                        autoComplete="street-address"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errorMessage(errors, 'street')}
                </div>

                <div className="col-span-6 sm:col-span-6 lg:col-span-2">
                    <label htmlFor={fieldId('city')} className="block text-sm font-medium text-gray-700">
                        City
                    </label>
                    <input
                        {...register(fieldId('city'), { required: 'City is required' })}
                        type="text"
                        id={fieldId('city')}
                        autoComplete="city"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errorMessage(errors, 'city')}
                </div>

                <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                    <label htmlFor={fieldId('state')} className="block text-sm font-medium text-gray-700">
                        State / Province
                    </label>
                    <input
                        {...register(fieldId('state'), { required: 'State is required' })}
                        type="text"
                        id={fieldId('state')}
                        autoComplete="state"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errorMessage(errors, 'state')}
                </div>

                <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                    <label htmlFor={fieldId('zip')} className="block text-sm font-medium text-gray-700">
                        Zip / Postal Code
                    </label>
                    <input
                        {...register(fieldId('zip'), { required: 'State is required' })}
                        type="text"
                        id={fieldId('zip')}
                        autoComplete="postal-code"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errorMessage(errors, 'zip')}
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor={fieldId('date')} className="block text-sm font-medium text-gray-700">
                        Pick Up Date
                    </label>
                    <Controller
                        control={control}
                        rules={{ required: 'Pick Up Date is required' }}
                        name={fieldId('date')}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <>
                                <div className="relative mt-1">
                                    <DayPickerInput
                                        onDayChange={onChange}
                                        value={value}
                                        inputProps={{ type: 'text', id: fieldId('date'), autoComplete: 'date' }}
                                    />
                                    <div className="absolute right-0 flex items-center pr-3 pointer-events-none inset-y-1">
                                        <CalendarIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                                    </div>
                                </div>
                                {error && <p className="mt-2 text-sm text-red-600">{error?.message}</p>}
                            </>
                        )}
                    />
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor={fieldId('time')} className="block text-sm font-medium text-gray-700">
                        Pick Up Time
                    </label>

                    <Controller
                        control={control}
                        rules={{
                            required: 'Pick Up Time is required',
                            minLength: { value: 5, message: 'Time is invalid' },
                        }}
                        name={fieldId('time')}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <>
                                <div className="relative mt-1">
                                    <TimeField
                                        value={value}
                                        onChange={onChange}
                                        input={
                                            <input
                                                type="text"
                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                id={fieldId('time')}
                                            />
                                        }
                                    />
                                    <div className="absolute right-0 flex items-center pr-3 pointer-events-none inset-y-1">
                                        <ClockIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                                    </div>
                                </div>
                                {error && <p className="mt-2 text-sm text-red-600">{error?.message}</p>}
                            </>
                        )}
                    />
                </div>
            </div>
        </div>
    );
};

export default LoadFormStop;
