import React from 'react';
import { FieldValues, UseFormReturn } from 'react-hook-form';

type Props = {
    formHook: UseFormReturn<FieldValues, any>;
};

const CustomerForm: React.FC<Props> = ({ formHook: { register } }: Props) => {
    return (
        <div className="relative mt-3 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name
                    </label>
                    <input
                        {...register('name', { required: true })}
                        type="text"
                        id="name"
                        autoComplete="name"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
            </div>
        </div>
    );
};

export default CustomerForm;
