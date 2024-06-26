import { Prisma } from '@prisma/client';
import { NextComponentType, NextPageContext } from 'next';
import { Session } from 'next-auth';
import { SessionProvider, useSession } from 'next-auth/react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { PropsWithChildren } from 'react';
import { Toaster } from 'react-hot-toast';
import Spinner from '../components/Spinner';
import { UserProvider } from '../components/context/UserContext';
import { AuthEnabledComponentConfig } from '../interfaces/auth';
import '../styles/globals.css';

Prisma.Decimal.prototype.toJSON = function () {
    return this.toNumber();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/ban-types
type NextComponentWithAuth = NextComponentType<NextPageContext, any, {}> & Partial<AuthEnabledComponentConfig>;
type ProtectedAppProps = AppProps<{ session: Session }> & { Component: NextComponentWithAuth };

const Auth: React.FC<PropsWithChildren> = ({ children }) => {
    const { status, data: session } = useSession();
    const router = useRouter();

    React.useEffect(() => {
        if (status === 'loading') return; // Do nothing while loading
        //if (status === 'unauthenticated') signIn(); // If not authenticated, force log in
        if (status === 'unauthenticated') router.replace('/homepage');
        // If authenticated, but no default carrier, redirect to carrier setup
        if (status === 'authenticated' && !session?.user?.defaultCarrierId) {
            router.replace('/setup/carrier');
        } else if (status === 'authenticated' && router.pathname === '/setup/carrier') {
            router.replace('/');
        }
    }, [status, session]);

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

    // Session is being fetched, or no user.
    // If no user, useEffect() will redirect.
    return (
        <div className="flex items-center justify-center h-screen">
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
                    <UserProvider>
                        <Component {...pageProps} />
                    </UserProvider>
                </Auth>
            ) : (
                <Component {...pageProps} />
            )}
            <Toaster />
        </SessionProvider>
    );
}
