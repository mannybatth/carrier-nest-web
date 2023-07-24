import { XIcon } from '@heroicons/react/outline';
import { Prisma } from '@prisma/client';
import React from 'react';
import { Control, Controller, FieldErrors, UseFormRegister } from 'react-hook-form';
import { ExpandedInvoice } from '../../../interfaces/models';
import MoneyInput from '../MoneyInput';

type Props = {
    index?: number;
    onRemoveStop?: () => void;
    register: UseFormRegister<ExpandedInvoice>;
    errors: FieldErrors<ExpandedInvoice>;
    control: Control<ExpandedInvoice, any>;
};

const InvoiceFormItem: React.FC<Props> = ({ register, errors, control, index, onRemoveStop, ...props }) => {
    const errorMessage = (errors: FieldErrors<ExpandedInvoice>, name: string) => {
        return (
            errors?.extraItems &&
            errors?.extraItems[index] &&
            errors?.extraItems[index][name] && (
                <p className="mt-2 text-sm text-red-600">{errors?.extraItems[index][name]?.message}</p>
            )
        );
    };

    const fieldId = (name: string): any => {
        return `extraItems.${index}.${name}`;
    };

    return (
        <div className="grid items-start grid-cols-12 gap-4 mb-4">
            <div className="col-span-6 sm:col-span-7">
                <label htmlFor={fieldId('title')} className="block text-sm font-medium text-gray-700">
                    Item Title
                </label>
                <input
                    {...register(fieldId('title'), { required: 'Item title is required' })}
                    type="text"
                    id={fieldId('title')}
                    autoComplete="extraItems.title"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errorMessage(errors, 'title')}
            </div>

            <div className="col-span-6 sm:col-span-5">
                <label htmlFor={fieldId('amount')} className="block text-sm font-medium text-gray-700">
                    Amount
                </label>
                <div className="flex flex-row items-center mt-1 space-x-2">
                    <div className="flex-1">
                        <Controller
                            control={control}
                            rules={{ required: 'Amount is required' }}
                            name={fieldId('amount')}
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <>
                                    <MoneyInput
                                        id={fieldId('amount')}
                                        allowNegative={true}
                                        value={(value as Prisma.Decimal)?.toString() || ''}
                                        onChange={(e) =>
                                            onChange(e.target.value ? new Prisma.Decimal(e.target.value) : '')
                                        }
                                    ></MoneyInput>
                                    {error && <p className="mt-2 text-sm text-red-600">{error?.message}</p>}
                                </>
                            )}
                        />
                    </div>
                    <button
                        type="button"
                        className="flex items-center justify-center w-8 h-8 text-gray-500 bg-white rounded-full hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={onRemoveStop}
                    >
                        <span className="sr-only">Remove Invoice Item</span>
                        <XIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvoiceFormItem;
