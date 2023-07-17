import { XCircleIcon } from '@heroicons/react/outline';
import { NextPage } from 'next';
import { getSession } from 'next-auth/react';
import React, { PropsWithChildren } from 'react';
import { signIn } from 'next-auth/react';

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
    Signin: 'Try signing in with a different account.',
    OAuthSignin: 'Try signing in with a different account.',
    OAuthCallback: 'Try signing in with a different account.',
    OAuthCreateAccount: 'Try signing in with a different account.',
    EmailCreateAccount: 'Try signing in with a different account.',
    Callback: 'Try signing in with a different account.',
    OAuthAccountNotLinked: 'To confirm your identity, sign in with the same account you used originally.',
    EmailSignin: 'The e-mail could not be sent.',
    CredentialsSignin: 'Sign in failed. Check the details you provided are correct.',
    SessionRequired: 'Please sign in to access this page.',
    default: 'Unable to sign in.',
};

type Props = {
    callbackUrl: string;
    error: SignInErrorTypes;
};

const SignIn: NextPage<Props> = ({ callbackUrl, error: errorType }: Props) => {
    const error = errorType && (errors[errorType] ?? errors.default);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const { email } = event.target as HTMLFormElement;
        signIn('email', { email: email.value, callbackUrl });
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-blue-500">
            <div className="w-full max-w-md p-6 mx-auto mt-8 bg-white rounded-lg shadow-lg">
                <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">Sign in to your account</h2>
                <form className="mb-6 space-y-6" method="POST" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email address
                        </label>
                        <div className="mt-1">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="block w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Sign in with email
                        </button>
                    </div>
                </form>
                <div className="text-lg text-center text-gray-800">
                    <h3 className="mb-4">or</h3>
                    <div className="flex flex-col items-start">
                        <button
                            onClick={() => signIn('google', { callbackUrl })}
                            className="flex items-center justify-start w-full px-4 py-2 mb-2 font-bold text-gray-800 bg-white rounded-lg hover:bg-gray-100"
                        >
                            <span
                                className="mr-2"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 48 48'%3E%3Cdefs%3E%3Cpath id='a' d='M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z'/%3E%3C/defs%3E%3CclipPath id='b'%3E%3Cuse xlink:href='%23a' overflow='visible'/%3E%3C/clipPath%3E%3Cpath clip-path='url(%23b)' fill='%23FBBC05' d='M0 37V11l17 13z'/%3E%3Cpath clip-path='url(%23b)' fill='%23EA4335' d='M0 11l17 13 7-6.1L48 14V0H0z'/%3E%3Cpath clip-path='url(%23b)' fill='%2334A853' d='M0 37l30-23 7.9 1L48 0v48H0z'/%3E%3Cpath clip-path='url(%23b)' fill='%234285F4' d='M48 48L17 24l-4-3 35-10z'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center',
                                    width: '16px',
                                    height: '16px',
                                }}
                            ></span>
                            Continue with Google
                        </button>
                        <button
                            onClick={() => signIn('azure-ad', { callbackUrl })}
                            className="flex items-center justify-start w-full px-4 py-2 mb-2 font-bold text-gray-800 bg-white rounded-lg hover:bg-gray-100"
                        >
                            <span
                                className="mr-2"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='21' height='21'%3E%3Cpath fill='%23f25022' d='M1 1h9v9H1z'/%3E%3Cpath fill='%2300a4ef' d='M1 11h9v9H1z'/%3E%3Cpath fill='%237fba00' d='M11 1h9v9h-9z'/%3E%3Cpath fill='%23ffb900' d='M11 11h9v9h-9z'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center',
                                    width: '16px',
                                    height: '16px',
                                }}
                            ></span>
                            Continue with Microsoft
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

SignIn.getInitialProps = async (context) => {
    const { req, res } = context;
    const session = await getSession({ req });

    if (session && res && session.user) {
        res.writeHead(302, {
            Location: '/',
        });
        res.end();
        return;
    }

    return {
        callbackUrl: context.query.callbackUrl as string,
        error: context.query.error as SignInErrorTypes,
    };
};

export default SignIn;
