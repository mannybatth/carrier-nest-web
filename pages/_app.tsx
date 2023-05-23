import { NextComponentType, NextPageContext } from 'next';
import { Session } from 'next-auth';
import { SessionProvider, signIn, useSession } from 'next-auth/react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import React from 'react';
import { Toaster } from 'react-hot-toast';
import Spinner from '../components/Spinner';
import { AuthEnabledComponentConfig } from '../interfaces/auth';
import 'react-day-picker/lib/style.css';
import '../styles/globals.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/ban-types
type NextComponentWithAuth = NextComponentType<NextPageContext, any, {}> & Partial<AuthEnabledComponentConfig>;
type ProtectedAppProps = AppProps<{ session: Session }> & { Component: NextComponentWithAuth };

const Auth: React.FC = ({ children }) => {
    const { status } = useSession();

    React.useEffect(() => {
        if (status === 'loading') return; // Do nothing while loading
        if (status === 'unauthenticated') signIn(); // If not authenticated, force log in
    }, [status]);

    if (status === 'authenticated') {
        return <>{children}</>;
    }

    // Session is being fetched, or no user.
    // If no user, useEffect() will redirect.
    return (
        <div className="flex items-center justify-center h-full">
            <Spinner />
        </div>
    );
};

// Use of the <SessionProvider> is mandatory to allow components that call
// `useSession()` anywhere in your application to access the `session` object.
export default function App({ Component, pageProps: { session, ...pageProps } }: ProtectedAppProps) {
    return (
        <SessionProvider session={session}>
            <Head>
                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
                <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
            </Head>
            {Component.authenticationEnabled ? (
                <Auth {...pageProps}>
                    <Component {...pageProps} />
                </Auth>
            ) : (
                <Component {...pageProps} />
            )}
            <Toaster />
        </SessionProvider>
    );
}
