import { RadioGroup } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import { Carrier, SubscriptionPlan } from '@prisma/client';
import { PageWithAuth } from 'interfaces/auth';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { notify } from '../../components/Notification';
import { createNewCarrier, isCarrierCodeUnique } from '../../lib/rest/carrier';
import { createCheckoutSession } from '../../lib/rest/stripe';

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
    };
    isActive: boolean;
    isCompleted: boolean;
    children: React.ReactNode;
};

const Step = ({ step, isActive, isCompleted, children }: StepProps) => (
    <li
        className={`relative flex-1 ${
            step.number < 3
                ? `after:content-[''] after:w-0.5 after:h-full after:inline-block after:absolute after:-bottom-11 after:left-5 ${
                      isCompleted ? 'after:bg-blue-600' : 'after:bg-gray-200'
                  }`
                : ''
        }`}
    >
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
                {step.number}
            </span>
            <div className={`block w-full ${(!isCompleted && !isActive && 'opacity-50') || ''}`}>
                <h4 className={`text-base mb-2 ${isActive || isCompleted ? 'text-blue-600' : 'text-gray-900'}`}>
                    {step.title}
                </h4>
                <p className="mb-4 text-sm text-gray-600">{step.description}</p>
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
    const planOptions = [
        { id: SubscriptionPlan.BASIC, title: 'Basic Plan', description: 'Basic features', users: 'Free' },
        { id: SubscriptionPlan.PRO, title: 'Pro Plan', description: 'Advanced features', users: '$20/month' },
    ];

    const fields: { id: keyof Carrier; label: string; required: boolean; type: string }[] = [
        { id: 'name', label: 'Company Name', required: true, type: 'input' },
        { id: 'email', label: 'Contact Email', required: true, type: 'input' },
        { id: 'phone', label: 'Phone Number', required: true, type: 'input' },
        { id: 'mcNum', label: 'MC Number', required: false, type: 'input' },
        { id: 'dotNum', label: 'DOT Number', required: false, type: 'input' },
        { id: 'street', label: 'Street Address', required: true, type: 'input' },
        { id: 'city', label: 'City', required: true, type: 'input' },
        { id: 'state', label: 'State', required: true, type: 'input' },
        { id: 'zip', label: 'Zip Code', required: true, type: 'input' },
        { id: 'country', label: 'Country', required: true, type: 'select' },
        { id: 'carrierCode', label: 'Carrier Code', required: true, type: 'input' },
    ];

    const [activeStep, setActiveStep] = React.useState(0);
    const mcNumberInputRef = useRef<HTMLInputElement>(null);
    const companyNameInputRef = useRef<HTMLInputElement>(null);
    const [fetchError, setFetchError] = useState<boolean>(false);

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
                    const url = await createCheckoutSession(SubscriptionPlan.PRO, data.email);
                    window.location.href = url;
                } else {
                    notify({ title: 'Carrier created successfully', type: 'success' });
                    await update();
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
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setCompanyData(undefined);
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
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

    const DisplayCard = (result: CarrierObj) => (
        <div className="max-w-40vw w-80% mx-auto my-2 p-0 rounded-8px bg-white text-gray-600 border-2 border-gray-200">
            <div className="p-3">
                <div className="pb-2">
                    <p className="text-sm font-light text-gray-500 uppercase">Carrier Name:</p>
                    <p className="text-base font-bold uppercase text-slate-600">{result.legalName}</p>
                </div>
                <div className="pb-2">
                    <p className="text-sm font-light text-gray-500 uppercase">DOT Number:</p>
                    <p className="text-base font-bold uppercase text-slate-600">{result.dotNumber.toString()}</p>
                </div>
                <div>
                    <p className="text-sm font-light text-gray-500 uppercase">Address:</p>
                    <p className="text-base font-bold uppercase text-slate-600">
                        {`${result.phyStreet}, ${result.phyCity}, ${result.phyState} ${result.phyZipcode}`}
                    </p>
                </div>
            </div>
        </div>
    );

    const DisplayCardSkeleton = () => (
        <div className="max-w-40vw w-80% mx-auto my-2 p-0 rounded-8px bg-white text-gray-600 border-2 border-gray-200 animate-pulse">
            <div className="p-3">
                <div className="pb-2">
                    <div className="w-24 h-4 p-0 m-0 mb-1 text-sm font-light text-gray-500 uppercase bg-gray-200 rounded"></div>
                    <div className="w-48 h-6 text-base font-bold uppercase bg-gray-200 rounded text-slate-600"></div>
                </div>
                <div className="pb-2">
                    <div className="w-24 h-4 p-0 m-0 mb-1 text-sm font-light text-gray-500 uppercase bg-gray-200 rounded"></div>
                    <div className="w-32 h-6 text-base font-bold uppercase bg-gray-200 rounded text-slate-600"></div>
                </div>
                <div>
                    <div className="w-24 h-4 p-0 m-0 mb-1 text-sm font-light text-gray-500 uppercase bg-gray-200 rounded"></div>
                    <div className="w-64 h-6 text-base font-bold uppercase bg-gray-200 rounded text-slate-600"></div>
                </div>
            </div>
        </div>
    );

    const CompanyLookup = () => (
        <>
            <div className="relative flex">
                <input
                    ref={mcNumberInputRef}
                    className="block w-full mt-1 border-gray-300 shadow-sm rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    type="text"
                    placeholder="Enter MC Number"
                    onKeyDown={handleSubmit}
                />
                <button
                    onClick={() => getFMCSAData(mcNumberInputRef.current?.value || '')}
                    className="inline-flex items-center px-4 py-2 mt-1 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Search
                </button>
            </div>
            {fetchError ? (
                <div className="p-4 mt-4 border border-yellow-200 rounded-md bg-yellow-50">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">Unable to fetch carrier data</h3>
                            <p className="mt-2 text-sm text-yellow-700">
                                We couldn&apos;t retrieve your carrier information. You can proceed to the next step and
                                enter your information manually.
                            </p>
                        </div>
                    </div>
                </div>
            ) : companyData ? (
                DisplayCard(companyData)
            ) : (
                DisplayCardSkeleton()
            )}
            <button
                className="py-2.5 px-12 mt-4 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                onClick={handleNext}
                disabled={!companyData && !fetchError}
            >
                Continue
            </button>
        </>
    );

    const CompanyDetails = () => (
        <>
            <div>
                <div className="px-8 py-10 m-0 bg-white border-2 border-gray-200">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-gray-900">Set Up Your Carrier Account</h1>
                        <p className="px-2 py-1 m-auto mt-2 text-base text-gray-500 bg-yellow-100 rounded-lg w-fit">
                            Please review the information below and fill in any missing details
                        </p>
                    </div>
                    <form onSubmit={formHook.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                {fields
                                    .filter((f) => ['name', 'email', 'phone'].includes(f.id))
                                    .map((field) => (
                                        <div key={field.id}>
                                            <label
                                                htmlFor={field.id}
                                                className="block text-sm font-medium text-gray-700"
                                            >
                                                {field.label}{' '}
                                                {field.required && <span className="text-red-500">*</span>}
                                            </label>
                                            <input
                                                ref={field.id === 'name' ? companyNameInputRef : null}
                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                id={field.id}
                                                type="text"
                                                {...formHook.register(field.id, {
                                                    required: field.required ? `${field.label} is required` : false,
                                                    onBlur:
                                                        field.id === 'name'
                                                            ? async (e) => {
                                                                  if (e.target.value.trim() !== '') {
                                                                      handleCarrierCode(e.target.value);
                                                                  }
                                                              }
                                                            : undefined,
                                                })}
                                            />
                                            {formHook.formState.errors[field.id] && (
                                                <p className="mt-1 text-sm text-red-600">
                                                    {formHook.formState.errors[field.id].message}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Registration Info</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                {fields
                                    .filter((f) => ['mcNum', 'dotNum', 'carrierCode'].includes(f.id))
                                    .map((field) => (
                                        <div key={field.id}>
                                            <label
                                                htmlFor={field.id}
                                                className="block text-sm font-medium text-gray-700"
                                            >
                                                {field.label}{' '}
                                                {field.required && <span className="text-red-500">*</span>}
                                                {field.id === 'carrierCode' && (
                                                    <span className="ml-2 text-sm text-gray-500">
                                                        (Driver login code)
                                                    </span>
                                                )}
                                            </label>
                                            <input
                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                id={field.id}
                                                type="text"
                                                {...formHook.register(field.id, {
                                                    required: field.required ? `${field.label} is required` : false,
                                                })}
                                            />
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Address</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                {fields
                                    .filter((f) => ['street', 'city', 'state', 'zip', 'country'].includes(f.id))
                                    .map((field) => (
                                        <div key={field.id} className={field.id === 'street' ? 'md:col-span-2' : ''}>
                                            <label
                                                htmlFor={field.id}
                                                className="block text-sm font-medium text-gray-700"
                                            >
                                                {field.label}{' '}
                                                {field.required && <span className="text-red-500">*</span>}
                                            </label>
                                            {field.type === 'select' ? (
                                                <select
                                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    id={field.id}
                                                    type="text"
                                                    {...formHook.register(field.id, {
                                                        required: field.required ? `${field.label} is required` : false,
                                                    })}
                                                />
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <div className="flex gap-4 mt-4">
                <button
                    className="py-2.5 px-12 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    onClick={formHook.handleSubmit(handleNext)}
                >
                    Continue
                </button>
                <button
                    className="py-2.5 px-6 text-sm font-medium text-white bg-gray-500 rounded-lg shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                    onClick={handleBack}
                >
                    Back
                </button>
            </div>
        </>
    );

    const PlanSelection = () => (
        <>
            <div>
                <div className="px-8 py-10 m-0 bg-white border-2 border-gray-200">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-gray-900">Select the Plan that Best Suits Your Needs</h1>
                        <p className="mt-2 text-gray-500 text-light">
                            You can upgrade or downgrade your plan at any time. If you are new to Carrier Nest, we
                            recommend starting with the Basic Plan.
                        </p>
                    </div>

                    <form onSubmit={formHook.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="space-y-6">
                            <RadioGroup value={plan} onChange={setPlan} className="grid gap-4 mt-4 md:grid-cols-2">
                                {planOptions.map((planOption) => (
                                    <RadioGroup.Option
                                        key={planOption.id}
                                        value={planOption.id}
                                        className={({ checked, active }) =>
                                            `relative flex cursor-pointer rounded-lg p-6 shadow-sm focus:outline-none
                                                ${
                                                    checked
                                                        ? 'bg-blue-50 border-2 border-blue-500'
                                                        : 'border border-gray-300'
                                                }
                                                ${active ? 'ring-2 ring-blue-500' : ''}
                                                hover:border-blue-500 transition-colors`
                                        }
                                    >
                                        {({ checked }) => (
                                            <>
                                                <div className="flex flex-1">
                                                    <div className="flex flex-col">
                                                        <RadioGroup.Label
                                                            as="span"
                                                            className="block text-lg font-medium text-gray-900"
                                                        >
                                                            {planOption.title}
                                                        </RadioGroup.Label>
                                                        <RadioGroup.Description
                                                            as="span"
                                                            className="mt-2 text-sm text-gray-500"
                                                        >
                                                            {planOption.description}
                                                        </RadioGroup.Description>
                                                        <RadioGroup.Description
                                                            as="span"
                                                            className="mt-4 text-lg font-medium text-gray-900"
                                                        >
                                                            {planOption.users}
                                                        </RadioGroup.Description>
                                                    </div>
                                                </div>
                                                {checked && (
                                                    <CheckCircleIcon
                                                        className="w-6 h-6 text-blue-600"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </>
                                        )}
                                    </RadioGroup.Option>
                                ))}
                            </RadioGroup>
                        </div>
                    </form>
                </div>
            </div>
            <div className="flex gap-4 mt-4">
                <button
                    type="submit"
                    disabled={isLoading || isSubmitButtonDisabled}
                    onClick={formHook.handleSubmit(onSubmit)}
                    className="py-2.5 px-12 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Creating...' : 'Create Carrier'}
                </button>
                <button
                    className="py-2.5 px-6 text-sm font-medium text-white bg-gray-500 rounded-lg shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                    onClick={handleBack}
                >
                    Back
                </button>
            </div>
        </>
    );

    const stepConfig = [
        {
            number: 1,
            title: 'Company Lookup',
            description: 'Locate your company using the MC number to automatically populate your details',
        },
        {
            number: 2,
            title: 'Company Account Details',
            description: 'Verify and complete your company profile information',
        },
        {
            number: 3,
            title: 'Select Plan',
            description: 'Choose a plan that best suits your needs - start with the Basic plan for free',
        },
    ];

    if (status === 'loading') {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (status !== 'authenticated' || session?.user?.defaultCarrierId) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
                <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <h1 className="text-2xl font-bold text-gray-900">Carrier Setup</h1>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <ol className="space-y-8">
                        <Step step={stepConfig[0]} isActive={activeStep === 0} isCompleted={activeStep > 0}>
                            <CompanyLookup />
                        </Step>

                        <Step step={stepConfig[1]} isActive={activeStep === 1} isCompleted={activeStep > 1}>
                            <CompanyDetails />
                        </Step>

                        <Step step={stepConfig[2]} isActive={activeStep === 2} isCompleted={activeStep > 2}>
                            <PlanSelection />
                        </Step>
                    </ol>
                </div>
            </main>
        </div>
    );
};

CarrierSetup.authenticationEnabled = true;

export default CarrierSetup;
