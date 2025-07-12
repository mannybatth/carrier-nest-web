'use client';

import React, { useEffect, useState } from 'react';
import type { Carrier } from '@prisma/client';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import SettingsLayout from '../../components/layout/SettingsLayout';
import type { PageWithAuth } from '../../interfaces/auth';
import { updateCarrier } from '../../lib/rest/carrier';
import SettingsPageSkeleton from '../../components/skeletons/SettingsPageSkeleton';
import { notify } from '../../components/Notification';
import { useUserContext } from '../../components/context/UserContext';
import type { ExpandedCarrier } from 'interfaces/models';
import { InformationCircleIcon, LockClosedIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';

const SettingsPage: PageWithAuth = () => {
    const { setCarriers, defaultCarrier, setDefaultCarrier } = useUserContext();
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isDirty },
    } = useForm<Carrier>();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [codeDigits, setCodeDigits] = useState<string[]>(Array(6).fill(''));
    const [codeError, setCodeError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeletionInitiated, setIsDeletionInitiated] = useState(false);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [isExistingCode, setIsExistingCode] = useState(false);

    // Group fields by category for better organization
    const fieldGroups = [
        {
            id: 'company',
            title: 'Company',
            description: 'Update your company information and contact details',
            fields: [
                { id: 'name' as keyof Carrier, label: 'Company Name', required: true, type: 'input' },
                { id: 'email' as keyof Carrier, label: 'Contact Email', required: true, type: 'input' },
                { id: 'phone' as keyof Carrier, label: 'Phone Number', required: true, type: 'input' },
            ],
        },
        {
            id: 'regulatory',
            title: 'Regulatory',
            description: 'Manage your regulatory information and carrier code',
            fields: [
                { id: 'mcNum' as keyof Carrier, label: 'MC Number', required: false, type: 'input' },
                { id: 'dotNum' as keyof Carrier, label: 'DOT Number', required: false, type: 'input' },
                {
                    id: 'carrierCode' as keyof Carrier,
                    label: 'Carrier Code',
                    required: true,
                    type: 'input',
                    disabled: true,
                    hint: 'This code is used by drivers to sign in to the driver app. It cannot be changed.',
                    icon: <LockClosedIcon className="w-4 h-4 text-gray-400" />,
                },
            ],
        },
        {
            id: 'address',
            title: 'Address',
            description: "Update your company's physical address",
            fields: [
                { id: 'street' as keyof Carrier, label: 'Street Address', required: true, type: 'input' },
                { id: 'city' as keyof Carrier, label: 'City', required: true, type: 'input' },
                { id: 'state' as keyof Carrier, label: 'State', required: true, type: 'input' },
                { id: 'zip' as keyof Carrier, label: 'Zip Code', required: true, type: 'input' },
                { id: 'country' as keyof Carrier, label: 'Country', required: true, type: 'select' },
            ],
        },
    ];

    const countryOptions = ['United States', 'Canada', 'Mexico'];

    useEffect(() => {
        if (defaultCarrier) {
            applyCarrierToForm(defaultCarrier);
        }
    }, [defaultCarrier]);

    // Countdown timer for verification code expiration
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (expiresAt && showCodeModal) {
            const updateTimer = () => {
                const now = new Date().getTime();
                const expiry = new Date(expiresAt).getTime();
                const remaining = Math.max(0, expiry - now);

                setTimeRemaining(remaining);

                // If time is up, reset the flow
                if (remaining === 0) {
                    setCodeError('Verification code has expired. Please request a new one.');
                    setIsExistingCode(false);
                    clearInterval(interval);
                }
            };

            updateTimer(); // Update immediately
            interval = setInterval(updateTimer, 1000); // Update every second
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [expiresAt, showCodeModal]);

    // Helper function to format time remaining
    const formatTimeRemaining = (ms: number): string => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const applyCarrierToForm = (carrier: ExpandedCarrier) => {
        if (carrier) {
            // Flatten all fields from all groups
            const allFields = fieldGroups.flatMap((group) => group.fields);

            allFields.forEach((field) => {
                const value = carrier[field.id];
                if (value !== undefined) {
                    setValue(field.id, value);
                }
            });
        }
    };

    // Helper functions for verification code digit inputs
    const handleDigitChange = (index: number, value: string) => {
        // Only allow single digits
        if (value.length > 1) return;

        // Only allow numeric values
        if (value !== '' && !/^\d$/.test(value)) return;

        const newDigits = [...codeDigits];
        newDigits[index] = value;
        setCodeDigits(newDigits);

        // Update the main verification code state
        const fullCode = newDigits.join('');
        setVerificationCode(fullCode);

        // Clear error when user types
        setCodeError('');

        // Auto-focus next input
        if (value !== '' && index < 5) {
            const nextInput = document.getElementById(`code-digit-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle backspace to move to previous input
        if (e.key === 'Backspace' && codeDigits[index] === '' && index > 0) {
            const prevInput = document.getElementById(`code-digit-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

        if (pastedData.length > 0) {
            const newDigits = Array(6).fill('');
            for (let i = 0; i < pastedData.length && i < 6; i++) {
                newDigits[i] = pastedData[i];
            }
            setCodeDigits(newDigits);
            setVerificationCode(newDigits.join(''));
            setCodeError('');

            // Focus the next empty input or the last input
            const nextEmptyIndex = newDigits.findIndex((digit) => digit === '');
            const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
            const targetInput = document.getElementById(`code-digit-${focusIndex}`);
            targetInput?.focus();
        }
    };

    const onSubmit = async (data: Carrier) => {
        try {
            setSaving(true);

            // Ensure we're using the original carrier code
            if (defaultCarrier) {
                data.carrierCode = defaultCarrier.carrierCode;
            }

            const newCarrier = await updateCarrier(defaultCarrier?.id, data);

            notify({
                title: 'Changes Saved',
                message: 'Your settings have been updated successfully',
                type: 'success',
            });

            setCarriers((prevCarriers) => {
                const index = prevCarriers.findIndex((carrier) => carrier.id === newCarrier.id);
                const newCarriers = [...prevCarriers];
                newCarriers[index] = newCarrier;
                return newCarriers;
            });

            setDefaultCarrier(newCarrier);
            setSaving(false);
        } catch (error) {
            notify({ title: error.message, type: 'error' });
            setSaving(false);
        }
    };

    const handleDeleteAccount = () => {
        setShowDeleteModal(true);
    };

    const initiateDeletion = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch('/api/account/initiate-deletion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok) {
                setExpiresAt(data.expiresAt);
                setIsDeletionInitiated(true);
                setIsExistingCode(data.isExisting || false);
                setShowDeleteModal(false); // Close confirmation modal
                setShowCodeModal(true); // Open verification modal

                const message = data.isExisting
                    ? 'Using existing verification code. Please check your email.'
                    : 'Verification code sent to your email';

                notify({ title: message, type: 'success' });
            } else {
                notify({ title: data.error || 'Failed to send verification code', type: 'error' });
            }
        } catch (error) {
            console.error('Error initiating deletion:', error);
            notify({ title: 'Failed to send verification code', type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const verifyAndDelete = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setCodeError('Please enter a 6-digit verification code');
            return;
        }

        setIsDeleting(true);
        setCodeError('');

        try {
            const response = await fetch('/api/account/verify-deletion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: verificationCode }),
            });

            const data = await response.json();

            if (response.ok) {
                notify({ title: `Account "${data.carrierName}" has been successfully deleted`, type: 'success' });
                setShowCodeModal(false);
                // Sign out the user and redirect to homepage
                await signOut({ callbackUrl: '/' });
            } else {
                setCodeError(data.error || 'Invalid verification code');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            setCodeError('Failed to delete account. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const resetDeletionFlow = () => {
        setShowDeleteModal(false);
        setShowCodeModal(false);
        setVerificationCode('');
        setCodeDigits(Array(6).fill(''));
        setCodeError('');
        setIsDeletionInitiated(false);
        setExpiresAt(null);
        setTimeRemaining(0);
        setIsExistingCode(false);
    };

    return (
        <SettingsLayout title="General Settings">
            {defaultCarrier ? (
                <div>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-10">
                            {fieldGroups.map((group) => (
                                <div
                                    key={group.id}
                                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
                                    id={group.id}
                                >
                                    <div className="px-8 py-6 border-b border-gray-100">
                                        <h2 className="text-xl font-medium text-gray-900">{group.title}</h2>
                                        <p className="mt-1 text-sm text-gray-500">{group.description}</p>
                                    </div>

                                    <div className="px-8 py-6">
                                        <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
                                            {group.fields.map((field) => (
                                                <div
                                                    key={field.id}
                                                    className={field.id === 'street' ? 'sm:col-span-2' : ''}
                                                >
                                                    <label
                                                        htmlFor={field.id}
                                                        className="block text-sm font-medium text-gray-700 mb-1"
                                                    >
                                                        {field.label}
                                                        {field.required && (
                                                            <span className="text-red-400 ml-0.5">*</span>
                                                        )}
                                                    </label>

                                                    <div className="relative">
                                                        {field.type === 'input' ? (
                                                            <>
                                                                <div className="relative">
                                                                    {field.icon && (
                                                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                                            {field.icon}
                                                                        </div>
                                                                    )}
                                                                    <input
                                                                        type="text"
                                                                        id={field.id}
                                                                        disabled={field.disabled}
                                                                        {...register(field.id, {
                                                                            required: field.required
                                                                                ? `${field.label} is required`
                                                                                : false,
                                                                        })}
                                                                        className={`
                                        block w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-gray-900
                                        shadow-sm ring-1 ring-inset ring-gray-200
                                        placeholder:text-gray-400
                                        focus:ring-2 focus:ring-inset focus:ring-gray-900
                                        transition-all duration-200
                                        ${field.icon ? 'pl-10' : ''}
                                        ${errors[field.id] ? 'ring-red-300 focus:ring-red-500' : ''}
                                        ${
                                            field.disabled
                                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-75'
                                                : ''
                                        }
                                      `}
                                                                    />
                                                                </div>
                                                            </>
                                                        ) : field.type === 'select' ? (
                                                            <select
                                                                id={field.id}
                                                                disabled={field.disabled}
                                                                {...register(field.id, {
                                                                    required: field.required
                                                                        ? `${field.label} is required`
                                                                        : false,
                                                                })}
                                                                className={`
                                    block w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-gray-900
                                    shadow-sm ring-1 ring-inset ring-gray-200
                                    focus:ring-2 focus:ring-inset focus:ring-gray-900
                                    transition-all duration-200
                                    ${errors[field.id] ? 'ring-red-300 focus:ring-red-500' : ''}
                                    ${field.disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-75' : ''}
                                  `}
                                                            >
                                                                {countryOptions.map((option) => (
                                                                    <option key={option} value={option}>
                                                                        {option}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : null}
                                                    </div>

                                                    {field.hint && (
                                                        <div className="mt-2 flex items-start">
                                                            {field.id === 'carrierCode' && (
                                                                <div className="flex-shrink-0 mt-0.5">
                                                                    <InformationCircleIcon className="h-4 w-4 text-blue-500" />
                                                                </div>
                                                            )}
                                                            <p
                                                                className={`text-sm ${
                                                                    field.id === 'carrierCode'
                                                                        ? 'text-blue-700 ml-2'
                                                                        : 'text-gray-500'
                                                                }`}
                                                            >
                                                                {field.hint}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {field.id === 'carrierCode' && (
                                                        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                                            <div className="flex">
                                                                <div className="flex-shrink-0">
                                                                    <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                                                                </div>
                                                                <div className="ml-3">
                                                                    <h3 className="text-sm font-medium text-blue-800">
                                                                        Driver Sign-In Information
                                                                    </h3>
                                                                    <div className="mt-1 text-sm text-blue-700">
                                                                        <p>
                                                                            This carrier code is required for drivers to
                                                                            sign in to the driver app. Please share this
                                                                            code with your drivers.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {errors[field.id] && (
                                                        <p className="mt-1.5 text-sm text-red-500">
                                                            {errors[field.id].message}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="sticky bottom-0 mt-8 py-4 bg-white/80 backdrop-blur-md border-t border-gray-100">
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!isDirty || saving}
                                    className={`
                      inline-flex items-center justify-center ml-3 px-5 py-2.5 text-sm font-medium text-white
                      rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200
                      ${
                          isDirty && !saving
                              ? 'bg-gray-900 hover:bg-gray-800 focus:ring-gray-900'
                              : 'bg-gray-400 cursor-not-allowed'
                      }
                    `}
                                >
                                    {saving ? (
                                        <>
                                            <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    fill="none"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>

                    <div className="mt-10 mb-16">
                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                            <div className="px-8 py-6 border-b border-gray-100">
                                <h2 className="text-xl font-medium text-red-500">Danger Zone</h2>
                                <p className="mt-1 text-sm text-gray-500">Permanent actions that cannot be undone</p>
                            </div>
                            <div className="px-8 py-6">
                                <button
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    className="px-6 py-3 text-sm font-medium text-red-600 bg-red-50 rounded-xl
                                             hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500
                                             focus:ring-offset-2 transition-all duration-200 border border-red-200"
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Delete Account Confirmation Modal */}
                    {showDeleteModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div
                                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                                onClick={() => setShowDeleteModal(false)}
                                aria-hidden="true"
                            />
                            <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
                                {/* Header */}
                                <div className="text-center pt-8 px-6">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                                        <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Delete Account?</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        This will permanently delete your account and all associated data. This action
                                        cannot be undone.
                                    </p>
                                </div>

                                {/* Content */}
                                <div className="px-6 py-6">
                                    <div className="space-y-3 text-sm text-gray-500">
                                        <div className="flex items-start space-x-3">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                            <span>All loads and shipment history</span>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                            <span>Driver profiles and records</span>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                            <span>Invoices and financial data</span>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                            <span>Company settings and preferences</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="px-6 pb-6 space-y-3">
                                    <button
                                        type="button"
                                        onClick={initiateDeletion}
                                        disabled={isDeleting}
                                        className="w-full h-12 text-white bg-red-500 hover:bg-red-600 disabled:bg-red-400
                                                 rounded-xl font-medium text-base transition-colors duration-200
                                                 flex items-center justify-center space-x-2"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                        fill="none"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    />
                                                </svg>
                                                <span>Sending Verification...</span>
                                            </>
                                        ) : (
                                            <span>Continue</span>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteModal(false)}
                                        disabled={isDeleting}
                                        className="w-full h-12 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100
                                                 disabled:opacity-50 rounded-xl font-medium text-base transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Verification Code Modal */}
                    {showCodeModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" />
                            <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
                                {/* Header */}
                                <div className="text-center pt-8 px-6">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                                        <svg
                                            className="w-8 h-8 text-blue-500"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                        Enter Verification Code
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed px-2">
                                        {isExistingCode
                                            ? 'Enter the verification code from your email to confirm account deletion.'
                                            : "We've sent a 6-digit code to your email address."}
                                    </p>
                                    {timeRemaining > 0 && (
                                        <div className="mt-3">
                                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                Expires in {formatTimeRemaining(timeRemaining)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Code Input */}
                                <div className="px-6 py-6">
                                    <div className="flex justify-center space-x-3 mb-6">
                                        {codeDigits.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`code-digit-${index}`}
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={digit}
                                                onChange={(e) => handleDigitChange(index, e.target.value)}
                                                onKeyDown={(e) => handleDigitKeyDown(index, e)}
                                                onPaste={handleDigitPaste}
                                                maxLength={1}
                                                className={`
                                                    w-12 h-14 text-center text-2xl font-medium
                                                    bg-gray-50 border-0 rounded-xl text-gray-900
                                                    focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-0
                                                    transition-all duration-200 outline-none
                                                    ${codeError ? 'bg-red-50 ring-2 ring-red-200' : ''}
                                                    ${digit ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}
                                                `}
                                                placeholder="•"
                                            />
                                        ))}
                                    </div>

                                    {codeError && (
                                        <div className="text-center mb-4">
                                            <p className="text-sm text-red-500">{codeError}</p>
                                        </div>
                                    )}

                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            {timeRemaining > 0
                                                ? `Didn't receive the code? Check your spam folder.`
                                                : 'Code has expired. Please request a new one.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="px-6 pb-6 space-y-3">
                                    <button
                                        type="button"
                                        onClick={verifyAndDelete}
                                        disabled={isDeleting || verificationCode.length !== 6 || timeRemaining === 0}
                                        className="w-full h-12 text-white bg-red-500 hover:bg-red-600 disabled:bg-gray-300
                                                 disabled:text-gray-500 rounded-xl font-medium text-base transition-colors duration-200
                                                 flex items-center justify-center space-x-2"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                        fill="none"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    />
                                                </svg>
                                                <span>Deleting Account...</span>
                                            </>
                                        ) : (
                                            <span>Delete Account</span>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetDeletionFlow}
                                        disabled={isDeleting}
                                        className="w-full h-12 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100
                                                 disabled:opacity-50 rounded-xl font-medium text-base transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <SettingsPageSkeleton />
            )}
        </SettingsLayout>
    );
};

SettingsPage.authenticationEnabled = true;

export default SettingsPage;
