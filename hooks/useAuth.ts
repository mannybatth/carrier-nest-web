import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';

export const useAuth = () => {
    const { status, data: session, update } = useSession();
    const router = useRouter();
    const refreshAttemptedRef = useRef(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(router.query as any);
        const shouldRefresh = searchParams.get('refresh_session') === 'true';

        if (shouldRefresh && session && !refreshAttemptedRef.current) {
            refreshAttemptedRef.current = true;
            (async () => {
                try {
                    await update({
                        isUpdate: true,
                    });
                } finally {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('refresh_session');
                    router.replace({ search: params.toString() }, undefined, { shallow: true });
                }
            })();
        }
    }, [router.query, session, update]);

    useEffect(() => {
        if (status === 'loading') return;

        if (status === 'unauthenticated') {
            router.replace('/homepage');
            return;
        }

        if (status === 'authenticated') {
            if (!session?.user?.defaultCarrierId && router.pathname !== '/setup/carrier') {
                router.replace('/setup/carrier');
            } else if (session?.user?.defaultCarrierId && router.pathname === '/setup/carrier') {
                router.replace('/');
            }
        }
    }, [status, session, router.pathname]);

    return { status, session };
};
