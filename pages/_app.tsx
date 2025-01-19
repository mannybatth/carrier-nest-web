import { NextComponentType, NextPageContext } from 'next';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import 'polyfills';
import React from 'react';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { UserProvider } from '../components/context/UserContext';
import ErrorBoundary from '../components/layout/ErrorBoundary';
import Spinner from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';
import { AuthEnabledComponentConfig } from '../interfaces/auth';
import '../styles/globals.css';

type NextComponentWithAuth = NextComponentType<NextPageContext, any, object> & Partial<AuthEnabledComponentConfig>;
type ProtectedAppProps = AppProps<{ session: Session }> & { Component: NextComponentWithAuth };

const AuthWrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { status, session } = useAuth();
    const router = useRouter();

    if (status === 'authenticated' && router.pathname === '/setup/carrier') {
        return <>{children}</>;
    }

    if (status === 'loading' || (status === 'authenticated' && !session?.user?.defaultCarrierId)) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Spinner />
            </div>
        );
    }

    if (status === 'authenticated') {
        return <>{children}</>;
    }

    return (
        <div className="flex items-center justify-center h-screen">
            <Spinner />
        </div>
    );
};

export default function App({ Component, pageProps: { session, ...pageProps } }: ProtectedAppProps) {
    return (
        <>
            <ErrorBoundary>
                <SessionProvider session={session}>
                    <Head>
                        <title>Carrier Nest</title>
                        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
                        <meta name="description" content="Carrier Nest - Transportation Management System" />
                        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
                    </Head>
                    {Component.authenticationEnabled ? (
                        <AuthWrapper>
                            <UserProvider>
                                <Component {...pageProps} />
                            </UserProvider>
                        </AuthWrapper>
                    ) : (
                        <Component {...pageProps} />
                    )}
                    <Toaster position="top-right" />
                </SessionProvider>
            </ErrorBoundary>
            <Analytics />
            <SpeedInsights />
        </>
    );
}
