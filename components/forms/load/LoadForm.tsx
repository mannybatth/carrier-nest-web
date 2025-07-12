'use client';

import { Combobox } from '@headlessui/react';
import {
    CheckIcon,
    ChevronUpDownIcon,
    PlusSmallIcon,
    UserPlusIcon,
    ChevronDownIcon,
    ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { type Customer, LoadStopType, Prisma } from '@prisma/client';
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { Controller, useFieldArray, type UseFormReturn, useForm } from 'react-hook-form';
import type { ExpandedLoad } from '../../../interfaces/models';
import { useDebounce } from '../../../lib/debounce';
import {
    type SearchCustomer,
    searchCustomersByName,
    createCustomer,
    getCustomerById,
} from '../../../lib/rest/customer';
import Spinner from '../../Spinner';
import CustomerForm from '../customer/CustomerForm';
import MoneyInput from '../MoneyInput';
import LoadFormStop from './LoadFormStop';
import { useRouter } from 'next/navigation';
import type { AICustomerDetails } from '../../../interfaces/ai';

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
    loading?: boolean;
    onResetForm?: () => void;
    isEditMode?: boolean;
    extractedCustomerDetails?: AICustomerDetails;
};

const LoadForm: React.FC<Props> = ({
    formHook: {
        register,
        setValue,
        getValues,
        watch,
        control,
        reset,
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
    loading = false,
    onResetForm,
    isEditMode = false,
    extractedCustomerDetails,
}) => {
    const [openAddCustomer, setOpenAddCustomer] = useState(false);
    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [customerFormLoading, setCustomerFormLoading] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [customerSearchResults, setCustomerSearchResults] = React.useState<SearchCustomer[]>(null);
    const debouncedCustomerSearchTerm = useDebounce(customerSearchTerm, 500);

    const { fields: stopFields, append: appendStop, remove: removeStop } = useFieldArray({ name: 'stops', control });
    const stopsFieldArray = parentStopsFieldArray || { fields: stopFields, append: appendStop, remove: removeStop };

    const [expandedSections, setExpandedSections] = useState({
        customer: true,
        shipper: true,
        stops: true,
        receiver: true,
    });

    // Customer form hook
    const customerFormHook = useForm<Customer>({
        mode: 'onChange',
        reValidateMode: 'onChange',
    });

    const router = useRouter();

    // Handle opening customer form when triggered from parent
    useEffect(() => {
        if (openAddCustomerFromProp) {
            setShowCustomerForm(true);
            setOpenAddCustomerFromProp(false);
        }
    }, [openAddCustomerFromProp, setOpenAddCustomerFromProp]);

    // Pre-populate customer form with extracted details
    useEffect(() => {
        if (extractedCustomerDetails && showCustomerForm) {
            if (extractedCustomerDetails.name) {
                customerFormHook.setValue('name', extractedCustomerDetails.name);
            }
            if (extractedCustomerDetails.contact_email) {
                customerFormHook.setValue('contactEmail', extractedCustomerDetails.contact_email);
            }
            if (extractedCustomerDetails.billing_email) {
                customerFormHook.setValue('billingEmail', extractedCustomerDetails.billing_email);
            }
            if (extractedCustomerDetails.payment_status_email) {
                customerFormHook.setValue('paymentStatusEmail', extractedCustomerDetails.payment_status_email);
            }
            if (extractedCustomerDetails.address) {
                const addr = extractedCustomerDetails.address;
                if (addr.street) customerFormHook.setValue('street', addr.street);
                if (addr.city) customerFormHook.setValue('city', addr.city);
                if (addr.state) customerFormHook.setValue('state', addr.state);
                if (addr.zip) customerFormHook.setValue('zip', addr.zip);
                if (addr.country) customerFormHook.setValue('country', addr.country);
            }
        }
    }, [extractedCustomerDetails, showCustomerForm, customerFormHook]);

    // Pre-fill customer name if provided
    useEffect(() => {
        if (prefillName && showCustomerForm) {
            customerFormHook.setValue('name', prefillName);
        }
    }, [prefillName, showCustomerForm, customerFormHook]);

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
        setShowCustomerForm(false);
        // Reset customer form
        customerFormHook.reset();
        // Clear any prefilled data
        if (setShowMissingCustomerLabel) setShowMissingCustomerLabel(false);
        if (setPrefillName) setPrefillName(null);
    };

    const onExistingCustomerSelect = async (searchCustomer: SearchCustomer) => {
        try {
            // Fetch full customer data using the ID
            const fullCustomer = await getCustomerById(searchCustomer.id);
            setValue('customer', fullCustomer, { shouldValidate: true });
            setShowCustomerForm(false);
            // Reset customer form
            customerFormHook.reset();
            // Clear any prefilled data
            if (setShowMissingCustomerLabel) setShowMissingCustomerLabel(false);
            if (setPrefillName) setPrefillName(null);
        } catch (error) {
            console.error('Error fetching customer details:', error);
            // Fallback: create a minimal customer object with available data
            const customer: Customer = {
                id: searchCustomer.id,
                name: searchCustomer.name,
                createdAt: new Date(),
                updatedAt: new Date(),
                contactEmail: '',
                billingEmail: '',
                paymentStatusEmail: '',
                street: '',
                city: '',
                state: '',
                zip: '',
                country: '',
                carrierId: '',
            };
            setValue('customer', customer, { shouldValidate: true });
            setShowCustomerForm(false);
            customerFormHook.reset();
            if (setShowMissingCustomerLabel) setShowMissingCustomerLabel(false);
            if (setPrefillName) setPrefillName(null);
        }
    };

    const handleCustomerFormSubmit = async (data: Customer) => {
        setCustomerFormLoading(true);
        try {
            const customerData: Partial<Customer> = {
                name: data.name,
                contactEmail: data.contactEmail || '',
                billingEmail: data.billingEmail || '',
                paymentStatusEmail: data.paymentStatusEmail || '',
                street: data.street || '',
                city: data.city || '',
                state: data.state || '',
                zip: data.zip || '',
                country: data.country || '',
            };
            const newCustomer = await createCustomer(customerData);
            onNewCustomerCreate(newCustomer);
        } catch (error) {
            console.error('Error creating customer:', error);
        } finally {
            setCustomerFormLoading(false);
        }
    };

    const handleAddCustomerClick = () => {
        setShowCustomerForm(true);
    };

    const handleBackToLoadForm = () => {
        setShowCustomerForm(false);
        customerFormHook.reset();
        if (setShowMissingCustomerLabel) setShowMissingCustomerLabel(false);
        if (setPrefillName) setPrefillName(null);
    };

    const toggleSection = (section) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    return (
        <>
            {/* Main Container - Fixed height with proper overflow handling */}
            <div className="flex flex-col h-full relative overflow-hidden">
                {/* Customer Form - Animated Slide In */}
                <div
                    className={`absolute inset-0 flex flex-col transform transition-all duration-500 ease-out z-20 bg-white ${
                        showCustomerForm ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                    }`}
                >
                    {/* Customer Form Header - Fixed */}
                    <div
                        className={`flex-shrink-0 p-6 border-b border-gray-200 bg-gray-50 transition-all duration-500 delay-75 ${
                            showCustomerForm ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={handleBackToLoadForm}
                                        className="mr-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105"
                                    >
                                        <ArrowLeftIcon className="h-5 w-5" />
                                    </button>
                                    <div
                                        className={`transition-all duration-500 delay-100 ${
                                            showCustomerForm ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                                        }`}
                                    >
                                        <h2 className="text-xl font-bold text-gray-900">Create New Customer</h2>
                                        {showMissingCustomerLabel && (
                                            <p className="mt-1 text-sm text-gray-500">
                                                The customer found doesn&apos;t exist, let&apos;s create it.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Form Content - Scrollable with proper spacing */}
                    <div
                        className={`flex-1 flex flex-col transition-all duration-500 delay-150 overflow-hidden ${
                            showCustomerForm ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                    >
                        {/* Form Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <form onSubmit={customerFormHook.handleSubmit(handleCustomerFormSubmit)}>
                                <CustomerForm
                                    formHook={customerFormHook}
                                    condensed={false}
                                    onExistingCustomerFound={onExistingCustomerSelect}
                                />
                            </form>
                        </div>

                        {/* Customer Form Footer - Fixed at bottom */}
                        <div
                            className={`flex-shrink-0 mx-6 mb-6 p-6 border border-gray-200 bg-white rounded-lg shadow-sm transition-all duration-500 delay-200 ${
                                showCustomerForm ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={handleBackToLoadForm}
                                    className="inline-flex justify-center items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                                    Back to Load Details
                                </button>
                                <button
                                    type="submit"
                                    form="customer-form"
                                    onClick={customerFormHook.handleSubmit(handleCustomerFormSubmit)}
                                    disabled={customerFormLoading}
                                    className={`inline-flex justify-center items-center px-8 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md ${
                                        customerFormLoading ? 'opacity-75 cursor-not-allowed' : ''
                                    }`}
                                >
                                    {customerFormLoading ? (
                                        <>
                                            <svg
                                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            Creating Customer...
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4 mr-2"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            Create Customer
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Load Form - Main Content */}
                <div
                    className={`flex flex-col h-full transform transition-all duration-500 ease-out ${
                        showCustomerForm
                            ? '-translate-x-full opacity-75 scale-95'
                            : 'translate-x-0 opacity-100 scale-100'
                    }`}
                >
                    {/* Form Content - Scrollable with proper bottom padding */}
                    <div className="flex-1 overflow-y-auto p-6 pb-32">
                        <div className="space-y-8">
                            {/* Customer & Load Info Section */}
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-900">Customer & Load Information</h2>
                                    <button
                                        type="button"
                                        onClick={() => toggleSection('customer')}
                                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <ChevronDownIcon
                                            className={`h-5 w-5 transition-transform ${
                                                expandedSections.customer ? '' : '-rotate-90'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {expandedSections.customer && (
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label htmlFor="customer" className="block text-sm text-gray-500">
                                                    Customer
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={handleAddCustomerClick}
                                                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 transform hover:scale-105"
                                                >
                                                    <UserPlusIcon className="mr-1 h-3 w-3" />
                                                    Add Customer
                                                </button>
                                            </div>

                                            <Controller
                                                control={control}
                                                rules={{ required: 'Customer is required' }}
                                                name="customer"
                                                render={({ field, fieldState: { error } }) => (
                                                    <div>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                                            </div>
                                                            <Combobox
                                                                as="div"
                                                                value={field.value || ''}
                                                                onChange={(selectedCustomer: Customer) => {
                                                                    setCustomerSearchTerm('');
                                                                    field.onChange(selectedCustomer);
                                                                }}
                                                            >
                                                                <Combobox.Input
                                                                    autoComplete="off"
                                                                    name="customerName"
                                                                    className="w-full pl-10 pr-10 px-4 py-3 bg-gray-50 text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                                                    onChange={(e) => {
                                                                        if (e.target.value.length > 0) {
                                                                            setIsSearchingCustomer(true);
                                                                        }
                                                                        setCustomerSearchTerm(e.target.value);
                                                                    }}
                                                                    onMouseEnter={mouseHoverOverField}
                                                                    onMouseLeave={mouseHoverOutField}
                                                                    displayValue={(customer: Customer) =>
                                                                        customer?.name || null
                                                                    }
                                                                    placeholder="Search customers..."
                                                                />
                                                                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center px-3">
                                                                    <ChevronUpDownIcon className="w-5 h-5 text-gray-400" />
                                                                </Combobox.Button>

                                                                {customerSearchTerm.length > 0 && (
                                                                    <Combobox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto bg-white shadow-lg max-h-60 focus:outline-none">
                                                                        {isSearchingCustomer ? (
                                                                            <div className="px-4 py-3">
                                                                                <Spinner className="text-gray-700" />
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                {customerSearchResults?.length > 0 &&
                                                                                    customerSearchResults.map(
                                                                                        (customer) => (
                                                                                            <Combobox.Option
                                                                                                key={customer.id}
                                                                                                value={customer}
                                                                                                className={({
                                                                                                    active,
                                                                                                }) =>
                                                                                                    classNames(
                                                                                                        'relative select-none py-3 pl-4 pr-9 cursor-pointer',
                                                                                                        active
                                                                                                            ? 'bg-blue-50 text-blue-900'
                                                                                                            : 'text-gray-900',
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                {({
                                                                                                    active,
                                                                                                    selected,
                                                                                                }) => (
                                                                                                    <>
                                                                                                        <span
                                                                                                            className={classNames(
                                                                                                                'block truncate font-medium',
                                                                                                                selected &&
                                                                                                                    'font-bold',
                                                                                                            )}
                                                                                                        >
                                                                                                            {
                                                                                                                customer.name
                                                                                                            }
                                                                                                        </span>
                                                                                                        {selected && (
                                                                                                            <span
                                                                                                                className={classNames(
                                                                                                                    'absolute inset-y-0 right-0 flex items-center pr-4',
                                                                                                                    active
                                                                                                                        ? 'text-blue-600'
                                                                                                                        : 'text-blue-500',
                                                                                                                )}
                                                                                                            >
                                                                                                                <CheckIcon className="w-5 h-5" />
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </>
                                                                                                )}
                                                                                            </Combobox.Option>
                                                                                        ),
                                                                                    )}
                                                                                {customerSearchResults?.length ===
                                                                                    0 && (
                                                                                    <div className="px-4 py-3 text-gray-500 text-sm">
                                                                                        Nothing found.
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </Combobox.Options>
                                                                )}
                                                            </Combobox>
                                                        </div>

                                                        {field.value && (
                                                            <div className="mt-3 p-3 bg-blue-50">
                                                                <p className="font-bold text-blue-900">
                                                                    {field.value.name}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {error && (
                                                            <p className="mt-1 text-sm text-red-600">{error.message}</p>
                                                        )}
                                                    </div>
                                                )}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label htmlFor="loadNum" className="block text-sm text-gray-500 mb-2">
                                                    Load/Order Number
                                                </label>
                                                <input
                                                    {...register('loadNum', { required: 'Load/Order # is required' })}
                                                    type="text"
                                                    id="loadNum"
                                                    placeholder="Enter load number"
                                                    className="w-full px-4 py-3 bg-gray-50 text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                                    onMouseEnter={mouseHoverOverField}
                                                    onMouseLeave={mouseHoverOutField}
                                                />
                                                {errors.loadNum && (
                                                    <p className="mt-1 text-sm text-red-600">
                                                        {errors.loadNum?.message}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="rate" className="block text-sm text-gray-500 mb-2">
                                                    Rate
                                                </label>
                                                <Controller
                                                    control={control}
                                                    rules={{ required: 'Rate is required' }}
                                                    name="rate"
                                                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                                                        <>
                                                            <MoneyInput
                                                                id="rate"
                                                                name="loadRate"
                                                                className="h-12 bg-gray-50 text-gray-900 font-bold focus:bg-white transition-all"
                                                                onMouseEnter={mouseHoverOverField}
                                                                onMouseLeave={mouseHoverOutField}
                                                                value={(value as Prisma.Decimal)?.toString() || ''}
                                                                onChange={(e) =>
                                                                    onChange(
                                                                        e.target.value
                                                                            ? new Prisma.Decimal(e.target.value)
                                                                            : '',
                                                                    )
                                                                }
                                                            />
                                                            {error && (
                                                                <p className="mt-1 text-sm text-red-600">
                                                                    {error?.message}
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Shipper Section */}
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-900">Pickup Location</h2>
                                    <button
                                        type="button"
                                        onClick={() => toggleSection('shipper')}
                                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <ChevronDownIcon
                                            className={`h-5 w-5 transition-transform ${
                                                expandedSections.shipper ? '' : '-rotate-90'
                                            }`}
                                        />
                                    </button>
                                </div>
                                {expandedSections.shipper && (
                                    <LoadFormStop
                                        {...{ register, errors, control, setValue, getValues, watch }}
                                        type={LoadStopType.SHIPPER}
                                        mouseHoverOutField={mouseHoverOutField}
                                        mouseHoverOverField={mouseHoverOverField}
                                        showAdditionalInfoPanel={true}
                                    />
                                )}
                            </div>

                            {/* Stops Section */}
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-900">
                                        Additional Stops{' '}
                                        {stopsFieldArray.fields.length > 0 && `(${stopsFieldArray.fields.length})`}
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => toggleSection('stops')}
                                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <ChevronDownIcon
                                            className={`h-5 w-5 transition-transform ${
                                                expandedSections.stops ? '' : '-rotate-90'
                                            }`}
                                        />
                                    </button>
                                </div>
                                {expandedSections.stops && (
                                    <div>
                                        {stopsFieldArray.fields.length > 0 ? (
                                            <div className="space-y-8">
                                                {stopsFieldArray.fields.map((field, i) => (
                                                    <LoadFormStop
                                                        key={field.id}
                                                        {...{ register, errors, control, setValue, getValues, watch }}
                                                        type={LoadStopType.STOP}
                                                        totalStops={stopsFieldArray.fields.length}
                                                        index={i}
                                                        onRemoveStop={() => stopsFieldArray.remove(i)}
                                                        mouseHoverOutField={mouseHoverOutField}
                                                        mouseHoverOverField={mouseHoverOverField}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 px-4 text-gray-500 bg-gray-50">
                                                <PlusSmallIcon className="mx-auto h-6 w-6 text-gray-400 mb-4" />
                                                <p className="text-lg font-medium">No additional stops</p>
                                                <p className="text-sm mt-1">
                                                    Add stops between pickup and delivery locations
                                                </p>
                                            </div>
                                        )}
                                        <div className="mt-6 flex justify-center">
                                            <button
                                                type="button"
                                                className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                                                onClick={() => {
                                                    stopsFieldArray.append({
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
                                                        stopIndex: stopsFieldArray.fields.length,
                                                        longitude: null,
                                                        latitude: null,
                                                        poNumbers: '',
                                                        pickUpNumbers: '',
                                                        referenceNumbers: '',
                                                    });
                                                }}
                                            >
                                                <PlusSmallIcon className="mr-2 h-5 w-5" />
                                                Add Stop
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Receiver Section */}
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-900">Delivery Location</h2>
                                    <button
                                        type="button"
                                        onClick={() => toggleSection('receiver')}
                                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <ChevronDownIcon
                                            className={`h-5 w-5 transition-transform ${
                                                expandedSections.receiver ? '' : '-rotate-90'
                                            }`}
                                        />
                                    </button>
                                </div>
                                {expandedSections.receiver && (
                                    <LoadFormStop
                                        {...{ register, errors, control, setValue, getValues, watch }}
                                        type={LoadStopType.RECEIVER}
                                        mouseHoverOutField={mouseHoverOutField}
                                        mouseHoverOverField={mouseHoverOverField}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fixed Action Buttons at Bottom */}
                    {!isEditMode && (
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
                            <div className="flex flex-row gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={onResetForm}
                                    className="inline-flex justify-center items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 mr-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                    Reset
                                </button>
                                <button
                                    type="submit"
                                    className={`inline-flex justify-center items-center px-8 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm ${
                                        loading ? 'opacity-75 cursor-not-allowed' : ''
                                    }`}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <svg
                                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            {isEditMode ? 'Updating...' : 'Creating...'}
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4 mr-2"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            {isEditMode ? 'Update Load' : 'Create Load'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {isEditMode && (
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4">
                            <div className="flex flex-row gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => router?.back()}
                                    className="inline-flex justify-center items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 mr-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`inline-flex justify-center items-center px-8 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm ${
                                        loading ? 'opacity-75 cursor-not-allowed' : ''
                                    }`}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <svg
                                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4 mr-2"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            Save Load
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default LoadForm;
