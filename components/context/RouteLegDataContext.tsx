import React, { createContext, useContext, useState } from 'react';
import { RouteLegData } from '../../interfaces/assignment';

const RouteLegDataContext = createContext<[RouteLegData, React.Dispatch<React.SetStateAction<RouteLegData>>]>([
    null,
    () => null,
]);

type RouteLegDataProviderProps = {
    children: React.ReactNode;
};

export function RouteLegDataProvider({ children }: RouteLegDataProviderProps) {
    const [routeLegData, setRouteLegData] = useState<RouteLegData>(null);

    return (
        <RouteLegDataContext.Provider value={[routeLegData, setRouteLegData]}>{children}</RouteLegDataContext.Provider>
    );
}

export function useRouteLegDataContext() {
    return useContext(RouteLegDataContext);
}
