'use client';

import { XCircleIcon, CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import type { NextPage } from 'next';
import React, { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';

type Props = {
    token: string;
    error?: string;
};

const Onboard: NextPage<Props> = ({ token, error: initialError }: Props) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(initialError || '');
    const [success, setSuccess] = useState(false);
    const [name, setName] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        document.documentElement.classList.add('h-full');
        return () => {
            document.documentElement.classList.remove('h-full');
        };
    }, []);

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
                // If the invitation was already used, it might be a race condition
                // In that case, treat it as success since the user likely completed the process
                if (data.error && data.error.includes('already been used')) {
                    console.log('Invitation already used - treating as success (likely race condition)');
                    setSuccess(true);
                    setTimeout(() => {
                        router.push('/auth/signin');
                    }, 10000);
                } else {
                    setError(data.error || 'Failed to complete onboarding');
                    setIsSubmitted(false); // Allow retry for other errors
                }
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
                        You&apos;re almost ready! Just enter your name to complete your account setup.
                    </p>
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

export default Onboard;
