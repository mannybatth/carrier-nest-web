import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useRef, useMemo } from 'react';

export const useAuth = () => {
    const {
        status,
        data: session,
        update,
    } = useSession({
        required: false,
        onUnauthenticated() {
            // Optionally handle unauthenticated state here
            // But avoid triggering redirects from here to prevent conflicts
        },
    });
    const router = useRouter();
    const refreshAttemptedRef = useRef(false);

    // Memoize the return values to prevent unnecessary re-renders
    const memoizedReturn = useMemo(
        () => ({
            status,
            session,
        }),
        [status, session?.user?.id, session?.user?.defaultCarrierId],
    );

    useEffect(() => {
        const searchParams = new URLSearchParams(router.query as any);
        const shouldRefresh = searchParams.get('refresh_session') === 'true';

        if (shouldRefresh && session && !refreshAttemptedRef.current) {
            refreshAttemptedRef.current = true;
            (async () => {
                try {
                    const updatedSession = await update({
                        isUpdate: true,
                    });

                    // If the session becomes null after update, redirect to sign-in
                    if (!updatedSession) {
                        console.log('Session became null after refresh, redirecting to sign-in');
                        router.replace('/auth/signin?error=ACCOUNT_DEACTIVATED');
                        return;
                    }
                } catch (error) {
                    console.error('Session refresh failed:', error);
                    // If session refresh fails, redirect to signin
                    router.replace('/auth/signin?error=SESSION_REFRESH_FAILED');
                    return;
                } finally {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('refresh_session');
                    router.replace({ search: params.toString() }, undefined, { shallow: true });
                }
            })();
        }
    }, [router.query, session, update]);

    useEffect(() => {
        if (status === 'loading') {
            return;
        }

        if (status === 'unauthenticated') {
            // Redirect unauthenticated users from base URL to homepage
            if (router.pathname === '/') {
                console.log('Unauthenticated user on base URL, redirecting to homepage');
                router.replace('/homepage');
                return;
            }

            // Only redirect to signin with error for other protected app routes, not public pages
            if (
                router.pathname.startsWith('/settings') ||
                router.pathname.startsWith('/drivers') ||
                router.pathname.startsWith('/loads') ||
                router.pathname.startsWith('/customers') ||
                router.pathname.startsWith('/invoices') ||
                router.pathname.startsWith('/equipments') ||
                router.pathname.startsWith('/billing')
            ) {
                console.log('User is unauthenticated on protected page, redirecting to signin');
                router.replace('/auth/signin?error=SESSION_EXPIRED');
                return;
            }
            // For other routes (public pages), don't interfere
            return;
        }

        if (status === 'authenticated') {
            // Additional check: verify user is still active in the session
            if (session?.user && 'isActive' in session.user && session.user.isActive === false) {
                console.log('User account is deactivated, signing out');
                router.replace('/auth/signin?error=ACCOUNT_DEACTIVATED');
                return;
            }

            if (!session?.user?.defaultCarrierId && router.pathname !== '/setup/carrier') {
                router.replace('/setup/carrier');
            } else if (session?.user?.defaultCarrierId && router.pathname === '/setup/carrier') {
                router.replace('/');
            }
        }
    }, [status, session?.user?.defaultCarrierId, router.pathname]); // Only depend on essential values

    return memoizedReturn;
};
