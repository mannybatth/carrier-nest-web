import { XCircleIcon } from '@heroicons/react/24/solid';
import { NextPage } from 'next';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import React, { useEffect } from 'react';
import { GetServerSideProps } from 'next';

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
    error: SignInErrorTypes;
};

const SignIn: NextPage<Props> = ({ callbackUrl, error: errorType }: Props) => {
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
        <div className="flex flex-1 min-h-full">
            <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
                <div className="w-full max-w-sm mx-auto lg:w-96">
                    <div>
                        <Image
                            src="/logo_truck.svg"
                            alt="Logo"
                            width={100}
                            height={72}
                            className="w-[100px] mb-4"
                        ></Image>
                        <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-gray-900">
                            Sign in to your account
                        </h2>
                        {/* <p className="mt-2 text-sm leading-6 text-gray-500">
                            Not a member?{' '}
                            <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500">
                                Start a 14 day free trial
                            </a>
                        </p> */}
                    </div>

                    {error && (
                        <div className="p-4 mt-3 rounded-md bg-red-50">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <XCircleIcon className="w-5 h-5 text-red-400" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">
                                        There were errors with your submission
                                    </h3>
                                    <div className="mt-2 text-sm text-red-700">
                                        <ul role="list" className="pl-5 list-disc">
                                            <li>{error}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-5">
                        <div>
                            <form className="space-y-6" method="POST" onSubmit={handleSubmit}>
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium leading-6 text-gray-900"
                                    >
                                        Email address
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-orange-800 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <button
                                        type="submit"
                                        disabled={loadingSubmit}
                                        className="flex w-full justify-center items-center rounded-md bg-orange-800 h-9 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-800"
                                    >
                                        {loadingSubmit ? (
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
                                        ) : (
                                            'Sign in with email'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="mt-10">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center text-sm font-medium leading-6">
                                    <span className="px-6 text-gray-900 bg-white">Or continue with</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <button
                                    onClick={() => signIn('google', { redirectTo: callbackUrl })}
                                    className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[#505050] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24292F]"
                                >
                                    <span
                                        className="mr-2"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 48 48'%3E%3Cdefs%3E%3Cpath id='a' d='M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z'/%3E%3C/defs%3E%3CclipPath id='b'%3E%3Cuse xlink:href='%23a' overflow='visible'/%3E%3C/clipPath%3E%3Cpath clip-path='url(%23b)' fill='%23FBBC05' d='M0 37V11l17 13z'/%3E%3Cpath clip-path='url(%23b)' fill='%23EA4335' d='M0 11l17 13 7-6.1L48 14V0H0z'/%3E%3Cpath clip-path='url(%23b)' fill='%2334A853' d='M0 37l30-23 7.9 1L48 0v48H0z'/%3E%3Cpath clip-path='url(%23b)' fill='%234285F4' d='M48 48L17 24l-4-3 35-10z'/%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'center',
                                            width: '18px',
                                            height: '18px',
                                        }}
                                    ></span>
                                    <span className="text-sm font-semibold leading-6">Google</span>
                                </button>

                                <button
                                    onClick={() => signIn('microsoft-entra-id', { redirectTo: callbackUrl })}
                                    className="flex w-full items-center justify-center gap-3 rounded-md bg-[#24292F] px-3 py-1.5 text-white hover:bg-[#3c3f43] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24292F]"
                                >
                                    <span
                                        className="mr-2"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='21' height='21'%3E%3Cpath fill='%23f25022' d='M1 1h9v9H1z'/%3E%3Cpath fill='%2300a4ef' d='M1 11h9v9H1z'/%3E%3Cpath fill='%237fba00' d='M11 1h9v9h-9z'/%3E%3Cpath fill='%23ffb900' d='M11 11h9v9h-9z'/%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'center',
                                            width: '18px',
                                            height: '18px',
                                        }}
                                    ></span>
                                    <span className="text-sm font-semibold leading-6">Microsoft</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative flex-1 hidden w-0 lg:block">
                <img
                    className="absolute inset-0 object-cover w-full h-full"
                    style={{ objectPosition: '40% 50%' }}
                    src="/cover.jpg"
                    alt=""
                />
            </div>
        </div>
    );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { res, query } = context;
    const url = `${context.req.headers['x-forwarded-proto']}://${context.req.headers.host}/api/auth/session`;

    const sessionResponse = await fetch(url, {
        headers: new Headers(context.req.headers as Record<string, string>),
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

    const callbackUrl = query.callbackUrl?.includes('homepage') ? '/' : query.callbackUrl;

    return {
        props: {
            callbackUrl: (callbackUrl as string) || '/',
            error: (query.error as SignInErrorTypes) || null,
        },
    };
};

export default SignIn;
