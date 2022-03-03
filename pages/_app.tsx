import React from 'react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { SessionProvider, signIn, useSession } from 'next-auth/react';
import '../styles/globals.css';
import 'react-day-picker/lib/style.css';
import { NextComponentType, NextPageContext } from 'next';
import { AuthEnabledComponentConfig } from '../interfaces/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/ban-types
type NextComponentWithAuth = NextComponentType<NextPageContext, any, {}> & Partial<AuthEnabledComponentConfig>;
type ProtectedAppProps = AppProps & { Component: NextComponentWithAuth };

const App: React.FC<ProtectedAppProps> = ({ Component, pageProps }: ProtectedAppProps) => {
    return (
        <SessionProvider session={pageProps.session}>
            <Head>
                <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
            </Head>
            {Component.authenticationEnabled ? (
                <Auth>
                    <Component {...pageProps} />
                </Auth>
            ) : (
                <Component {...pageProps} />
            )}
        </SessionProvider>
    );
};

const Auth: React.FC = ({ children }: { children: JSX.Element }) => {
    const { status } = useSession();

    React.useEffect(() => {
        if (status === 'loading') return; // Do nothing while loading
        if (status === 'unauthenticated') signIn(); // If not authenticated, force log in
    }, [status]);

    if (status === 'authenticated') {
        return children;
    }

    // Session is being fetched, or no user.
    // If no user, useEffect() will redirect.
    return <div>Loading...</div>;
};

export default App;
