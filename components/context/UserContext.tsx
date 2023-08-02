import { Carrier } from '@prisma/client';
import { useSession } from 'next-auth/react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCarriers } from '../../lib/rest/carrier';

const UserContext = createContext<[Carrier[], React.Dispatch<React.SetStateAction<Carrier[]>> | undefined]>([
    [],
    () => null,
]);

type UserProviderProps = {
    children: React.ReactNode;
};

export function UserProvider({ children }: UserProviderProps) {
    const { data: session } = useSession();
    const [carriers, setCarriers] = useState<Carrier[]>([]);

    useEffect(() => {
        fetchCarriers();
    }, [session]);

    const fetchCarriers = async () => {
        try {
            const data = await getCarriers();
            setCarriers(data);
        } catch (error) {
            console.error('Failed to fetch carriers:', error);
        }
    };

    return <UserContext.Provider value={[carriers, setCarriers]}>{children}</UserContext.Provider>;
}

export function useUserContext() {
    return useContext(UserContext);
}
