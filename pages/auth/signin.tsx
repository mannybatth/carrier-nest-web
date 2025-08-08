'use client';

import { XCircleIcon, TruckIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import type { NextPage } from 'next';
import { signIn } from 'next-auth/react';
import React, { useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { appUrl } from 'lib/constants';
import { PageWithAuth } from '../../interfaces/auth';

type SignInErrorTypes =
    | 'Signin'
    | 'OAuthSignin'
    | 'OAuthCallback'
    | 'OAuthCreateAccount'
    | 'EmailCreateAccount'
    | 'Callback'
    | 'OAuthAccountNotLinked'
    | 'EmailSignin'
    | 'CredentialsSignin'
    | 'SessionRequired'
    | 'ACCOUNT_DEACTIVATED'
    | 'default';

const errors: Record<SignInErrorTypes, string> = {
    Signin: 'There was an error signing in with this account. Please try again.',
    OAuthSignin: 'There was an error signing in with OAuth. Please try again.',
    OAuthCallback: 'There was an error with the OAuth callback. Please try again.',
    OAuthCreateAccount: 'There was an error creating a new OAuth account. Please try again.',
    EmailCreateAccount:
        'There was an error creating a new account with this email. Please check the email and try again.',
    Callback: 'There was an error during the callback process. Please try again.',
    OAuthAccountNotLinked:
        'This OAuth account is not linked. To confirm your identity, sign in with the same account you used originally.',
    EmailSignin: 'The sign-in email could not be sent. Please check your email and try again.',
    CredentialsSignin: 'Sign in failed. Please check the details you provided are correct and try again.',
    SessionRequired: 'A session is required to access this page. Please sign in.',
    ACCOUNT_DEACTIVATED: 'Your account has been deactivated. Please contact your account administrator for assistance.',
    default: 'An unknown error occurred during sign in. Please try again.',
};

type Props = {
    callbackUrl: string;
    error: SignInErrorTypes;
};

const SignIn: PageWithAuth<Props> = ({ callbackUrl, error: errorType }: Props) => {
    const error = errorType && (errors[errorType] ?? errors.default);
    const [loadingSubmit, setLoadingSubmit] = React.useState(false);

    useEffect(() => {
        document.documentElement.classList.add('h-full');
        return () => {
            document.documentElement.classList.remove('h-full');
        };
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoadingSubmit(true);
        const { email } = event.target as HTMLFormElement;
        try {
            if (email.value === 'demo@user.com') {
                await signIn('demo_login', { email: email.value });
            } else {
                await signIn('nodemailer', { email: email.value, redirectTo: callbackUrl });
            }
        } catch (error) {
            console.error(error);
        }
        setTimeout(() => {
            setLoadingSubmit(false);
        }, 1000);
    };

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
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                    <p className="mt-2 text-sm text-gray-600">Sign in to your CarrierNest account</p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md mx-4">
                <div className="bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10 border border-gray-200">
                    {error && (
                        <div className="mb-6">
                            {errorType === 'ACCOUNT_DEACTIVATED' ? (
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                    <div className="text-center">
                                        <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                                            <XCircleIcon className="w-6 h-6 text-red-600" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            Account Unavailable
                                        </h3>
                                        <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                            Your account has been temporarily deactivated.
                                        </p>
                                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                                            <p className="text-gray-700 text-sm">
                                                Contact your account administrator to restore access.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
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
                        </div>
                    )}

                    {/* Social Login Buttons */}
                    <div className="space-y-3 mb-6">
                        <button
                            onClick={() => signIn('google', { redirectTo: callbackUrl })}
                            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                        >
                            <span
                                className="w-4 h-4"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 48 48'%3E%3Cdefs%3E%3Cpath id='a' d='M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z'/%3E%3C/defs%3E%3CclipPath id='b'%3E%3Cuse xlinkHref='%23a' overflow='visible'/%3E%3C/clipPath%3E%3Cpath clipPath='url(%23b)' fill='%23FBBC05' d='M0 37V11l17 13z'/%3E%3Cpath clipPath='url(%23b)' fill='%23EA4335' d='M0 11l17 13 7-6.1L48 14V0H0z'/%3E%3Cpath clipPath='url(%23b)' fill='%2334A853' d='M0 37l30-23 7.9 1L48 0v48H0z'/%3E%3Cpath clipPath='url(%23b)' fill='%234285F4' d='M48 48L17 24l-4-3 35-10z'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center',
                                    backgroundSize: 'contain',
                                }}
                            />
                            Continue with Google
                        </button>

                        <button
                            onClick={() => signIn('microsoft-entra-id', { redirectTo: callbackUrl })}
                            className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#0078d4] px-4 py-2.5 text-sm text-white hover:bg-[#106ebe] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <span
                                className="w-4 h-4"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='21' height='21'%3E%3Cpath fill='%23f25022' d='M1 1h9v9H1z'/%3E%3Cpath fill='%2300a4ef' d='M1 11h9v9H1z'/%3E%3Cpath fill='%237fba00' d='M11 1h9v9h-9z'/%3E%3Cpath fill='%23ffb900' d='M11 11h9v9h-9z'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center',
                                    backgroundSize: 'contain',
                                }}
                            />
                            Continue with Microsoft
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-3 text-gray-500 bg-white">Or with email</span>
                        </div>
                    </div>

                    {/* Email Form */}
                    <form className="space-y-4" method="POST" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="Enter your email"
                                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:ring-orange-500 focus:ring-1 transition-colors duration-200"
                            />
                            <p className="mt-1 text-xs text-gray-500">We&apos;ll send you a secure sign-in link</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loadingSubmit}
                            className="group relative flex w-full justify-center items-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {loadingSubmit ? (
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
                                    Sending link...
                                </>
                            ) : (
                                <>
                                    Send sign-in link
                                    <ArrowRightIcon className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-500">
                            Don&apos;t have an account?{' '}
                            <Link href="/auth/signup" className="text-blue-400 hover:text-blue-500 font-medium">
                                Sign up for free
                            </Link>
                        </p>
                    </div>

                    <div className="mt-2 text-center">
                        <p className="text-xs text-gray-500">
                            By signing in, you agree to our{' '}
                            <Link href="/terms" className="text-blue-400 hover:text-blue-500">
                                Terms of Service
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { res, query } = context;
    const baseUrl = `${context.req.headers['x-forwarded-proto']}://${context.req.headers.host}`;
    const url = `${baseUrl}/api/auth/session`;

    const headers = { ...context.req.headers } as Record<string, string>;

    // Remove hop-by-hop or invalid headers
    delete headers.connection;
    delete headers.upgrade;
    delete headers['accept-encoding'];

    const sessionResponse = await fetch(url, {
        headers: headers,
    });
    const session = await sessionResponse.json();

    if (session && res && session.user) {
        res.writeHead(302, {
            Location: '/',
        });
        res.end();
        return {
            props: {},
        };
    }

    const callbackUrl = query.callbackUrl?.includes('homepage') ? appUrl : query.callbackUrl;

    return {
        props: {
            callbackUrl: (callbackUrl as string) || appUrl,
            error: (query.error as SignInErrorTypes) || null,
        },
    };
};

// Mark signin page as public
SignIn.authenticationEnabled = false;

export default SignIn;
