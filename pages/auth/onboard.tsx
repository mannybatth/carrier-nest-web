'use client';

import { XCircleIcon, CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import type { NextPage } from 'next';
import React, { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PageWithAuth } from '../../interfaces/auth';

type Props = {
    token: string;
    error?: string;
};

const Onboard: PageWithAuth<Props> = ({ token, error: initialError }: Props) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(initialError || '');
    const [success, setSuccess] = useState(false);
    const [name, setName] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [tokenValidation, setTokenValidation] = useState<{
        isValidating: boolean;
        isValid: boolean;
        validationError: string;
        invitationData?: any;
    }>({
        isValidating: true,
        isValid: false,
        validationError: '',
    });

    useEffect(() => {
        document.documentElement.classList.add('h-full');
        return () => {
            document.documentElement.classList.remove('h-full');
        };
    }, []);

    // Validate token on component mount
    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setTokenValidation({
                    isValidating: false,
                    isValid: false,
                    validationError: 'Missing invitation token',
                });
                return;
            }

            try {
                const response = await fetch(`/api/team/invitation/validate?token=${encodeURIComponent(token)}`);
                const data = await response.json();

                if (data.valid) {
                    setTokenValidation({
                        isValidating: false,
                        isValid: true,
                        validationError: '',
                        invitationData: data.invitation,
                    });
                } else {
                    setTokenValidation({
                        isValidating: false,
                        isValid: false,
                        validationError: data.error || 'Invalid invitation token',
                    });
                }
            } catch (err) {
                console.error('Token validation error:', err);
                setTokenValidation({
                    isValidating: false,
                    isValid: false,
                    validationError: 'Failed to validate invitation token',
                });
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Prevent duplicate submissions
        if (loading || isSubmitted) {
            return;
        }

        setLoading(true);
        setError('');

        if (!name.trim()) {
            setError('Please enter your full name');
            setLoading(false);
            return;
        }

        if (name.trim().length < 2) {
            setError('Name must be at least 2 characters long');
            setLoading(false);
            return;
        }

        try {
            setIsSubmitted(true); // Mark as submitted to prevent retries

            const response = await fetch('/api/team/invitation/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    name: name.trim(),
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                // Redirect to sign in page after 10 seconds
                setTimeout(() => {
                    router.push('/auth/signin');
                }, 10000);
            } else {
                // Handle specific error cases
                if (data.error && data.error.includes('already been used')) {
                    setError(
                        'This invitation has already been used. If you already have an account, please sign in instead.',
                    );
                } else if (data.error && data.error.includes('expired')) {
                    setError('This invitation has expired. Please contact your administrator for a new invitation.');
                } else if (data.error && data.error.includes('not found')) {
                    setError('This invitation is not valid. Please check the link or contact your administrator.');
                } else {
                    setError(data.error || 'Failed to complete onboarding. Please try again.');
                }
                setIsSubmitted(false); // Allow retry for invitation errors
            }
        } catch (err) {
            console.error('Onboarding error:', err);
            setError('An unexpected error occurred. Please try again.');
            setIsSubmitted(false); // Allow retry on network errors
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="flex items-center justify-center">
                                <img
                                    src="/logo_truck.svg"
                                    alt="CarrierNest Logo"
                                    className="w-[75px] mx-auto mb-4 md:w-[100px] md:mb-6 lg:w-[125px] lg:mb-8"
                                />
                            </div>
                        </div>
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900">Welcome to the team!</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Your account has been set up successfully. You&apos;ll be redirected to sign in shortly...
                        </p>
                        <p className="mt-1 text-xs text-gray-500">Redirecting to sign in page in 10 seconds</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show loading state while validating token
    if (tokenValidation.isValidating) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="flex items-center justify-center">
                                <img
                                    src="/logo_truck.svg"
                                    alt="CarrierNest Logo"
                                    className="w-[75px] mx-auto mb-4 md:w-[100px] md:mb-6 lg:w-[125px] lg:mb-8"
                                />
                            </div>
                        </div>
                        <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
                        <h1 className="text-xl font-semibold text-gray-900">Validating invitation...</h1>
                        <p className="mt-2 text-sm text-gray-600">Please wait while we verify your invitation.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state if token is invalid
    if (!tokenValidation.isValid) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="flex items-center justify-center">
                                <img
                                    src="/logo_truck.svg"
                                    alt="CarrierNest Logo"
                                    className="w-[75px] mx-auto mb-4 md:w-[100px] md:mb-6 lg:w-[125px] lg:mb-8"
                                />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
                            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                                <XCircleIcon className="w-6 h-6 text-red-600" />
                            </div>
                            <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation Invalid</h1>
                            <p className="text-gray-600 text-sm mb-4">{tokenValidation.validationError}</p>
                            <div className="space-y-3">
                                <Link
                                    href="/auth/signin"
                                    className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 text-center"
                                >
                                    Go to Sign In
                                </Link>
                                <p className="text-xs text-gray-500">
                                    Need a new invitation? Contact your team administrator.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Header */}
                <div className="text-center">
                    <div className="mb-6">
                        <div className="flex items-center justify-center">
                            <img
                                src="/logo_truck.svg"
                                alt="CarrierNest Logo"
                                className="w-[75px] mx-auto mb-4 md:w-[100px] md:mb-6 lg:w-[125px] lg:mb-8"
                            />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Complete Your Setup</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Welcome! You&apos;ve been invited to join{' '}
                        <span className="font-medium text-gray-900">
                            {tokenValidation.invitationData?.carrierName || 'the team'}
                        </span>
                        .
                    </p>
                    {tokenValidation.invitationData?.inviterName && (
                        <p className="mt-1 text-xs text-gray-500">
                            Invited by {tokenValidation.invitationData.inviterName}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md mx-4">
                <div className="bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10 border border-gray-200">
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <XCircleIcon className="w-4 h-4 text-red-400" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Onboarding Form */}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={loading || isSubmitted}
                                placeholder="Enter your full name"
                                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:ring-orange-500 focus:ring-1 transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-gray-500">This will be displayed to your team members</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !name.trim() || isSubmitted}
                            className="group relative flex w-full justify-center items-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {loading ? (
                                <>
                                    <svg
                                        className="mr-2 w-4 h-4 text-white animate-spin"
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
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Setting up your account...
                                </>
                            ) : (
                                <>
                                    Complete Setup
                                    <ArrowRightIcon className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-500">
                            Need help?{' '}
                            <Link href="/support" className="text-blue-400 hover:text-blue-500 font-medium">
                                Contact support
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { query } = context;
    const token = query.token as string;

    if (!token) {
        return {
            redirect: {
                destination: '/auth/signin?error=MissingToken',
                permanent: false,
            },
        };
    }

    // Basic token format validation
    if (typeof token !== 'string' || token.length < 10) {
        return {
            props: {
                token,
                error: 'Invalid invitation token',
            },
        };
    }

    return {
        props: {
            token,
        },
    };
};

// Mark onboard page as public
Onboard.authenticationEnabled = false;

export default Onboard;
