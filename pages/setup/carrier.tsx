'use client';

import { RadioGroup } from '@headlessui/react';
import {
    ArrowRightIcon,
    ArrowLeftIcon,
    CheckIcon,
    ExclamationTriangleIcon,
    BuildingOfficeIcon,
    TruckIcon,
    CreditCardIcon,
} from '@heroicons/react/24/outline';
import { type Carrier, SubscriptionPlan } from '@prisma/client';
import type { PageWithAuth } from 'interfaces/auth';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { notify } from '../../components/Notification';
import { createNewCarrier, isCarrierCodeUnique } from '../../lib/rest/carrier';
import { createCheckoutSession } from '../../lib/rest/stripe';
import { tenDigitPhone } from 'lib/helpers/regExpressions';
import {
    PRO_PLAN_COST_PER_DRIVER,
    BASIC_PLAN_MAX_DRIVERS,
    BASIC_PLAN_TOTAL_LOADS,
    BASIC_PLAN_AI_RATECON_IMPORTS,
    PRO_PLAN_AI_RATECON_IMPORTS_PER_DRIVER,
    BASIC_PLAN_MAX_STORAGE_MB,
    PRO_PLAN_MAX_STORAGE_GB_PER_DRIVER,
} from 'lib/constants';

type CarrierOperation = {
    carrierOperationDesc: string;
};

type CarrierObj = {
    carrierOperation: CarrierOperation;
    statusCode: string;
    dotNumber: number;
    legalName: string;
    phyStreet: string;
    phyCity: string;
    phyState: string;
    phyZipcode: string;
    totalDrivers: number;
    totalPowerUnits: number | null;
};

type JsonResponse = {
    content: {
        carrier: CarrierObj;
    };
};

type StepProps = {
    step: {
        number: number;
        title: string;
        description: string;
        icon: React.ReactNode;
    };
    isActive: boolean;
    isCompleted: boolean;
    children: React.ReactNode;
};

const Step = ({ step, isActive, isCompleted, children }: StepProps) => (
    <li className="relative">
        <div className={`flex items-start w-full`}>
            <span
                className={`w-10 h-10 flex shrink-0 items-center justify-center rounded-full mr-3 text-sm relative z-10
                    ${
                        isActive
                            ? 'bg-blue-50 border-2 border-blue-600 text-blue-600'
                            : isCompleted
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-50 border-2 border-gray-200 text-gray-400'
                    }`}
            >
                {isCompleted ? <CheckIcon className="w-5 h-5" /> : step.icon}
            </span>
            <div className={`block w-full ${(!isCompleted && !isActive && 'opacity-50') || ''}`}>
                <h4
                    className={`text-base mb-2 ${isActive || isCompleted ? 'text-blue-600' : 'text-gray-900'} ${
                        isActive ? 'font-bold' : 'font-normal'
                    }`}
                >
                    {step.title}
                </h4>
                <p className="mb-4 text-sm text-gray-600 transition-all duration-200">{step.description}</p>
                {isActive && <div className="mt-4">{children}</div>}
            </div>
        </div>
    </li>
);

