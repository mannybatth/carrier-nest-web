import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, PlusSmallIcon } from '@heroicons/react/24/outline';
import { Customer, LoadStopType, Prisma } from '@prisma/client';
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { Controller, useFieldArray, UseFormReturn } from 'react-hook-form';
import { ExpandedLoad } from '../../../interfaces/models';
import { useDebounce } from '../../../lib/debounce';
import { SearchCustomer, searchCustomersByName } from '../../../lib/rest/customer';
import Spinner from '../../Spinner';
import CreateCustomerModal from '../customer/CreateCustomerModal';
import MoneyInput from '../MoneyInput';
import LoadFormStop from './LoadFormStop';

type Props = {
    formHook: UseFormReturn<ExpandedLoad>;
    openAddCustomerFromProp?: boolean;
    setOpenAddCustomerFromProp?: React.Dispatch<React.SetStateAction<boolean>>;
    showMissingCustomerLabel?: boolean;
    setShowMissingCustomerLabel?: React.Dispatch<React.SetStateAction<boolean>>;
    prefillName?: string;
    setPrefillName?: React.Dispatch<React.SetStateAction<string>>;
    parentStopsFieldArray?: ReturnType<typeof useFieldArray<Partial<ExpandedLoad>, 'stops', 'id'>>;
    mouseHoverOverField?: (event: React.MouseEvent<HTMLInputElement>) => void;
    mouseHoverOutField?: (event: React.MouseEvent<HTMLInputElement>) => void;
};

