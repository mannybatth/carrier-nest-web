import React from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';

const ErrorPage: NextPage = () => {
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
            errorMessage = 'Sign in with credentials is not available.';
            break;
        default:
            errorMessage = 'An unknown error occurred.';
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <section className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                <h1 className="text-4xl font-bold text-gray-900">Oops!</h1>
                <p className="my-4 text-lg text-gray-700">{errorMessage}</p>
                <p>
                    <Link href="/auth/signin" className="text-blue-600 hover:underline">
                        Go back to Sign In page
                    </Link>
                </p>
            </section>
        </div>
    );
};

export default ErrorPage;
