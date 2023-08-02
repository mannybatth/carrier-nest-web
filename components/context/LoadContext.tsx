import React, { createContext, useContext, useEffect, useState } from 'react';
import { ExpandedLoad } from '../../interfaces/models';
import { getLoadById } from '../../lib/rest/load';

const LoadContext = createContext<[ExpandedLoad, React.Dispatch<React.SetStateAction<ExpandedLoad>>]>([
    null,
    () => null,
]);

type LoadProviderProps = {
    children: React.ReactNode;
    loadId: string;
};

export function LoadProvider({ children, loadId }: LoadProviderProps) {
    const [load, setLoad] = useState<ExpandedLoad>(null);

    useEffect(() => {
        fetchLoad();
    }, [loadId]);

    const fetchLoad = async () => {
        try {
            const load = await getLoadById(loadId);
            setLoad(load);
        } catch (error) {
            console.error('Failed to fetch carriers:', error);
        }
    };

    return <LoadContext.Provider value={[load, setLoad]}>{children}</LoadContext.Provider>;
}

export function useLoadContext() {
    return useContext(LoadContext);
}
