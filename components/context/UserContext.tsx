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
    const { data: session } = useSession();
    const [carriers, setCarriers] = useState<ExpandedCarrier[]>([]);
    const [defaultCarrier, setDefaultCarrier] = useState<ExpandedCarrier | null>(null);
    const [isProPlan, setIsProPlan] = useState(false);
    const [isLoadingCarrier, setIsLoadingCarrier] = useState(true);

    useEffect(() => {
        fetchCarriers();
    }, [session]);

    useEffect(() => {
        if (session?.user?.defaultCarrierId && carriers.length > 0) {
            const carrier = carriers.find((c) => c.id === session.user.defaultCarrierId) || null;
            setDefaultCarrier(carrier);
            setIsProPlan(isProPlanUtil(carrier?.subscription));
        }
    }, [session, carriers]);

    const fetchCarriers = async () => {
        setIsLoadingCarrier(true);
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
