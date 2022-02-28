import React from 'react';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import { CalendarIcon, ClockIcon } from '@heroicons/react/outline';
import TimeInput from '../TimeInput';
import { LoadStopType } from '@prisma/client';

export type LoadFormStopProps = {
    type: LoadStopType;
    totalStops?: number;
    index?: number;
    onRemoveStop?: (index: number) => void;
};

const LoadFormStop: React.FC<LoadFormStopProps> = (props) => {
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
                return props.totalStops > 1 ? `Stop #${props.index + 1}` : 'Stop';
        }
    };

    return (
        <div className={`col-span-6 pl-4 border-l-4 ${borderColor()}`}>
            <div className="flex flex-row">
                <div className="flex-1 mb-3 font-medium leading-6 text-gray-900 uppercase ">{title()}</div>
                {props.type === LoadStopType.STOP && (
                    <div>
                        <a
                            className="text-sm"
                            onClick={() => {
                                props.onRemoveStop(props.index);
                            }}
                        >
                            Remove Stop
                        </a>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="business-name" className="block text-sm font-medium text-gray-700">
                        Business Name
                    </label>
                    <input
                        type="text"
                        name="business-name"
                        id="business-name"
                        autoComplete="business-name"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="street-address" className="block text-sm font-medium text-gray-700">
                        Street Address
                    </label>
                    <input
                        type="text"
                        name="street-address"
                        id="street-address"
                        autoComplete="street-address"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div className="col-span-6 sm:col-span-6 lg:col-span-2">
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                        City
                    </label>
                    <input
                        type="text"
                        name="city"
                        id="city"
                        autoComplete="address-level2"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                    <label htmlFor="region" className="block text-sm font-medium text-gray-700">
                        State / Province
                    </label>
                    <input
                        type="text"
                        name="region"
                        id="region"
                        autoComplete="state"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                    <label htmlFor="postal-code" className="block text-sm font-medium text-gray-700">
                        ZIP / Postal Code
                    </label>
                    <input
                        type="text"
                        name="postal-code"
                        id="postal-code"
                        autoComplete="postal-code"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="pick-up-date" className="block text-sm font-medium text-gray-700">
                        Pick Up Date
                    </label>
                    <div className="relative mt-1">
                        <DayPickerInput inputProps={{ type: 'text', id: 'pick-up-date' }} />
                        <div className="absolute right-0 flex items-center pr-3 pointer-events-none inset-y-1">
                            <CalendarIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                        </div>
                    </div>
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="pick-up-time" className="block text-sm font-medium text-gray-700">
                        Pick Up Time
                    </label>

                    <div className="relative mt-1">
                        <TimeInput
                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            initialTime="13:37"
                            onChange={(event) => console.log(event)}
                        />
                        <div className="absolute right-0 flex items-center pr-3 pointer-events-none inset-y-1">
                            <ClockIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadFormStop;
