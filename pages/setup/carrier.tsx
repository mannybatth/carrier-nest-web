'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { Card, CardContent, Typography } from '@mui/material';

import { Carrier, SubscriptionPlan } from '@prisma/client';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { notify } from '../../components/Notification';
import { PageWithAuth } from '../../interfaces/auth';
import { createNewCarrier, isCarrierCodeUnique } from '../../lib/rest/carrier';
import { createCheckoutSession } from '../../lib/rest/stripe';
import { RadioGroup } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/20/solid';

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
    totalPowerUnits: number | null; // assuming it could be null
};

type JsonResponse = {
    content: {
        carrier: CarrierObj;
    };
};

const steps = [
    {
        label: 'Company Lookup',
        optional: 'Search for your company by MC number',
    },
    {
        label: 'Company Account Details',
        optional: 'Finalize company profile with additional details',
    },
    {
        label: 'Select Plan',
        optional: 'Free, until you’re ready',
    },
];

export default function Home() {
    const [isLoading, setIsLoading] = useState(false);
    const [plan, setPlan] = useState<SubscriptionPlan>(SubscriptionPlan.BASIC);
    const formHook = useForm<Carrier>();
    const { replace } = useRouter();
    const { update, data: session, status } = useSession();

    const [error, setError] = useState<boolean>(false);
    const [companyData, setCompanyData] = useState<CarrierObj>();
    const countryOptions = ['United States', 'Canada', 'Mexico'];
    const planOptions = [
        { id: SubscriptionPlan.BASIC, title: 'Basic Plan', description: 'Basic features', users: 'Free' },
        { id: SubscriptionPlan.PRO, title: 'Pro Plan', description: 'Advanced features', users: '$20/month' },
    ];

    const fields: Array<{ id: keyof Carrier; label: string; required: boolean; type: string }> = [
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

    const [activeStep, setActiveStep] = React.useState(0);

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setCompanyData(undefined);
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleReset = () => {
        setActiveStep(0);
    };

    const getFMCSAData = async (mcNumber: string) => {
        formHook.reset();

        const url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/docket-number/${encodeURIComponent(
            mcNumber,
        )}?webKey=dd11efd7af252754dabb0e1e7557162cec4dc637`;

        const response = await fetch(url);

        if (response && response.status == 200) {
            const jsonData: JsonResponse = await response.json();

            const carrierData = (jsonData as any).content[0].carrier!;

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

            console.log('Carrier: ', carrier);

            setCompanyData(carrier);
        }
    };

    const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const value = (event as any).target.value;

        setCompanyData(undefined);
    };

    const handleSubmit = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        const value = (event as any).target.value;

        console.log('Value :', value);
        if (value == '') {
            setCompanyData(undefined);
        }

        if (event.key === 'Enter') {
            console.log('Submitted value:', value);
            getFMCSAData(value);
        }
    };

    const divWithLabelAndValue = (value: string, label: string, labelFontSize: number, valueFontSize: number) => {
        return (
            <div className="pb-2">
                <p
                    style={{ fontSize: labelFontSize }}
                    className={`text-[${labelFontSize}] text-gray-500 font-light p-0 m-0 uppercase`}
                >
                    {label}:{' '}
                </p>
                <p
                    style={{ fontSize: valueFontSize }}
                    className={`text-[${valueFontSize}] text-slate-600 font-bold uppercase`}
                >
                    {value}
                </p>
            </div>
        );
    };

    const DisplayCard = (result: CarrierObj) => {
        return (
            <Card
                sx={{
                    maxWidth: '40vw',
                    width: '80%',
                    margin: 'auto 0px',
                    padding: '0px',
                    marginTop: 0,
                    marginBottom: 2,
                    borderRadius: '8px',
                    bgcolor: '#fff',
                    color: '#ccc',
                    border: '2px solid #eee',
                    alignSelf: 'start',
                }}
            >
                <CardContent sx={{ padding: '12px', paddingBottom: '0px !important' }}>
                    {divWithLabelAndValue(
                        `${result.legalName} (${result.statusCode == 'A' ? 'Active' : ''}) - ${
                            result.carrierOperation.carrierOperationDesc
                        }`,
                        'Carrier Name',
                        14,
                        16,
                    )}

                    {divWithLabelAndValue(result.dotNumber.toString(), 'DOT Number', 14, 16)}
                    {divWithLabelAndValue(
                        `${result.phyStreet}, ${result.phyCity}, ${result.phyState} ${result.phyZipcode}`,
                        'Address',
                        14,
                        16,
                    )}
                </CardContent>
            </Card>
        );
    };

    const divWithLabelAndValueLoader = () => {
        return (
            <div className="pb-2 h-14 ">
                <p
                    style={{}}
                    className={`bg-slate-50/50 w-2/3 h-6 mb-1 animate-pulse rounded-md text-gray-400 font-light p-0 m-0 uppercase`}
                >
                    {' '}
                </p>
                <p
                    style={{}}
                    className={`bg-slate-100/30 w-11/12 h-4 mb-1 rounded-md text-slate-400 font-light uppercase`}
                >
                    {' '}
                </p>
            </div>
        );
    };

    const DisplayCardLoader = () => {
        return (
            <Card
                sx={{
                    maxWidth: '40vw',
                    width: '80%',
                    height: '50%',
                    margin: 'auto 0px',
                    padding: '0px',
                    marginTop: 0,
                    marginBottom: 2,
                    borderRadius: '8px',
                    bgcolor: '#eee',
                    color: '#eee',
                    border: '2px solid #eee',
                    alignSelf: 'start',
                }}
            >
                <CardContent sx={{ padding: '12px', paddingBottom: '0px !important' }}>
                    {divWithLabelAndValueLoader()}
                    {divWithLabelAndValueLoader()}
                    {divWithLabelAndValueLoader()}
                </CardContent>
            </Card>
        );
    };

    const companyLookUpStep = (step: { label: string; optional?: string }, index: number) => {
        return (
            <Step key={step.label}>
                <StepLabel
                    sx={{
                        '& .MuiStepLabel-label': {
                            fontSize: activeStep === index ? '44px' : '14px', // Adjust the label font size
                            fontWeight: activeStep === index ? 'bolder !important' : 'normal', // Adjust the label font size
                            marginLeft: activeStep === index ? '0px' : '', // Adjust the label font size
                            color: activeStep === index ? '#333' : '#999', // Adjust the label font size
                        },
                        '& .MuiStepLabel-optional': {
                            fontSize: '8px', // Adjust the optional text font size if needed
                        },
                    }}
                    optional={
                        step.optional ? (
                            <Typography variant="caption" sx={{ borderRadius: '2px' }}>
                                {step.optional}
                            </Typography>
                        ) : null
                    }
                >
                    {step.label}
                </StepLabel>

                <StepContent
                    sx={{
                        '& .MuiStepContent-root': {
                            fontSize: activeStep === index ? '42px' : '14px', // Adjust the label font size
                            fontWeight: activeStep === index ? 'bold' : 'normal', // Adjust the label font size
                            marginLeft: activeStep === index ? '32px' : '', // Adjust the label font size
                            backgroundColor: 'ActiveBorder',
                        },
                        '& .MuiStepContent-transition': {
                            fontSize: '18px', // Adjust the optional text font size if needed
                        },
                    }}
                >
                    <TextField
                        label="MC#"
                        variant="outlined"
                        onKeyDown={handleSubmit}
                        onChange={handleOnChange}
                        error={error}
                        helperText={error ? 'Must be at least 3 characters' : ' '}
                    />

                    {companyData && DisplayCard(companyData)}
                    {!companyData && DisplayCardLoader()}
                    <Box sx={{ mb: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleNext}
                            disabled={!companyData}
                            sx={{
                                mt: 1,
                                mr: 1,
                                bgcolor: 'blue !important',
                                ':disabled': { bgcolor: '#ccc !important' },
                            }}
                        >
                            {index === steps.length - 1 ? 'Finish' : 'Continue'}
                        </Button>
                    </Box>
                </StepContent>
            </Step>
        );
    };

    const companyFinalizeDetails = (step: { label: string; optional?: string }, index: number) => {
        return (
            <Step key={step.label}>
                <StepLabel
                    sx={{
                        '& .MuiStepLabel-label': {
                            fontSize: activeStep === index ? '44px' : '14px', // Adjust the label font size
                            fontWeight: activeStep === index ? 'bolder !important' : 'normal', // Adjust the label font size
                            marginLeft: activeStep === index ? '0px' : '', // Adjust the label font size
                            color: activeStep === index ? '#333' : '#999', // Adjust the label font size
                        },
                        '& .MuiStepLabel-optional': {
                            fontSize: '8px', // Adjust the optional text font size if needed
                        },
                    }}
                    optional={
                        step.optional ? (
                            <Typography variant="caption" sx={{ borderRadius: '2px' }}>
                                {step.optional}
                            </Typography>
                        ) : null
                    }
                >
                    {step.label}
                </StepLabel>

                <StepContent
                    sx={{
                        '& .MuiStepContent-root': {
                            fontSize: activeStep === index ? '42px' : '14px', // Adjust the label font size
                            fontWeight: activeStep === index ? 'bold' : 'normal', // Adjust the label font size
                            marginLeft: activeStep === index ? '32px' : '', // Adjust the label font size
                            backgroundColor: 'ActiveBorder',
                        },
                        '& .MuiStepContent-transition': {
                            fontSize: '18px', // Adjust the optional text font size if needed
                        },
                    }}
                >
                    <div className="bg-slate-50">
                        <div className="container px-0 py-8 m-0 max-w-7xl">
                            <div className="max-w-3xl px-8 py-10 m-0 bg-white shadow-xl rounded-2xl">
                                <div className="mb-8 text-center">
                                    <h1 className="text-3xl font-bold text-gray-900">Set Up Your Carrier Account</h1>
                                    <p className="mt-2 text-gray-500 bg-yellow-100 px-2 py-1 text-base rounded-lg w-fit m-auto">
                                        Please review the information below and fill in any missing details
                                    </p>
                                </div>

                                <form onSubmit={formHook.handleSubmit(onSubmit)} className="space-y-8">
                                    {/* Company Information Section */}
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
                                                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            id={field.id}
                                                            type="text"
                                                            {...formHook.register(field.id, {
                                                                required: field.required
                                                                    ? `${field.label} is required`
                                                                    : false,
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

                                    {/* Registration Numbers Section */}
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
                                                                required: field.required
                                                                    ? `${field.label} is required`
                                                                    : false,
                                                            })}
                                                        />
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Address Section */}
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-semibold text-gray-900">Address</h2>
                                        <div className="grid gap-6 md:grid-cols-2">
                                            {fields
                                                .filter((f) =>
                                                    ['street', 'city', 'state', 'zip', 'country'].includes(f.id),
                                                )
                                                .map((field) => (
                                                    <div
                                                        key={field.id}
                                                        className={field.id === 'street' ? 'md:col-span-2' : ''}
                                                    >
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
                                                                    required: field.required
                                                                        ? `${field.label} is required`
                                                                        : false,
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
                    </div>
                    <Box sx={{ mb: 2 }}>
                        <Button
                            variant="contained"
                            onClick={formHook.handleSubmit(handleNext)}
                            sx={{
                                mt: 1,
                                mr: 1,
                                bgcolor: 'blue !important',
                                ':disabled': { bgcolor: '#ccc !important' },
                            }}
                            disabled={false}
                        >
                            {index === steps.length - 1 ? 'Finish' : 'Continue'}
                        </Button>
                        <Button disabled={index === 0} onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                            Back
                        </Button>
                    </Box>
                </StepContent>
            </Step>
        );
    };

    const companyPlanSelection = (step: { label: string; optional?: string }, index: number) => {
        return (
            <Step key={step.label}>
                <StepLabel
                    sx={{
                        '& .MuiStepLabel-label': {
                            fontSize: activeStep === index ? '44px' : '14px', // Adjust the label font size
                            fontWeight: activeStep === index ? 'bolder !important' : 'normal', // Adjust the label font size
                            marginLeft: activeStep === index ? '0px' : '', // Adjust the label font size
                            color: activeStep === index ? '#333' : '#999', // Adjust the label font size
                        },
                        '& .MuiStepLabel-optional': {
                            fontSize: '8px', // Adjust the optional text font size if needed
                        },
                    }}
                    optional={
                        step.optional ? (
                            <Typography variant="caption" sx={{ borderRadius: '2px' }}>
                                {step.optional}
                            </Typography>
                        ) : null
                    }
                >
                    {step.label}
                </StepLabel>

                <StepContent
                    sx={{
                        '& .MuiStepContent-root': {
                            fontSize: activeStep === index ? '42px' : '14px', // Adjust the label font size
                            fontWeight: activeStep === index ? 'bold' : 'normal', // Adjust the label font size
                            marginLeft: activeStep === index ? '32px' : '', // Adjust the label font size
                            backgroundColor: 'ActiveBorder',
                        },
                        '& .MuiStepContent-transition': {
                            fontSize: '18px', // Adjust the optional text font size if needed
                        },
                    }}
                >
                    <div className="bg-slate-50">
                        <div className="container px-0 py-8 m-0 max-w-7xl">
                            <div className="max-w-3xl px-8 py-10 m-0 bg-white shadow-xl rounded-2xl">
                                <div className="mb-8 text-center">
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        Pick a plan that meets your needs
                                    </h1>
                                    <p className="mt-2 text-gray-500 text-light">
                                        You can change your plan at any time, if you are here to try out Carrier Nest,
                                        start with Basic Plan
                                    </p>
                                </div>

                                <form onSubmit={formHook.handleSubmit(onSubmit)} className="space-y-8">
                                    {/* Subscription Plan Section */}
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-semibold text-gray-900">Select a Plan</h2>
                                        <RadioGroup
                                            value={plan}
                                            onChange={setPlan}
                                            className="grid gap-4 mt-4 md:grid-cols-2"
                                        >
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
                    </div>
                    <Box sx={{ mb: 2 }}>
                        <button
                            type="submit"
                            disabled={isLoading}
                            onClick={formHook.handleSubmit(onSubmit)}
                            className={`w-fit px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors
                                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'Creating...' : 'Create Carrier'}
                        </button>
                        <Button disabled={index === 0} onClick={handleBack} sx={{ mt: 1, mr: 1, ml: 2 }}>
                            Back
                        </Button>
                    </Box>
                </StepContent>
            </Step>
        );
    };

    return (
        <div className="flex items-start justify-items-center min-h-screen bg-slate-50 w-full p-0 font-[family-name:var(--font-geist-sans)]">
            <div className="fixed top-0 w-full text-left">
                <h1 className="w-full h-16 p-4 bg-gray-700 text-2xl font-bold text-blue-100 uppercase text-center">
                    Carrier Nest - Carrier Setup
                </h1>
                <button
                    onClick={handleLogout}
                    className="absolute px-4 py-1 font-medium text-blue-600 bg-slate-200 ring-2 ring-blue-400 rounded-lg shadow-sm top-4 right-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-3 focus:ring-white"
                >
                    Logout
                </button>
            </div>
            <Box sx={{ maxWidth: 'full', width: '100%', padding: '32px', margin: '64px 64px' }}>
                <Stepper activeStep={activeStep} orientation="vertical">
                    {companyLookUpStep(steps[0], 0)}
                    {companyFinalizeDetails(steps[1], 1)}
                    {companyPlanSelection(steps[2], 2)}
                </Stepper>
                {activeStep === steps.length && (
                    <Paper square elevation={0} sx={{ p: 3 }}>
                        <Typography>All steps completed - you&apos;re finished</Typography>
                        <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
                            Reset
                        </Button>
                    </Paper>
                )}
            </Box>
        </div>
    );
}
