import React, { useState, useEffect } from 'react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Combobox } from '@headlessui/react';
import {
    CheckIcon,
    ChevronUpDownIcon,
    BuildingOffice2Icon,
    EnvelopeIcon,
    MapPinIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import classNames from 'classnames';
import { countryCodes } from '../../../interfaces/country-codes';
import { Customer } from '@prisma/client';
import { useDebounce } from '../../../lib/debounce';
import { type SearchCustomer, searchCustomersByName } from '../../../lib/rest/customer';
import Spinner from '../../Spinner';

type Props = {
    formHook: UseFormReturn<Customer>;
    condensed?: boolean;
    onExistingCustomerFound?: (customer: SearchCustomer) => void;
    isEditMode?: boolean;
    currentCustomerId?: string;
};

const CustomerForm: React.FC<Props> = ({
    formHook: {
        register,
        control,
        formState: { errors },
        watch,
        setValue,
    },
    condensed,
    onExistingCustomerFound,
    isEditMode = false,
    currentCustomerId,
}) => {
    // Customer search state
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [customerSearchResults, setCustomerSearchResults] = useState<SearchCustomer[]>(null);
    const debouncedCustomerSearchTerm = useDebounce(customerSearchTerm, 500);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [foundCustomer, setFoundCustomer] = useState<SearchCustomer | null>(null);

    // Watch the name field value
    const nameValue = watch('name');

    // Customer search effect
    useEffect(() => {
        if (!debouncedCustomerSearchTerm) {
            setIsSearchingCustomer(false);
            setCustomerSearchResults(null);
            setShowDuplicateWarning(false);
            setFoundCustomer(null);
            return;
        }

        async function searchFetch() {
            const customers = await searchCustomersByName(debouncedCustomerSearchTerm);
            setIsSearchingCustomer(false);

            const noResults = customers.length === 0;
            if (noResults) {
                setCustomerSearchResults([]);
                setShowDuplicateWarning(false);
                setFoundCustomer(null);
                return;
            }

            // Filter out the current customer from search results when in edit mode
            const filteredCustomers =
                isEditMode && currentCustomerId ? customers.filter((c) => c.id !== currentCustomerId) : customers;

            setCustomerSearchResults(filteredCustomers);

            // Check for exact or very close matches
            const exactMatch = customers.find(
                (c) =>
                    c.name.toLowerCase() === debouncedCustomerSearchTerm.toLowerCase() &&
                    // Don't show duplicate warning for the current customer being edited
                    !(isEditMode && currentCustomerId && c.id === currentCustomerId),
            );

            if (exactMatch) {
                setShowDuplicateWarning(true);
                setFoundCustomer(exactMatch);
            } else {
                setShowDuplicateWarning(false);
                setFoundCustomer(null);
            }
        }

        searchFetch();
    }, [debouncedCustomerSearchTerm, isEditMode, currentCustomerId]);

    // Update search term when name changes
    useEffect(() => {
        if (nameValue && nameValue.length > 0) {
            setIsSearchingCustomer(true);
            setCustomerSearchTerm(nameValue);
        } else {
            setCustomerSearchTerm('');
            setCustomerSearchResults(null);
        }
    }, [nameValue]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('[data-customer-search]')) {
                setCustomerSearchResults(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleUseExistingCustomer = () => {
        if (foundCustomer && onExistingCustomerFound) {
            onExistingCustomerFound(foundCustomer);
        }
    };

    const handleCreateAnyway = () => {
        setShowDuplicateWarning(false);
        setFoundCustomer(null);
        setCustomerSearchResults(null);
        setCustomerSearchTerm('');
    };
    // Modern input styles consistent with the app's design system
    const inputStyles =
        'block w-full px-4 py-2.5 sm:py-3 bg-gray-50 border border-transparent rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white hover:bg-white transition-all duration-200 sm:text-sm font-medium';
    const labelStyles = 'block text-sm font-semibold text-gray-700 mb-1.5 leading-tight';
    const errorStyles = 'mt-1.5 text-sm text-red-600 flex items-start font-medium';
    const selectStyles =
        'block w-full px-4 py-2.5 sm:py-3 bg-gray-50 border border-transparent rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white hover:bg-white transition-all duration-200 sm:text-sm font-medium';
    const cardStyles =
        'bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200';
    const sectionHeaderStyles = 'flex items-start gap-3 mb-4 sm:mb-6';

    return (
        <div className="space-y-4 sm:space-y-6">
            {condensed ? (
                <div className={cardStyles}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="customer-name" className={labelStyles}>
                                Customer Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register('name', { required: 'Customer name is required' })}
                                type="text"
                                id="customer-name"
                                placeholder="Enter customer name"
                                autoComplete="organization"
                                className={`${inputStyles} ${
                                    errors.name
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                                        : ''
                                }`}
                            />
                            {errors.name && (
                                <div className={errorStyles}>
                                    <svg
                                        className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span>{errors.name?.message}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Customer Name */}
                    <div className={cardStyles}>
                        <div>
                            <label htmlFor="customer-name" className={labelStyles}>
                                <div className="flex items-center">
                                    <BuildingOffice2Icon className="w-4 h-4 mr-2 flex-shrink-0" />
                                    <span>
                                        Customer Name <span className="text-red-500">*</span>
                                    </span>
                                </div>
                            </label>

                            <Controller
                                control={control}
                                rules={{ required: 'Customer name is required' }}
                                name="name"
                                render={({ field, fieldState: { error } }) => (
                                    <div className="relative z-50" data-customer-search>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                {...field}
                                                type="text"
                                                id="customer-name"
                                                placeholder="Enter customer name"
                                                autoComplete="organization"
                                                className={`w-full pl-10 pr-10 px-4 py-2.5 sm:py-3 bg-gray-50 border border-transparent rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white hover:bg-white transition-all duration-200 sm:text-sm font-medium ${
                                                    error
                                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                                                        : ''
                                                }`}
                                            />
                                            {isSearchingCustomer && customerSearchTerm && (
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                                    <Spinner className="h-4 w-4 text-gray-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Search Results Dropdown */}
                                        {customerSearchTerm.length > 0 &&
                                            customerSearchResults &&
                                            customerSearchResults.length > 0 &&
                                            !showDuplicateWarning && (
                                                <div className="absolute z-[60] w-full py-1 mt-1 overflow-auto bg-white shadow-xl max-h-40 rounded-md border border-gray-200">
                                                    {customerSearchResults.map((customer) => (
                                                        <div
                                                            key={customer.id}
                                                            className="relative select-none py-3 pl-4 pr-9 cursor-pointer hover:bg-blue-50 text-gray-900"
                                                            onClick={() => {
                                                                setValue('name', customer.name);
                                                                setShowDuplicateWarning(true);
                                                                setFoundCustomer(customer);
                                                                setCustomerSearchResults(null);
                                                                setCustomerSearchTerm('');
                                                            }}
                                                        >
                                                            <span className="block truncate font-medium">
                                                                {customer.name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                        {/* Duplicate Warning */}
                                        {showDuplicateWarning && foundCustomer && (
                                            <div className="relative z-40 mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                                <div className="flex items-start">
                                                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-medium text-amber-800">
                                                            Customer Already Exists
                                                        </h4>
                                                        <p className="mt-1 text-sm text-amber-700">
                                                            A customer named &quot;<strong>{foundCustomer.name}</strong>
                                                            &quot; already exists in your system.
                                                        </p>
                                                        <div className="mt-3 flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleUseExistingCustomer}
                                                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 border border-amber-300 rounded-md hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-200"
                                                            >
                                                                Use Existing Customer
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleCreateAnyway}
                                                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                                            >
                                                                Create Anyway
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {error && (
                                            <div className={`${errorStyles} mt-2`}>
                                                <svg
                                                    className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                <span>{error.message}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            />
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className={cardStyles}>
                        <div className={sectionHeaderStyles}>
                            <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg flex-shrink-0">
                                <EnvelopeIcon className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
                                    Contact Information
                                </h3>
                                <p className="text-sm text-gray-600 leading-tight">Email addresses for communication</p>
                            </div>
                        </div>
                        <div className="space-y-4 sm:space-y-6">
                            <div>
                                <label
                                    htmlFor="contactEmail"
                                    className={`${labelStyles} ${errors.contactEmail ? 'text-red-700' : ''}`}
                                >
                                    <div className="flex items-center gap-1">
                                        Contact Email
                                        {errors.contactEmail && (
                                            <svg
                                                className="w-3 h-3 text-red-500"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                </label>
                                <input
                                    {...register('contactEmail', {
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: 'Invalid email address',
                                        },
                                        validate: (value) => {
                                            if (value && value.trim() !== '') {
                                                return (
                                                    /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value) ||
                                                    'Invalid email address'
                                                );
                                            }
                                            return true;
                                        },
                                    })}
                                    type="email"
                                    id="contactEmail"
                                    placeholder="contact@company.com"
                                    autoComplete="email"
                                    className={`${inputStyles} transition-all duration-200 ${
                                        errors.contactEmail
                                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50 ring-1 ring-red-200 shadow-sm shadow-red-100'
                                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
                                    }`}
                                />
                                {errors.contactEmail && (
                                    <div className={`${errorStyles} animate-in slide-in-from-top-1 duration-200`}>
                                        <svg
                                            className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-red-500"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span className="font-medium">{errors.contactEmail?.message}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div>
                                    <label
                                        htmlFor="billingEmail"
                                        className={`${labelStyles} ${errors.billingEmail ? 'text-red-700' : ''}`}
                                    >
                                        <div className="flex items-center gap-1">
                                            Billing Email
                                            {errors.billingEmail && (
                                                <svg
                                                    className="w-3 h-3 text-red-500"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            )}
                                        </div>
                                    </label>
                                    <input
                                        {...register('billingEmail', {
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: 'Invalid email address',
                                            },
                                            validate: (value) => {
                                                if (value && value.trim() !== '') {
                                                    return (
                                                        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value) ||
                                                        'Invalid email address'
                                                    );
                                                }
                                                return true;
                                            },
                                        })}
                                        type="email"
                                        id="billingEmail"
                                        placeholder="billing@company.com"
                                        autoComplete="email"
                                        className={`${inputStyles} transition-all duration-200 ${
                                            errors.billingEmail
                                                ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50 ring-1 ring-red-200 shadow-sm shadow-red-100'
                                                : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
                                        }`}
                                    />
                                    {errors.billingEmail && (
                                        <div className={`${errorStyles} animate-in slide-in-from-top-1 duration-200`}>
                                            <svg
                                                className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-red-500"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <span className="font-medium">{errors.billingEmail?.message}</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="paymentStatusEmail"
                                        className={`${labelStyles} ${errors.paymentStatusEmail ? 'text-red-700' : ''}`}
                                    >
                                        <div className="flex items-center gap-1">
                                            Payment Status Email
                                            {errors.paymentStatusEmail && (
                                                <svg
                                                    className="w-3 h-3 text-red-500"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            )}
                                        </div>
                                    </label>
                                    <input
                                        {...register('paymentStatusEmail', {
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: 'Invalid email address',
                                            },
                                            validate: (value) => {
                                                if (value && value.trim() !== '') {
                                                    return (
                                                        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value) ||
                                                        'Invalid email address'
                                                    );
                                                }
                                                return true;
                                            },
                                        })}
                                        type="email"
                                        id="paymentStatusEmail"
                                        placeholder="payments@company.com"
                                        autoComplete="email"
                                        className={`${inputStyles} transition-all duration-200 ${
                                            errors.paymentStatusEmail
                                                ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50 ring-1 ring-red-200 shadow-sm shadow-red-100'
                                                : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
                                        }`}
                                    />
                                    {errors.paymentStatusEmail && (
                                        <div className={`${errorStyles} animate-in slide-in-from-top-1 duration-200`}>
                                            <svg
                                                className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-red-500"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <span className="font-medium">{errors.paymentStatusEmail?.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className={cardStyles}>
                        <div className={sectionHeaderStyles}>
                            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg flex-shrink-0">
                                <MapPinIcon className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
                                    Address Information
                                </h3>
                                <p className="text-sm text-gray-600 leading-tight">Customer&apos;s physical location</p>
                            </div>
                        </div>
                        <div className="space-y-4 sm:space-y-6">
                            {/* Street Address */}
                            <div>
                                <label htmlFor="street" className={labelStyles}>
                                    Street Address
                                </label>
                                <input
                                    {...register('street')}
                                    type="text"
                                    id="street"
                                    placeholder="123 Main Street"
                                    autoComplete="street-address"
                                    className={`${inputStyles} ${
                                        errors.street
                                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                                            : ''
                                    }`}
                                />
                                {errors.street && (
                                    <div className={errorStyles}>
                                        <svg
                                            className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span>{errors.street?.message}</span>
                                    </div>
                                )}
                            </div>

                            {/* City and State Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div>
                                    <label htmlFor="city" className={labelStyles}>
                                        City
                                    </label>
                                    <input
                                        {...register('city')}
                                        type="text"
                                        id="city"
                                        placeholder="City"
                                        autoComplete="address-level2"
                                        className={`${inputStyles} ${
                                            errors.city
                                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                                                : ''
                                        }`}
                                    />
                                    {errors.city && (
                                        <div className={errorStyles}>
                                            <svg
                                                className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <span>{errors.city?.message}</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="state" className={labelStyles}>
                                        State / Province
                                    </label>
                                    <input
                                        {...register('state')}
                                        type="text"
                                        id="state"
                                        placeholder="State"
                                        autoComplete="address-level1"
                                        className={`${inputStyles} ${
                                            errors.state
                                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                                                : ''
                                        }`}
                                    />
                                    {errors.state && (
                                        <div className={errorStyles}>
                                            <svg
                                                className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <span>{errors.state?.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Zip and Country Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div>
                                    <label htmlFor="zip" className={labelStyles}>
                                        Zip / Postal Code
                                    </label>
                                    <input
                                        {...register('zip')}
                                        type="text"
                                        id="zip"
                                        placeholder="12345"
                                        autoComplete="postal-code"
                                        className={`${inputStyles} ${
                                            errors.zip
                                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                                                : ''
                                        }`}
                                    />
                                    {errors.zip && (
                                        <div className={errorStyles}>
                                            <svg
                                                className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <span>{errors.zip?.message}</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Controller
                                        control={control}
                                        rules={{ required: 'Country is required' }}
                                        name="country"
                                        defaultValue="US"
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <label htmlFor="country" className={labelStyles}>
                                                    Country <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    {...field}
                                                    id="country"
                                                    autoComplete="country"
                                                    className={`${selectStyles} ${
                                                        error
                                                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                                                            : ''
                                                    }`}
                                                >
                                                    {countryCodes.map((countryCode) => (
                                                        <option key={countryCode.code} value={countryCode.code}>
                                                            {countryCode.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {error && (
                                                    <div className={errorStyles}>
                                                        <svg
                                                            className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                        <span>{error.message}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="h-5"></div>
                </>
            )}
        </div>
    );
};

export default CustomerForm;
