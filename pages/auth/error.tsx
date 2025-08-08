import React from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { PageWithAuth } from '../../interfaces/auth';

const ErrorPage: PageWithAuth = () => {
    const router = useRouter();
    const { error } = router.query;

    let errorMessage: string;

    switch (error) {
        case 'Signin':
            errorMessage = 'There was an error signing you in.';
            break;
        case 'OAuthSignin':
            errorMessage = 'There was an error attempting to sign you in through OAuth.';
            break;
        case 'OAuthCallback':
            errorMessage = 'There was an error attempting to complete the OAuth callback.';
            break;
        case 'OAuthCreateAccount':
            errorMessage = 'There was an error attempting to create a new account with OAuth.';
            break;
        case 'EmailCreateAccount':
            errorMessage = 'There was an error attempting to create a new account with email.';
            break;
        case 'Callback':
            errorMessage = 'There was an error attempting to run the callback.';
            break;
        case 'OAuthAccountNotLinked':
            errorMessage = 'To confirm your identity, sign in with the same account you used originally.';
            break;
        case 'EmailSignin':
            errorMessage = 'There was an error attempting to sign you in with email.';
            break;
        case 'CredentialsSignin':
            errorMessage =
                'Invalid credentials or account access denied. Please check your information or contact your administrator if your account has been deactivated.';
            break;
        case 'ACCOUNT_DEACTIVATED':
            errorMessage =
                'Your account has been deactivated. Please contact your account administrator for assistance.';
            break;
        case 'SESSION_REFRESH_FAILED':
            errorMessage = 'Your session has expired or your account status has changed. Please sign in again.';
            break;
        case 'SESSION_EXPIRED':
            errorMessage = 'Your session has expired. Please sign in again to continue.';
            break;
        default:
            errorMessage = 'An unknown error occurred.';
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <section className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                {error === 'ACCOUNT_DEACTIVATED' ? (
                    <>
                        <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636"
                                />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Account Deactivated</h1>
                        <p className="text-lg text-gray-700 mb-6 max-w-md">
                            Your account has been deactivated and you cannot sign in at this time.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md">
                            <p className="text-blue-800 text-sm">
                                <strong>Need help?</strong> Contact your account administrator or team lead to restore
                                access to your account.
                            </p>
                        </div>
                        <Link
                            href="/homepage"
                            className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                        >
                            Return to Homepage
                        </Link>
                    </>
                ) : (
                    <>
                        <h1 className="text-4xl font-bold text-gray-900">Oops!</h1>
                        <p className="my-4 text-lg text-gray-700">{errorMessage}</p>
                        <p>
                            <Link href="/auth/signin" className="text-blue-600 hover:underline">
                                Go back to Sign In page
                            </Link>
                        </p>
                    </>
                )}
            </section>
        </div>
    );
};

// Mark error page as public
ErrorPage.authenticationEnabled = false;

export default ErrorPage;
