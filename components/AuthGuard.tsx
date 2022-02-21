import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

const AuthGuard: React.FC = ({ children }: { children: JSX.Element }) => {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/api/auth/signin');
        }
    }, [status, router]);

    if (status !== 'unauthenticated') {
        return <>{children}</>;
    }

    return null;
};

export default AuthGuard;