const LoadForm: React.FC<Props> = ({
    formHook: {
        register,
        setValue,
        getValues,
        watch,
        control,
        formState: { errors },
    },
    openAddCustomerFromProp = false,
    setOpenAddCustomerFromProp,
    showMissingCustomerLabel,
    setShowMissingCustomerLabel,
    prefillName,
    setPrefillName,
    parentStopsFieldArray,
    mouseHoverOverField,
    mouseHoverOutField,
}) => {
    const [openAddCustomer, setOpenAddCustomer] = useState(false);

    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [customerSearchResults, setCustomerSearchResults] = React.useState<SearchCustomer[]>(null);
    const [debouncedCustomerSearchTerm, setDebouncedCustomerSearchTerm] = useDebounce(customerSearchTerm, 500);

    const {
        fields: stopFields,
        append: appendStop,
        remove: removeStop,
    } = parentStopsFieldArray || useFieldArray({ name: 'stops', control });

    useEffect(() => {
        if (!debouncedCustomerSearchTerm) {
            setIsSearchingCustomer(false);
            setCustomerSearchResults(null);
            return;
        }

        async function searchFetch() {
            const customers = await searchCustomersByName(debouncedCustomerSearchTerm);
            setIsSearchingCustomer(false);

            const noResults = customers.length === 0;
            if (noResults) {
                setCustomerSearchResults([]);
                return;
            }

            setCustomerSearchResults(customers);
        }

        searchFetch();
    }, [debouncedCustomerSearchTerm]);

    const onNewCustomerCreate = (customer: Customer) => {
        setValue('customer', customer, { shouldValidate: true });
    };

    return (
        <>
            <CreateCustomerModal
                onCreate={onNewCustomerCreate}
                show={openAddCustomer || openAddCustomerFromProp}
                onClose={() => {
                    setOpenAddCustomer(false);
                    setOpenAddCustomerFromProp(false);
                    setShowMissingCustomerLabel(false);
                    setPrefillName(null);
                }}
                showMissingCustomerLabel={showMissingCustomerLabel}
                prefillName={prefillName}
            ></CreateCustomerModal>
            <div className="relative mt-3 md:mt-0 md:col-span-2">
                <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6">
                        <Controller
                            control={control}
                            rules={{ required: 'Customer is required' }}
                            name="customer"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Combobox
                                    as="div"
                                    value={value || ''}
                                    onChange={(selectedCustomer: Customer) => {
                                        setCustomerSearchTerm('');
                                        setDebouncedCustomerSearchTerm('');
                                        onChange(selectedCustomer);
                                    }}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Combobox.Label className="flex-1 block text-sm font-medium text-gray-700 ">
                                            Customer
                                        </Combobox.Label>
                                        <a className="text-sm" onClick={() => setOpenAddCustomer(true)}>
                                            Add Customer
                                        </a>
                                    </div>
                                    <div className="relative mt-1">
                                        <Combobox.Input
                                            autoComplete="off"
                                            name="customerName"
                                            className="w-full py-2 pl-3 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                                            onChange={(e) => {
                                                if (e.target.value.length > 0) {
                                                    setIsSearchingCustomer(true);
                                                }
                                                setCustomerSearchTerm(e.target.value);
                                            }}
                                            onMouseEnter={mouseHoverOverField}
                                            onMouseLeave={mouseHoverOutField}
                                            displayValue={(customer: Customer) => customer?.name || null}
                                        />
                                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center px-2 rounded-r-md focus:outline-none">
                                            <ChevronUpDownIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                                        </Combobox.Button>

                                        {customerSearchTerm.length > 0 && (
                                            <Combobox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                                {isSearchingCustomer ? (
                                                    <div className="relative px-4 py-2">
                                                        <Spinner className="text-gray-700"></Spinner>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {customerSearchResults?.length > 0 &&
                                                            customerSearchResults.map((customer) => (
                                                                <Combobox.Option
                                                                    key={customer.id}
                                                                    value={customer}
                                                                    className={({ active }) =>
                                                                        classNames(
                                                                            'relative select-none py-2 pl-3 pr-9 cursor-pointer',
                                                                            active
                                                                                ? 'bg-blue-600 text-white'
                                                                                : 'text-gray-900',
                                                                        )
                                                                    }
                                                                >
                                                                    {({ active, selected }) => (
                                                                        <>
                                                                            <span
                                                                                className={classNames(
                                                                                    'block truncate',
                                                                                    selected && 'font-semibold',
                                                                                )}
                                                                            >
                                                                                {customer.name}
                                                                            </span>

                                                                            {selected && (
                                                                                <span
                                                                                    className={classNames(
                                                                                        'absolute inset-y-0 right-0 flex items-center pr-4',
                                                                                        active
                                                                                            ? 'text-white'
                                                                                            : 'text-blue-600',
                                                                                    )}
                                                                                >
                                                                                    <CheckIcon
                                                                                        className="w-5 h-5"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </Combobox.Option>
                                                            ))}

                                                        {customerSearchResults?.length === 0 && (
                                                            <div className="relative px-4 py-2 text-gray-700 cursor-default select-none">
                                                                Nothing found.
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </Combobox.Options>
                                        )}
                                    </div>

                                    {error && <p className="text-sm text-red-600">{error.message}</p>}
                                </Combobox>
                            )}
                        />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                        <label htmlFor="reference-num" className="block text-sm font-medium text-gray-700">
                            Load/Order #
                        </label>
                        <input
                            {...register('refNum', { required: 'Load/Order # is required' })}
                            type="text"
                            id="reference-num"
                            autoComplete="reference-num"
                            onMouseEnter={mouseHoverOverField}
                            onMouseLeave={mouseHoverOutField}
                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {errors.refNum && <p className="text-sm text-red-600">{errors.refNum?.message}</p>}
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                        <label htmlFor="rate" className="block text-sm font-medium text-gray-700">
                            Rate
                        </label>
                        <div className="mt-1">
                            <Controller
                                control={control}
                                rules={{ required: 'Rate is required' }}
                                name="rate"
                                render={({ field: { onChange, value }, fieldState: { error } }) => (
                                    <>
                                        <MoneyInput
                                            id="rate"
                                            name="loadRate"
                                            onMouseEnter={mouseHoverOverField}
                                            onMouseLeave={mouseHoverOutField}
                                            value={(value as Prisma.Decimal)?.toString() || ''}
                                            onChange={(e) =>
                                                onChange(e.target.value ? new Prisma.Decimal(e.target.value) : '')
                                            }
                                        ></MoneyInput>
                                        {error && <p className="text-sm text-red-600">{error?.message}</p>}
                                    </>
                                )}
                            />
                        </div>
                    </div>

                    <LoadFormStop
                        {...{ register, errors, control, setValue, getValues, watch }}
                        type={LoadStopType.SHIPPER}
                        mouseHoverOutField={mouseHoverOutField}
                        mouseHoverOverField={mouseHoverOverField}
                    />

                    {stopFields.map((field, i) => (
                        <LoadFormStop
                            key={field.id}
                            {...{ register, errors, control, setValue, getValues, watch }}
                            type={LoadStopType.STOP}
                            totalStops={stopFields.length}
                            index={i}
                            onRemoveStop={() => removeStop(i)}
                            mouseHoverOutField={mouseHoverOutField}
                            mouseHoverOverField={mouseHoverOverField}
                        />
                    ))}

                    <div className="col-span-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center">
                                <button
                                    type="button"
                                    className="inline-flex items-center px-4 py-0.5 text-xs font-medium leading-5 text-gray-700 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={() => {
                                        appendStop({
                                            id: null,
                                            type: LoadStopType.STOP,
                                            name: ``,
                                            street: '',
                                            city: '',
                                            state: '',
                                            zip: '',
                                            country: 'US',
                                            date: new Date(),
                                            time: '',
                                            stopIndex: stopFields.length,
                                            longitude: null,
                                            latitude: null,
                                            poNumbers: '',
                                            pickUpNumbers: '',
                                            referenceNumbers: '',
                                        });
                                    }}
                                >
                                    <PlusSmallIcon className="-ml-1.5 mr-1 h-4 w-4 text-gray-400" aria-hidden="true" />
                                    <span>Add Stop</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <LoadFormStop
                        {...{ register, errors, control, setValue, getValues, watch }}
                        type={LoadStopType.RECEIVER}
                        mouseHoverOutField={mouseHoverOutField}
                        mouseHoverOverField={mouseHoverOverField}
                    />
                </div>
            </div>
        </>
    );
};

export default LoadForm;