const CarrierSetup: PageWithAuth = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [plan, setPlan] = useState<SubscriptionPlan>(SubscriptionPlan.BASIC);
    const [isSubmitButtonDisabled, setIsSubmitButtonDisabled] = useState(false);
    const formHook = useForm<Carrier>();
    const { replace } = useRouter();
    const { update, data: session, status } = useSession();
    const [companyData, setCompanyData] = useState<CarrierObj>();
    const countryOptions = ['United States', 'Canada', 'Mexico'];

    const fields: { id: keyof Carrier; label: string; required: boolean; type: string }[] = [
        { id: 'name', label: 'Company Name', required: true, type: 'input' },
        { id: 'email', label: 'Contact Email', required: true, type: 'input' },
        { id: 'phone', label: 'Phone Number', required: true, type: 'input' },
        { id: 'mcNum', label: 'MC Number', required: true, type: 'input' },
        { id: 'dotNum', label: 'DOT Number', required: true, type: 'input' },
        { id: 'street', label: 'Street Address', required: true, type: 'input' },
        { id: 'city', label: 'City', required: true, type: 'input' },
        { id: 'state', label: 'State', required: true, type: 'input' },
        { id: 'zip', label: 'Zip Code', required: true, type: 'input' },
        { id: 'country', label: 'Country', required: true, type: 'select' },
        { id: 'carrierCode', label: 'Carrier Code', required: true, type: 'input' },
    ];

    const [activeStep, setActiveStep] = useState(0);
    const mcNumberInputRef = useRef<HTMLInputElement>(null);
    const companyNameInputRef = useRef<HTMLInputElement>(null);
    const [fetchError, setFetchError] = useState<boolean>(false);
    const [numDrivers, setNumDrivers] = useState<number | null>(1);

    useEffect(() => {
        // Small timeout to ensure DOM elements are mounted
        const timer = setTimeout(() => {
            if (activeStep === 0) {
                mcNumberInputRef.current?.focus();
            } else if (activeStep === 1) {
                companyNameInputRef.current?.focus();
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [activeStep]);

    const generateCarrierCode = (name: string) => {
        const code = name.substring(0, 3).toLowerCase() + Math.floor(Math.random() * 1000).toString();
        return code;
    };

    const handleCarrierCode = async (name: string) => {
        let code = generateCarrierCode(name);
        let isUnique = await isCarrierCodeUnique(code);
        while (!isUnique) {
            code = generateCarrierCode(name);
            isUnique = await isCarrierCodeUnique(code);
        }
        formHook.setValue('carrierCode', code);
    };

    const onSubmit = async (data: Carrier) => {
        setIsLoading(true);
        try {
            const isUnique = await isCarrierCodeUnique(data.carrierCode);

            if (!isUnique) {
                notify({ title: 'Carrier code is not unique', type: 'error' });
                setIsLoading(false);
                return;
            }

            const carrier = await createNewCarrier(data);

            if (carrier) {
                if (plan === SubscriptionPlan.PRO) {
                    const url = await createCheckoutSession(SubscriptionPlan.PRO, numDrivers, data.email);
                    window.location.href = url;
                } else {
                    notify({ title: 'Carrier created successfully', type: 'success' });
                    await update({
                        isUpdate: true,
                    });
                    await replace('/');
                }
            } else {
                notify({ title: 'Failed to create carrier', type: 'error' });
                setIsLoading(false);
            }
        } catch (error) {
            notify({ title: error.message, type: 'error' });
            setIsLoading(false);
        }
    };

    const handleLogout = (e) => {
        e.preventDefault();
        signOut({
            callbackUrl: '/',
        });
    };

    const handleNext = () => {
        if (activeStep === 1) {
            // Prevent double submission
            setIsSubmitButtonDisabled(true);
            setTimeout(() => setIsSubmitButtonDisabled(false), 1000);
        }

        // Add smooth scrolling illusion
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Small delay for visual effect
        setTimeout(() => {
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
        }, 300);
    };

    const handleBack = () => {
        setCompanyData(undefined);
        if (activeStep === 1) {
            formHook.reset();
        }

        // Add smooth scrolling illusion
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Small delay for visual effect
        setTimeout(() => {
            setActiveStep((prevActiveStep) => prevActiveStep - 1);
        }, 300);
    };

    const getFMCSAData = async (mcNumber: string) => {
        if (!mcNumber) return;

        formHook.reset();
        setFetchError(false);

        try {
            const url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/docket-number/${encodeURIComponent(
                mcNumber,
            )}?webKey=dd11efd7af252754dabb0e1e7557162cec4dc637`;

            const response = await fetch(url);
            const jsonData: JsonResponse = await response.json();

            if (!response.ok || !jsonData?.content?.[0]?.carrier) {
                setFetchError(true);
                formHook.setValue('mcNum', mcNumber);
                return;
            }

            const carrierData = jsonData.content[0].carrier;

            const carrier: CarrierObj = {
                carrierOperation: {
                    carrierOperationDesc: carrierData.carrierOperation.carrierOperationDesc,
                },
                statusCode: carrierData.statusCode,
                dotNumber: carrierData.dotNumber,
                legalName: carrierData.legalName,
                phyStreet: carrierData.phyStreet,
                phyCity: carrierData.phyCity,
                phyState: carrierData.phyState,
                phyZipcode: carrierData.phyZipcode,
                totalDrivers: carrierData.totalDrivers,
                totalPowerUnits: carrierData.totalPowerUnits,
            };

            handleCarrierCode(carrier.legalName.trim());
            formHook.setValue('email', session.user.email);
            formHook.setValue('mcNum', mcNumber);
            formHook.setValue('dotNum', carrier.dotNumber.toString());
            formHook.setValue('name', carrier.legalName);
            formHook.setValue('street', carrier.phyStreet);
            formHook.setValue('city', carrier.phyCity);
            formHook.setValue('state', carrier.phyState);
            formHook.setValue('zip', carrier.phyZipcode);

            setCompanyData(carrier);
        } catch (error) {
            setFetchError(true);
            formHook.setValue('mcNum', mcNumber);
        }
    };

    const handleSubmit = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'Enter') {
            getFMCSAData((event.target as HTMLInputElement).value);
        }
    };

    const handleNumDriversChange = (value: number | null) => {
        setNumDrivers(value);
    };

    const isValidProPlanDrivers = (plan: SubscriptionPlan, numDrivers: number | null): boolean => {
        if (plan !== SubscriptionPlan.PRO) return true;
        return numDrivers !== null && !isNaN(Number(numDrivers)) && numDrivers >= 1;
    };

    const stepConfig = [
        {
            number: 1,
            title: 'Company Lookup',
            description: 'Locate your company using the MC number',
            icon: <BuildingOfficeIcon className="w-5 h-5" />,
        },
        {
            number: 2,
            title: 'Company Details',
            description: 'Verify and complete your profile',
            icon: <TruckIcon className="w-5 h-5" />,
        },
        {
            number: 3,
            title: 'Select Plan',
            description: 'Choose your subscription plan',
            icon: <CreditCardIcon className="w-5 h-5" />,
        },
    ];

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-t-transparent border-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (status !== 'authenticated' || session?.user?.defaultCarrierId) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
                <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <h1 className="text-2xl font-bold text-blue-900">Carrier Setup</h1>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
                        {/* Stepper Navigation */}
                        <div className="md:col-span-3">
                            <nav aria-label="Progress" className="sticky md:top-24 top-16 z-20 md:block">
                                <ol className="md:overflow-hidden flex md:flex-col overflow-x-auto p-2 md:p-0 bg-white md:bg-transparent rounded-lg md:rounded-none shadow-sm md:shadow-none">
                                    {stepConfig.map((step, index) => (
                                        <li
                                            key={step.title}
                                            className={`relative md:pb-10 flex-1 md:flex-auto ${
                                                index !== stepConfig.length - 1 ? 'md:pb-10' : ''
                                            }`}
                                        >
                                            {index !== stepConfig.length - 1 ? (
                                                <div
                                                    className={`absolute left-5 top-5 -ml-px mt-0.5 h-full w-0.5 hidden md:block ${
                                                        activeStep > index ? 'bg-blue-600' : 'bg-gray-200'
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                            ) : null}

                                            <div className="group relative flex items-start md:items-start items-center justify-center md:justify-start">
                                                <span className="flex h-10 items-center">
                                                    <span
                                                        className={`relative z-10 flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full ${
                                                            activeStep > index
                                                                ? 'bg-blue-600 text-white'
                                                                : activeStep === index
                                                                ? 'border-2 border-blue-600 bg-white'
                                                                : 'border-2 border-gray-200 bg-white'
                                                        } transition-colors duration-200`}
                                                    >
                                                        {activeStep > index ? (
                                                            <CheckIcon
                                                                className="w-5 h-5 text-white"
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            <span
                                                                className={
                                                                    activeStep === index
                                                                        ? 'text-blue-600'
                                                                        : 'text-gray-500'
                                                                }
                                                            >
                                                                {step.icon}
                                                            </span>
                                                        )}
                                                    </span>
                                                </span>
                                                <span className="ml-4 hidden md:flex min-w-0 flex-col">
                                                    <span
                                                        className={`text-sm font-medium ${
                                                            activeStep >= index ? 'text-blue-900' : 'text-gray-500'
                                                        }`}
                                                    >
                                                        {step.title}
                                                    </span>
                                                    <span className="text-sm text-gray-500">{step.description}</span>
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </nav>
                        </div>

                        {/* Content Area */}
                        <div className="md:col-span-9">
                            <div
                                className="overflow-y-scroll max-h-[77vh] md:max-h-[85vh] bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 transition-all duration-500 ease-in-out transform"
                                style={{
                                    opacity: 1,
                                    transform: 'translateY(0)',
                                }}
                            >
                                {/* Step 1: Company Lookup */}
                                {activeStep === 0 && (
                                    <div className="p-8 animate-fadeIn">
                                        <div className="max-w-2xl mx-auto relative">
                                            <h2 className="text-2xl font-bold text-blue-900">Find Your Company</h2>
                                            <p className="mt-2 text-gray-600">
                                                Enter your MC number to automatically retrieve your company information
                                            </p>

                                            <div className="mt-8">
                                                <div className="flex w-full">
                                                    <input
                                                        ref={mcNumberInputRef}
                                                        className="block w-full px-4 py-3 text-lg border-gray-300 rounded-l-lg shadow-sm focus:ring-blue-600 focus:border-blue-600"
                                                        type="text"
                                                        placeholder="Enter MC Number"
                                                        onKeyDown={handleSubmit}
                                                    />
                                                    <button
                                                        onClick={() =>
                                                            getFMCSAData(mcNumberInputRef.current?.value || '')
                                                        }
                                                        className="inline-flex items-center px-4 py-3 text-base font-medium text-white transition-colors bg-blue-600 border border-transparent rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                                                    >
                                                        Search
                                                    </button>
                                                </div>
                                            </div>

                                            {fetchError ? (
                                                <div className="p-4 mt-6 border rounded-lg bg-amber-50 border-amber-200">
                                                    <div className="flex">
                                                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
                                                        <div className="ml-3">
                                                            <h3 className="text-sm font-medium text-amber-800">
                                                                Unable to fetch carrier data
                                                            </h3>
                                                            <p className="mt-2 text-sm text-amber-700">
                                                                We couldn&apos;t retrieve your carrier information. You
                                                                can proceed to the next step and enter your information
                                                                manually.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : companyData ? (
                                                <div className="p-6 mt-6 border border-gray-200 rounded-lg bg-gray-50">
                                                    <h3 className="text-lg font-semibold text-blue-900">
                                                        Company Information
                                                    </h3>
                                                    <div className="mt-4 space-y-4">
                                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-500">
                                                                    Carrier Name
                                                                </p>
                                                                <p className="mt-1 text-base font-semibold text-gray-900">
                                                                    {companyData.legalName}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-500">
                                                                    DOT Number
                                                                </p>
                                                                <p className="mt-1 text-base font-semibold text-gray-900">
                                                                    {companyData.dotNumber}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-500">Address</p>
                                                            <p className="mt-1 text-base font-semibold text-gray-900">
                                                                {`${companyData.phyStreet}, ${companyData.phyCity}, ${companyData.phyState} ${companyData.phyZipcode}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-6 mt-6 border border-gray-200 rounded-lg animate-pulse bg-gray-50">
                                                    <div className="h-5 mb-4 bg-gray-200 rounded w-1/4"></div>
                                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                        <div>
                                                            <div className="h-4 mb-2 bg-gray-200 rounded w-1/3"></div>
                                                            <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                                                        </div>
                                                        <div>
                                                            <div className="h-4 mb-2 bg-gray-200 rounded w-1/3"></div>
                                                            <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4">
                                                        <div className="h-4 mb-2 bg-gray-200 rounded w-1/4"></div>
                                                        <div className="h-5 bg-gray-200 rounded w-full"></div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="h-20"></div>

                                            <div className="flex  gap-3 mt-8 flex-row absolute bottom-0">
                                                <button
                                                    className="inline-flex whitespace-nowrap items-center justify-center px-2 sm:px-6 py-1.5 sm:py-3  text-base font-medium text-white transition-all duration-300 bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transform hover:scale-105"
                                                    onClick={handleNext}
                                                    disabled={!companyData && !fetchError}
                                                >
                                                    Continue
                                                    <ArrowRightIcon className="w-5 h-5 ml-2" />
                                                </button>
                                                <button
                                                    className="inline-flex whitespace-nowrap items-center justify-center px-2 sm:px-6 py-1.5 sm:py-3  text-base font-medium text-blue-700 transition-all duration-300 bg-white border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transform hover:scale-105"
                                                    onClick={handleNext}
                                                    disabled={companyData ? true : false}
                                                >
                                                    Enter Manually
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Company Details */}
                                {activeStep === 1 && (
                                    <div className="p-8 animate-fadeIn relative">
                                        <div className="max-w-3xl mx-auto  ">
                                            <div className="text-center">
                                                <h2 className="text-2xl font-bold text-blue-900">
                                                    Company Account Details
                                                </h2>
                                                <p className="mt-2 text-gray-600">
                                                    Please review the information below and fill in all required fields
                                                </p>
                                            </div>

                                            <form className="mt-8">
                                                {/* Company Information */}
                                                <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
                                                    <h3 className="text-lg font-semibold text-blue-900">
                                                        Company Information
                                                    </h3>
                                                    <div className="grid grid-cols-1 gap-6 mt-4 sm:grid-cols-2">
                                                        {fields
                                                            .filter((f) => ['name', 'email', 'phone'].includes(f.id))
                                                            .map((field) => (
                                                                <div key={field.id}>
                                                                    <label
                                                                        htmlFor={field.id}
                                                                        className="block text-sm font-medium text-gray-700"
                                                                    >
                                                                        {field.label}{' '}
                                                                        {field.required && (
                                                                            <span className="text-red-500">*</span>
                                                                        )}
                                                                    </label>
                                                                    <input
                                                                        ref={
                                                                            field.id === 'name'
                                                                                ? companyNameInputRef
                                                                                : null
                                                                        }
                                                                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                                                                        id={field.id}
                                                                        type="text"
                                                                        placeholder={
                                                                            field.id === 'phone' ? '2134561111' : ''
                                                                        }
                                                                        {...formHook.register(field.id, {
                                                                            required: field.required
                                                                                ? `${field.label} is required`
                                                                                : false,
                                                                            pattern: field.id === 'phone' && {
                                                                                value: tenDigitPhone,
                                                                                message:
                                                                                    'Invalid phone number entered, valid format 2134561111',
                                                                            },
                                                                            onBlur:
                                                                                field.id === 'name'
                                                                                    ? async (e) => {
                                                                                          if (
                                                                                              e.target.value.trim() !==
                                                                                              ''
                                                                                          ) {
                                                                                              handleCarrierCode(
                                                                                                  e.target.value,
                                                                                              );
                                                                                          }
                                                                                      }
                                                                                    : field.id === 'phone'
                                                                                    ? (e) => formHook.trigger('phone')
                                                                                    : undefined,
                                                                        })}
                                                                    />
                                                                    {formHook.formState.errors[field.id] && (
                                                                        <p className="mt-1 text-sm text-red-600">
                                                                            {
                                                                                formHook.formState.errors[field.id]
                                                                                    ?.message
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>

                                                {/* Registration Info */}
                                                <div className="p-6 mt-6 border border-gray-200 rounded-lg bg-gray-50">
                                                    <h3 className="text-lg font-semibold text-blue-900">
                                                        Registration Info
                                                    </h3>
                                                    <div className="grid grid-cols-1 gap-6 mt-4 sm:grid-cols-2">
                                                        {fields
                                                            .filter((f) =>
                                                                ['mcNum', 'dotNum', 'carrierCode'].includes(f.id),
                                                            )
                                                            .map((field) => (
                                                                <div key={field.id}>
                                                                    <label
                                                                        htmlFor={field.id}
                                                                        className="block text-sm font-medium text-gray-700"
                                                                    >
                                                                        {field.label}{' '}
                                                                        {field.required && (
                                                                            <span className="text-red-500">*</span>
                                                                        )}
                                                                        {field.id === 'carrierCode' && (
                                                                            <span className="ml-2 text-sm font-normal text-gray-500">
                                                                                (Driver app login code)
                                                                            </span>
                                                                        )}
                                                                    </label>
                                                                    <input
                                                                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm disabled:bg-gray-100 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                                                                        id={field.id}
                                                                        disabled={
                                                                            field.id === 'carrierCode' &&
                                                                            formHook.getValues('carrierCode') !== ''
                                                                        }
                                                                        type="text"
                                                                        {...formHook.register(field.id, {
                                                                            required: field.required
                                                                                ? `${field.label} is required`
                                                                                : false,
                                                                        })}
                                                                    />
                                                                    {formHook.formState.errors[field.id] && (
                                                                        <p className="mt-1 text-sm text-red-600">
                                                                            {
                                                                                formHook.formState.errors[field.id]
                                                                                    ?.message
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>

                                                {/* Address */}
                                                <div className="p-6 mt-6 border border-gray-200 rounded-lg bg-gray-50">
                                                    <h3 className="text-lg font-semibold text-blue-900">Address</h3>
                                                    <div className="grid grid-cols-1 gap-6 mt-4 sm:grid-cols-2">
                                                        {fields
                                                            .filter((f) =>
                                                                ['street', 'city', 'state', 'zip', 'country'].includes(
                                                                    f.id,
                                                                ),
                                                            )
                                                            .map((field) => (
                                                                <div
                                                                    key={field.id}
                                                                    className={
                                                                        field.id === 'street' ? 'sm:col-span-2' : ''
                                                                    }
                                                                >
                                                                    <label
                                                                        htmlFor={field.id}
                                                                        className="block text-sm font-medium text-gray-700"
                                                                    >
                                                                        {field.label}{' '}
                                                                        {field.required && (
                                                                            <span className="text-red-500">*</span>
                                                                        )}
                                                                    </label>
                                                                    {field.type === 'select' ? (
                                                                        <select
                                                                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                                                                            id={field.id}
                                                                            {...formHook.register(field.id)}
                                                                        >
                                                                            {countryOptions.map((country) => (
                                                                                <option key={country} value={country}>
                                                                                    {country}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    ) : (
                                                                        <input
                                                                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                                                                            id={field.id}
                                                                            type="text"
                                                                            {...formHook.register(field.id, {
                                                                                required: field.required
                                                                                    ? `${field.label} is required`
                                                                                    : false,
                                                                            })}
                                                                        />
                                                                    )}
                                                                    {formHook.formState.errors[field.id] && (
                                                                        <p className="mt-1 text-sm text-red-600">
                                                                            {
                                                                                formHook.formState.errors[field.id]
                                                                                    ?.message
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                        <div className="flex gap-3 mt-8 flex-row sticky py-4 bottom-0  bg-white">
                                            <button
                                                className="inline-flex items-center justify-center px-2 sm:px-6 py-1.5 sm:py-3 text-base font-medium text-white transition-all duration-300 bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transform hover:scale-105"
                                                onClick={formHook.handleSubmit(handleNext)}
                                            >
                                                Continue
                                                <ArrowRightIcon className="w-5 h-5 ml-2" />
                                            </button>
                                            <button
                                                className="inline-flex items-center justify-center px-2 sm:px-6 py-1.5 sm:py-3 text-base font-medium text-blue-700 transition-all duration-300 bg-white border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transform hover:scale-105"
                                                onClick={handleBack}
                                            >
                                                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                                                Back
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Plan Selection */}
                                {activeStep === 2 && (
                                    <div className="p-4 sm:p-8 animate-subtle-fade  ">
                                        <div className="max-w-4xl mx-auto  ">
                                            <div className="text-center">
                                                <h2 className="text-2xl font-bold text-blue-900">Select Your Plan</h2>
                                                <p className="mt-2 text-gray-600">
                                                    Choose the plan that best suits your needs. You can upgrade or
                                                    downgrade anytime.
                                                </p>
                                            </div>

                                            <div className="bg-yellow-200/50 p-4 my-4 rounded-xl mb-8 border border-gray-200 shadow-md">
                                                <p className="text-gray-700 font-bold text-sm sm:text-lg mb-2 text-center ">
                                                    SPECIAL OFFER
                                                </p>
                                                <p className="text-xs sm:text-lg font-bold mb-2 text-left md:text-center">
                                                    Use code{' '}
                                                    <span className="bg-blue-600 px-3 py-1 text-white rounded-md">
                                                        50OffValue
                                                    </span>{' '}
                                                    to upgrade to Pro Plan!
                                                </p>
                                                <div className="flex flex-col md:flex-row items-left md:text-center justify-center gap-2   rounded-xl ">
                                                    <p className="text-left md:text-center text-md sm:text-lg font-semibold text-gray-800">
                                                        🚨{' '}
                                                        <span className="text-blue-700 font-bold text-xs sm:text-lg">
                                                            50% OFF
                                                        </span>{' '}
                                                        your first
                                                        <span className="font-bold text-md sm:text-lg text-blue-700">
                                                            {' '}
                                                            6 months
                                                        </span>{' '}
                                                        — only for a limited time!
                                                    </p>
                                                </div>
                                                <p className="text-center p-4 text-xs sm:text-sm font-normal text-gray-400 lg:w-1/2 mx-auto">
                                                    This offer is valid for new users only. $19 per driver after that.
                                                    Terms and conditions apply.
                                                </p>

                                                <div className="flex flex-col md:flex-row items-center mt-4 justify-center gap-2">
                                                    <p>expires in</p>
                                                    <CountdownTimer showLabels />
                                                </div>
                                                <div className="mt-3 flex flex-row items-end justify-end">
                                                    <PromoCodeButton />
                                                </div>
                                            </div>

                                            <div className="mt-8 relative">
                                                <RadioGroup value={plan} onChange={setPlan} className="space-y-6">
                                                    {/* Plan Comparison Table */}
                                                    <div className="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
                                                        {/* Scrollable Container */}
                                                        <div className="overflow-x-auto scrollbar-hide">
                                                            <table className="min-w-full divide-y divide-gray-200">
                                                                <thead>
                                                                    <tr>
                                                                        <th
                                                                            scope="col"
                                                                            className="w-2/5 px-6 py-4 text-sm font-medium text-left text-gray-500"
                                                                        >
                                                                            Features
                                                                        </th>
                                                                        <th
                                                                            scope="col"
                                                                            className="w-3/10 px-6 py-4 text-sm font-medium text-left text-gray-500 border-l border-gray-200"
                                                                        >
                                                                            <RadioGroup.Option
                                                                                value={SubscriptionPlan.BASIC}
                                                                                className="cursor-pointer"
                                                                            >
                                                                                {({ checked }) => (
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div>
                                                                                            <h3 className="text-lg font-bold text-gray-900">
                                                                                                Basic Plan
                                                                                            </h3>
                                                                                            <p className="text-base font-medium text-gray-500">
                                                                                                Free
                                                                                            </p>
                                                                                        </div>
                                                                                        <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-blue-600">
                                                                                            {checked && (
                                                                                                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </RadioGroup.Option>
                                                                        </th>
                                                                        <th
                                                                            scope="col"
                                                                            className="w-3/10 px-6 py-4 text-sm font-medium text-left text-gray-500 border-l border-gray-200 bg-blue-50"
                                                                        >
                                                                            <RadioGroup.Option
                                                                                value={SubscriptionPlan.PRO}
                                                                                className="cursor-pointer"
                                                                            >
                                                                                {({ checked }) => (
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div>
                                                                                            <div className="flex items-center">
                                                                                                <h3 className="text-lg font-bold text-gray-900">
                                                                                                    Pro Plan
                                                                                                </h3>
                                                                                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                                                    Recommended
                                                                                                </span>
                                                                                            </div>
                                                                                            <p className="text-base font-medium text-gray-500">
                                                                                                $
                                                                                                {
                                                                                                    PRO_PLAN_COST_PER_DRIVER
                                                                                                }
                                                                                                /month
                                                                                            </p>
                                                                                        </div>
                                                                                        <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-blue-600">
                                                                                            {checked && (
                                                                                                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </RadioGroup.Option>
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                    {/* Driver Count Input (always visible for Pro) */}
                                                                    <tr>
                                                                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                                                                            Number of drivers
                                                                        </td>
                                                                        <td className="px-6 py-4 text-sm text-gray-700 border-l border-gray-200">
                                                                            {BASIC_PLAN_MAX_DRIVERS}
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200 bg-blue-50">
                                                                            <div className="flex items-center">
                                                                                <input
                                                                                    type="number"
                                                                                    id="numDrivers"
                                                                                    value={numDrivers ?? ''}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        if (val === '') {
                                                                                            handleNumDriversChange(
                                                                                                null,
                                                                                            );
                                                                                        } else {
                                                                                            const num =
                                                                                                Number.parseInt(val);
                                                                                            if (!isNaN(num)) {
                                                                                                handleNumDriversChange(
                                                                                                    num,
                                                                                                );
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                    className="w-20 px-3 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                                                    min="1"
                                                                                />
                                                                            </div>
                                                                            {numDrivers && numDrivers > 0 && (
                                                                                <div className="mt-2 text-sm font-medium text-blue-700">
                                                                                    Total: $
                                                                                    {(
                                                                                        PRO_PLAN_COST_PER_DRIVER *
                                                                                        numDrivers
                                                                                    ).toFixed(2)}
                                                                                    /month
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    </tr>

                                                                    {/* Load Imports */}
                                                                    <tr>
                                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                                            Load Imports
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm text-gray-700">
                                                                                    {BASIC_PLAN_TOTAL_LOADS} loads
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200 bg-blue-50">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm font-medium text-gray-700">
                                                                                    Unlimited
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>

                                                                    {/* AI RateCon PDF Imports */}
                                                                    <tr>
                                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                                            AI RateCon PDF Imports
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm text-gray-700">
                                                                                    {BASIC_PLAN_AI_RATECON_IMPORTS}
                                                                                    /month
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200 bg-blue-50">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm font-medium text-gray-700">
                                                                                    {
                                                                                        PRO_PLAN_AI_RATECON_IMPORTS_PER_DRIVER
                                                                                    }
                                                                                    /month per driver
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>

                                                                    {/* Storage Capacity */}
                                                                    <tr>
                                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                                            Storage Capacity
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm text-gray-700">
                                                                                    {BASIC_PLAN_MAX_STORAGE_MB}MB
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200 bg-blue-50">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm font-medium text-gray-700">
                                                                                    {PRO_PLAN_MAX_STORAGE_GB_PER_DRIVER}
                                                                                    GB per driver
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>

                                                                    {/* Driver Pay Auto-Calculations */}
                                                                    <tr>
                                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                                            Driver Pay Auto-Calculations
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm text-gray-700">
                                                                                    {BASIC_PLAN_TOTAL_LOADS} loads
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200 bg-blue-50">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm font-medium text-gray-700">
                                                                                    Unlimited
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>

                                                                    {/* Driver Invoicing */}
                                                                    <tr>
                                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                                            Driver Invoicing
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm text-gray-700">
                                                                                    {BASIC_PLAN_TOTAL_LOADS} loads
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200 bg-blue-50">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm font-medium text-gray-700">
                                                                                    Unlimited
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>

                                                                    {/* Driver mobile app */}
                                                                    <tr>
                                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                                            Driver mobile app
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm font-medium text-gray-700">
                                                                                    Included
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200 bg-blue-50">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm font-medium text-gray-700">
                                                                                    Included
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>

                                                                    {/* Priority Support */}
                                                                    <tr>
                                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                                            Priority Support
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-red-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M6 18L18 6M6 6l12 12"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm text-gray-700">
                                                                                    Not included
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200 bg-blue-50">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm font-medium text-gray-700">
                                                                                    Included
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                                            IFTA Reporting{' '}
                                                                            <span className="text-xs text-blue-600 font-normal">
                                                                                (coming soon)
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-red-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M6 18L18 6M6 6l12 12"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm text-gray-700">
                                                                                    Not included
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 border-l border-gray-200 bg-blue-50">
                                                                            <div className="flex items-center">
                                                                                <svg
                                                                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    ></path>
                                                                                </svg>
                                                                                <span className="ml-2 text-sm font-medium text-gray-700">
                                                                                    Included
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {/* Scroll Indicator - Only visible on small screens */}
                                                        <div className="flex items-center justify-center py-2 text-xs text-gray-500 border-t border-gray-200 md:hidden">
                                                            <svg
                                                                className="w-4 h-4 mr-1 animate-pulse"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth="2"
                                                                    d="M9 5l7 7-7 7"
                                                                ></path>
                                                            </svg>
                                                            Scroll to see more
                                                        </div>
                                                    </div>
                                                </RadioGroup>

                                                {/* Pro Plan Recommendation */}
                                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <h3 className="text-lg font-medium text-blue-900">
                                                        Why choose Pro?
                                                    </h3>
                                                    <p className="mt-2 text-sm text-gray-700">
                                                        Upgrade to Pro for unlimited loads, driver mobile app access,
                                                        and priority support to maximize your efficiency. The Pro plan
                                                        pays for itself by saving you time and helping you manage more
                                                        loads with less effort.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex  gap-3 mt-8 flex-row w-full sticky bottom-0 z-10 bg-white border-t border-gray-200 py-4 px-4">
                                                <button
                                                    type="submit"
                                                    disabled={
                                                        isLoading ||
                                                        isSubmitButtonDisabled ||
                                                        !isValidProPlanDrivers(plan, numDrivers)
                                                    }
                                                    onClick={formHook.handleSubmit(onSubmit)}
                                                    className="inline-flex items-center justify-center px-2 sm:px-6 py-1.5 sm:py-3 text-base font-medium text-white transition-all duration-300 bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transform hover:scale-105"
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <svg
                                                                className="w-5 h-5 mr-3 -ml-1 text-white animate-spin"
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
                                                            Creating...
                                                        </>
                                                    ) : (
                                                        'Create Carrier'
                                                    )}
                                                </button>
                                                <button
                                                    className="inline-flex items-center justify-center px-2 sm:px-6 py-1.5 sm:py-3  text-base font-medium text-blue-700 transition-all duration-300 bg-white border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transform hover:scale-105"
                                                    onClick={handleBack}
                                                >
                                                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                                                    Back
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

CarrierSetup.authenticationEnabled = true;

export default CarrierSetup;

// Countdown Timer Component
interface CountDownProps {
    showLabels?: boolean;
    large?: boolean;
}

const CountdownTimer: React.FC<CountDownProps> = ({ showLabels = false, large = false }) => {
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        // May 13, 2025 at 10 PM
        const startDate = new Date(2025, 4, 13, 22, 0, 0);

        const calculateTimeLeft = () => {
            const now = new Date();
            const timeDiff = now.getTime() - startDate.getTime();

            // Calculate how many complete 48-hour cycles have passed
            const cycleMs = 48 * 60 * 60 * 1000;
            const cycles = Math.floor(timeDiff / cycleMs);

            // Calculate the end time of the current cycle
            const currentCycleEndTime = new Date(startDate.getTime() + (cycles + 1) * cycleMs);

            // Calculate time remaining in current cycle
            const timeRemaining = currentCycleEndTime.getTime() - now.getTime();

            // Convert to hours, minutes, seconds
            const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

            return { hours, minutes, seconds };
        };

        // Initial calculation
        setTimeLeft(calculateTimeLeft());

        // Update every second
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        // Cleanup
        return () => clearInterval(timer);
    }, []);

    const { hours, minutes, seconds } = timeLeft;

    if (showLabels) {
        return (
            <div className="flex items-center gap-2">
                <div className={`bg-blue-200 px-3 py-2 rounded-lg ${large ? 'px-4 py-3' : ''}`}>
                    <span className={`font-mono font-bold ${large ? 'text-3xl' : 'text-2xl'}`}>
                        {hours.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs block">HRS</span>
                </div>
                <div className="text-xl">:</div>
                <div className={`bg-blue-200 px-3 py-2 rounded-lg ${large ? 'px-4 py-3' : ''}`}>
                    <span className={`font-mono font-bold ${large ? 'text-3xl' : 'text-2xl'}`}>
                        {minutes.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs block">MIN</span>
                </div>
                <div className="text-xl">:</div>
                <div className={`bg-blue-200 px-3 py-2 rounded-lg ${large ? 'px-4 py-3' : ''}`}>
                    <span className={`font-mono font-bold ${large ? 'text-3xl' : 'text-2xl'}`}>
                        {seconds.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs block">SEC</span>
                </div>
            </div>
        );
    }

    return (
        <span className="font-mono font-bold">
            {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:
            {seconds.toString().padStart(2, '0')}
        </span>
    );
};

// Promo Code Button Component
interface PromoCodeButtonProps {
    large?: boolean;
}

const PromoCodeButton: React.FC<PromoCodeButtonProps> = ({ large = false }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText('FB69').then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <button
            onClick={copyToClipboard}
            className={`
        ${copied ? 'bg-green-500 text-white' : 'bg-white text-blue-600'}
        ${large ? 'px-4 py-3 text-lg' : 'px-3 py-1 text-sm'}
        rounded-md font-bold transition-colors flex items-center gap-1
      `}
            aria-label="Copy promo code FB69 to clipboard"
        >
            {copied ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path
                            fillRule="evenodd"
                            d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                            clipRule="evenodd"
                        />
                    </svg>
                    Copied!
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path
                            fillRule="evenodd"
                            d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                            clipRule="evenodd"
                        />
                        <path d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                    </svg>
                    Claim Offer Code
                </>
            )}
        </button>
    );
};
