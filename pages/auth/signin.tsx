import { XCircleIcon } from '@heroicons/react/outline';
import { NextPage } from 'next';
import { getCsrfToken, getSession } from 'next-auth/react';
import React from 'react';

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
    csrfToken: string;
    error: SignInErrorTypes;
};

const SignIn: NextPage<Props> = ({ csrfToken, error: errorType }: Props) => {
    const error = errorType && (errors[errorType] ?? errors.default);

    return (
        <div className="flex flex-col min-h-full py-20 sm:px-6 lg:px-8 bg-gray-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <img
                    className="w-auto h-12 mx-auto"
                    src="https://tailwindui.com/img/logos/workflow-mark-blue-600.svg"
                    alt="Workflow"
                />
                <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900">Sign in to your account</h2>
            </div>

            {error && (
                <div className="p-4 mt-8 rounded-md sm:mx-auto sm:w-full sm:max-w-md bg-red-50">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <XCircleIcon className="w-5 h-5 text-red-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">{error}</h3>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="px-4 py-8 bg-white shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" method="POST" action="/api/auth/signin/email">
                        <input hidden name="csrfToken" type="hidden" defaultValue={csrfToken} />
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
                                Sign in
                            </button>
                        </div>
                    </form>
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
        csrfToken: await getCsrfToken(context),
        error: context.query.error as SignInErrorTypes,
    };
};

export default SignIn;
