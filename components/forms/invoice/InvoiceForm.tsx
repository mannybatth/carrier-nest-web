import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, PlusSmIcon, SelectorIcon } from '@heroicons/react/outline';
import { Prisma } from '@prisma/client';
import classNames from 'classnames';
import React, { Fragment } from 'react';
import { Controller, useFieldArray, UseFormReturn } from 'react-hook-form';
import { ExpandedInvoice } from '../../../interfaces/models';
import InvoiceFormItem from './InvoiceFormItem';

type Props = {
    formHook: UseFormReturn<ExpandedInvoice>;
};

const invoiceTermOptions = [
    {
        value: 0,
        label: 'Due on Receipt',
    },
    {
        value: 15,
        label: 'Net 15 days',
    },
    {
        value: 30,
        label: 'Net 30 days',
    },
    {
        value: 45,
        label: 'Net 45 days',
    },
];

const InvoiceForm: React.FC<Props> = ({
    formHook: {
        register,
        setValue,
        control,
        formState: { errors },
    },
}: Props) => {
    const {
        fields: itemFields,
        append: appendItem,
        remove: removeItem,
    } = useFieldArray({ name: 'extraItems', control });

    return (
        <>
            {itemFields.map((field, i) => (
                <InvoiceFormItem
                    key={i}
                    {...{ register, errors, control }}
                    index={i}
                    onRemoveStop={() => removeItem(i)}
                />
            ))}

            <div>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center">
                        <button
                            type="button"
                            className="inline-flex items-center px-4 py-0.5 text-xs font-medium leading-5 text-gray-700 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            onClick={() => {
                                appendItem({
                                    title: '',
                                    amount: new Prisma.Decimal(0),
                                });
                            }}
                        >
                            <PlusSmIcon className="-ml-1.5 mr-1 h-4 w-4 text-gray-400" aria-hidden="true" />
                            <span>Add Invoice Item</span>
                        </button>
                    </div>
                </div>
            </div>

            <Controller
                control={control}
                rules={{ required: 'Invoice Terms is required' }}
                name="dueNetDays"
                defaultValue={0}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <>
                        <Listbox value={value} onChange={onChange}>
                            {({ open }) => (
                                <>
                                    <Listbox.Label className="block text-sm font-medium text-gray-700">
                                        Invoice Terms
                                    </Listbox.Label>
                                    <div className="relative mt-1">
                                        <Listbox.Button className="relative w-full py-2 pl-3 pr-10 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <span className="block truncate">
                                                {invoiceTermOptions.find((option) => option.value === value)?.label}
                                            </span>
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                                <SelectorIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                                            </span>
                                        </Listbox.Button>

                                        <Transition
                                            show={open}
                                            as={Fragment}
                                            leave="transition ease-in duration-100"
                                            leaveFrom="opacity-100"
                                            leaveTo="opacity-0"
                                        >
                                            <Listbox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                                {invoiceTermOptions.map(({ value, label }) => (
                                                    <Listbox.Option
                                                        key={value}
                                                        className={({ active }) =>
                                                            classNames(
                                                                active ? 'text-white bg-blue-600' : 'text-gray-900',
                                                                'select-none relative py-2 pl-3 pr-9 cursor-pointer',
                                                            )
                                                        }
                                                        value={value}
                                                    >
                                                        {({ selected, active }) => (
                                                            <>
                                                                <span
                                                                    className={classNames(
                                                                        selected ? 'font-semibold' : 'font-normal',
                                                                        'block truncate',
                                                                    )}
                                                                >
                                                                    {label}
                                                                </span>

                                                                {selected ? (
                                                                    <span
                                                                        className={classNames(
                                                                            active ? 'text-white' : 'text-blue-600',
                                                                            'absolute inset-y-0 right-0 flex items-center pr-4',
                                                                        )}
                                                                    >
                                                                        <CheckIcon
                                                                            className="w-5 h-5"
                                                                            aria-hidden="true"
                                                                        />
                                                                    </span>
                                                                ) : null}
                                                            </>
                                                        )}
                                                    </Listbox.Option>
                                                ))}
                                            </Listbox.Options>
                                        </Transition>
                                    </div>
                                </>
                            )}
                        </Listbox>

                        {error && <p className="mt-2 text-sm text-red-600">{error.message}</p>}
                    </>
                )}
            />
        </>
    );
};

export default InvoiceForm;
