import { NextComponentType, NextPageContext } from 'next';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import 'polyfills';
import React, { useEffect, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

declare global {
    interface Window {
        amplitude?: any;
        sessionReplay?: any;
    }
}

import { UserProvider } from '../components/context/UserContext';
import ErrorBoundary from '../components/layout/ErrorBoundary';
import Spinner from '../components/Spinner';
import NotificationToastManager from '../components/notifications/NotificationToastManager';
import { SidebarProvider } from '../contexts/SidebarContext';
import { GlobalNotificationProvider } from '../contexts/GlobalNotificationContext';
import { useAuth } from '../hooks/useAuth';
import { AuthEnabledComponentConfig } from '../interfaces/auth';
import '../styles/globals.css';

type NextComponentWithAuth = NextComponentType<NextPageContext, any, object> & Partial<AuthEnabledComponentConfig>;
type ProtectedAppProps = AppProps<{ session: Session }> & { Component: NextComponentWithAuth };

const AuthWrapper: React.FC<React.PropsWithChildren<{ component: NextComponentWithAuth }>> = ({
    children,
    component,
}) => {
    const { status, session } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const tryInit = () => {
                if (window?.amplitude && window.sessionReplay && window.location.hostname === 'carriernest.com') {
                    window?.amplitude.add(window.sessionReplay.plugin({ sampleRate: 1 }));
                    window?.amplitude.init('52aa0adb075ae674b5c90a5e6703505f', {
                        autocapture: {
                            elementInteractions: true,
                        },
                    });
                } else {
                    setTimeout(tryInit, 100); // wait until scripts are loaded
                }
            };
            tryInit();
        }
    }, []);

    // Check if this component requires authentication
    const requiresAuth = component.authenticationEnabled !== false;

    // For public pages (like homepage), render without auth check
    if (!requiresAuth) {
        return <>{children}</>;
    }

    // For protected pages, apply auth logic
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
                <SessionProvider
                    session={session}
                    refetchInterval={0} // Completely disable background refetching
                    refetchOnWindowFocus={false} // Disable window focus refetch
                    refetchWhenOffline={false} // Don't refetch when offline
                    basePath="/api/auth" // Explicitly set basePath
                >
                    <SidebarProvider>
                        <GlobalNotificationProvider>
                            <Head>
                                <title>Carrier Nest</title>
                                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
                                <meta name="description" content="Carrier Nest - Transportation Management System" />
                                <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />

                                {/* facebook pixel */}
                                <script
                                    dangerouslySetInnerHTML={{
                                        __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '2234238333571180');
            fbq('track', 'PageView');
        `,
                                    }}
                                ></script>
                                <script src="https://cdn.amplitude.com/libs/analytics-browser-2.11.1-min.js.gz"></script>
                                <script src="https://cdn.amplitude.com/libs/plugin-session-replay-browser-1.8.0-min.js.gz"></script>

                                <noscript>
                                    <img
                                        height="1"
                                        width="1"
                                        style={{ display: 'none' }}
                                        src="https://www.facebook.com/tr?id=2234238333571180&ev=PageView&noscript=1"
                                    />
                                </noscript>
                                {/* Google tag (gtag.js) */}
                                <script async src="https://www.googletagmanager.com/gtag/js?id=AW-17087140393"></script>
                                <script
                                    dangerouslySetInnerHTML={{
                                        __html: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'AW-17087140393');

      // Define conversion tracking function
      function gtag_report_conversion(url) {
        var callback = function () {
          if (typeof(url) != 'undefined') {
            window.location = url;
          }
        };
        gtag('event', 'conversion', {
            'send_to': 'AW-17087140393/XrmTCNGP9MgaEKmk5NM_',
            'event_callback': callback
        });
        return false;
      }
    `,
                                    }}
                                />
                            </Head>
                            {Component.authenticationEnabled !== false ? (
                                <AuthWrapper component={Component}>
                                    <UserProvider>
                                        <Component {...pageProps} />
                                    </UserProvider>
                                </AuthWrapper>
                            ) : (
                                <Component {...pageProps} />
                            )}
                            <Toaster
                                position="top-right"
                                containerClassName="z-50"
                                toastOptions={{
                                    duration: 6000,
                                    style: {
                                        background: 'transparent',
                                        boxShadow: 'none',
                                        padding: 0,
                                        margin: 0,
                                    },
                                }}
                            />
                            <NotificationToastManager />
                        </GlobalNotificationProvider>
                    </SidebarProvider>
                </SessionProvider>
            </ErrorBoundary>
            <Analytics />
            <SpeedInsights />
        </>
    );
}
