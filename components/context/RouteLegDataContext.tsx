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
    const [routeLegData, setRouteLegData] = useState<RouteLegData>({
        driversWithCharge: [],
        locations: [],
        driverInstructions: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '',
    });

    return (
        <RouteLegDataContext.Provider value={[routeLegData, setRouteLegData]}>{children}</RouteLegDataContext.Provider>
    );
}

export function useRouteLegDataContext() {
    return useContext(RouteLegDataContext);
}
