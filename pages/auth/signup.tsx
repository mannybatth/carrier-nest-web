'use client';

import { XCircleIcon, TruckIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import type { NextPage } from 'next';
import { signIn } from 'next-auth/react';
import React, { useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { appUrl } from 'lib/constants';

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
    default: 'An unknown error occurred during sign in. Please try again.',
};

type Props = {
    callbackUrl: string;
    requestType?: 'signin' | 'signup';
    error: SignInErrorTypes;
};

const SignUp: NextPage<Props> = ({ callbackUrl, error: errorType, requestType }: Props) => {
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
        <div className="min-h-screen bg-white">
            <div className="flex min-h-screen">
                {/* Left Column - Form */}
                <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
                    <div className="w-full max-w-sm mx-auto lg:w-96">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="mb-6">
                                <div className="flex items-center justify-center">
                                    <img
                                        src="/logo_truck.svg"
                                        alt="CarrierNest Logo"
                                        className="w-[75px] mx-auto mb-4 md:w-[100px] md:mb-6 lg:w-[125px] lg:mb-8"
                                    />
                                </div>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">CarrierNest</h1>
                            <p className="mt-2 text-sm text-gray-600">AI-powered trucking management</p>
                        </div>

                        {/* Main CTA */}
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
                                {requestType === 'signin' ? 'Welcome back' : 'Get started for free'}
                            </h2>
                            <p className="text-center text-gray-600 text-sm mb-6">
                                {requestType === 'signin'
                                    ? 'Sign in to your account'
                                    : 'Start with our free Basic Plan • No credit card required'}
                            </p>

                            {error && (
                                <div className="p-3 mb-6 bg-red-50 border border-red-200 rounded-lg">
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

                            {/* Social Login Buttons */}
                            <div className="space-y-3 mb-6">
                                <button
                                    onClick={() => signIn('google', { redirectTo: callbackUrl })}
                                    className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                                >
                                    <span
                                        className="w-5 h-5 rounded-full"
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
                                    <p className="mt-1 text-xs text-gray-500">We'll send you a secure sign-in link</p>
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
                                            {requestType === 'signin' ? 'Send sign-in link' : 'Get started free'}
                                            <ArrowRightIcon className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Terms */}
                            <p className="mt-4 text-xs text-center text-gray-500">
                                By continuing, you agree to our{' '}
                                <Link href="/terms" className="text-orange-600 hover:text-orange-500">
                                    Terms of Service
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column - Hero Image */}
                <div className="hidden relative flex-1 lg:block">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-orange-800/20 z-10" />
                    <img
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ objectPosition: '40% 50%' }}
                        src="/cover.jpg"
                        alt="CarrierNest trucking management"
                    />

                    {/* Overlay Content */}
                    <div className="absolute inset-0 z-20 flex flex-col justify-center  px-12 text-white  ">
                        <div className="max-w-md">
                            <h2 className="text-3xl font-bold mb-4">Smart trucking starts here</h2>
                            <p className="text-lg text-orange-100 mb-6">
                                Start with our free Basic Plan and upgrade when you're ready to scale.
                            </p>

                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                                <h3 className="font-semibold mb-2">Free Basic Plan includes:</h3>
                                <ul className="text-sm space-y-1 text-orange-100">
                                    <li>• 1 driver</li>
                                    <li>• 30 loads total</li>
                                    <li>• 10 AI imports/month</li>
                                    <li>• Mobile app access</li>
                                </ul>
                            </div>
                        </div>
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

export default SignUp;
