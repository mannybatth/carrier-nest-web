import { NextPageContext } from 'next';
import { getSession } from 'next-auth/react';

export const withServerAuth = async (context: NextPageContext, fn?: (context: NextPageContext) => Promise<object>) => {
    const session = await getSession(context);
    const isUser = !!session?.user;

    if (!isUser) {
        return {
            redirect: {
                permanent: false,
                destination: '/',
            },
        };
    }

    const defaultResponse = { props: { session } };

    if (fn) {
        const resp = await fn(context);
        return {
            ...defaultResponse,
            ...resp,
        };
    }

    return defaultResponse;
};
