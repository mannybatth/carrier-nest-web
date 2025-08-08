import { ExpandedCarrier } from 'interfaces/models';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCarriers } from '../../lib/rest/carrier';
import { isProPlan as isProPlanUtil } from '../../lib/subscription';
import { useSession } from 'next-auth/react';

type UserContextType = {
    carriers: ExpandedCarrier[];
    defaultCarrier: ExpandedCarrier | null;
    setCarriers: React.Dispatch<React.SetStateAction<ExpandedCarrier[]>>;
    setDefaultCarrier: React.Dispatch<React.SetStateAction<ExpandedCarrier | null>>;
    isProPlan: boolean;
    isLoadingCarrier: boolean;
};

const UserContext = createContext<UserContextType>({
    carriers: [],
    defaultCarrier: null,
    setCarriers: () => null,
    setDefaultCarrier: () => null,
    isProPlan: false,
    isLoadingCarrier: true,
});

type UserProviderProps = {
    children: React.ReactNode;
};

export function UserProvider({ children }: UserProviderProps) {
    const { data: session, status } = useSession({
        required: false, // Don't force refetch
    });
    const [carriers, setCarriers] = useState<ExpandedCarrier[]>([]);
    const [defaultCarrier, setDefaultCarrier] = useState<ExpandedCarrier | null>(null);
    const [isProPlan, setIsProPlan] = useState(false);
    const [isLoadingCarrier, setIsLoadingCarrier] = useState(true);
    const [hasInitialized, setHasInitialized] = useState(false);

    useEffect(() => {
        // Only fetch carriers once when session is authenticated and not already initialized
        if (status === 'authenticated' && session?.user?.id && !hasInitialized) {
            setHasInitialized(true);
            fetchCarriers();
        } else if (status === 'unauthenticated') {
            // Reset state when user logs out
            setHasInitialized(false);
            setCarriers([]);
            setDefaultCarrier(null);
            setIsLoadingCarrier(true);
        }
    }, [status, session?.user?.id, hasInitialized]);

    useEffect(() => {
        if (session?.user?.defaultCarrierId && carriers.length > 0) {
            const carrier = carriers.find((c) => c.id === session.user.defaultCarrierId) || null;
            setDefaultCarrier(carrier);
            setIsProPlan(isProPlanUtil(carrier?.subscription));
        }
    }, [session?.user?.defaultCarrierId, carriers]);

    const fetchCarriers = async () => {
        try {
            const data = await getCarriers();
            setCarriers(data);
        } catch (error) {
            console.error('Failed to fetch carriers:', error);
        } finally {
            setIsLoadingCarrier(false);
        }
    };

    return (
        <UserContext.Provider
            value={{
                carriers,
                defaultCarrier,
                setCarriers,
                setDefaultCarrier,
                isProPlan,
                isLoadingCarrier,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}

export function useUserContext() {
    return useContext(UserContext);
}
