import { ExpandedCarrier } from 'interfaces/models';
import { useSession } from 'next-auth/react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCarriers } from '../../lib/rest/carrier';

type UserContextType = {
    carriers: ExpandedCarrier[];
    defaultCarrier: ExpandedCarrier | null;
    setCarriers: React.Dispatch<React.SetStateAction<ExpandedCarrier[]>>;
    setDefaultCarrier: React.Dispatch<React.SetStateAction<ExpandedCarrier | null>>;
};

const UserContext = createContext<UserContextType>({
    carriers: [],
    defaultCarrier: null,
    setCarriers: () => null,
    setDefaultCarrier: () => null,
});

type UserProviderProps = {
    children: React.ReactNode;
};

export function UserProvider({ children }: UserProviderProps) {
    const { data: session } = useSession();
    const [carriers, setCarriers] = useState<ExpandedCarrier[]>([]);
    const [defaultCarrier, setDefaultCarrier] = useState<ExpandedCarrier | null>(null);

    useEffect(() => {
        fetchCarriers();
    }, [session]);

    useEffect(() => {
        if (session?.user?.defaultCarrierId && carriers.length > 0) {
            const carrier = carriers.find((c) => c.id === session.user.defaultCarrierId) || null;
            setDefaultCarrier(carrier);
        }
    }, [session, carriers]);

    const fetchCarriers = async () => {
        try {
            const data = await getCarriers();
            setCarriers(data);
        } catch (error) {
            console.error('Failed to fetch carriers:', error);
        }
    };

    return (
        <UserContext.Provider
            value={{
                carriers,
                defaultCarrier,
                setCarriers,
                setDefaultCarrier,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}

export function useUserContext() {
    return useContext(UserContext);
}
