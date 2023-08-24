import React, { createContext, useContext, useEffect, useState } from 'react';
import { ExpandedDriver } from '../../interfaces/models';
import { getDriverById } from '../../lib/rest/driver';

const DriverContext = createContext<[ExpandedDriver, React.Dispatch<React.SetStateAction<ExpandedDriver>>]>([
    null,
    () => null,
]);

type DriverProviderProps = {
    children: React.ReactNode;
    driverId: string;
};

export function DriverProvider({ children, driverId }: DriverProviderProps) {
    const [driver, setDriver] = useState<ExpandedDriver>(null);

    useEffect(() => {
        fetchDriver();
    }, [driverId]);

    const fetchDriver = async () => {
        try {
            const driver = await getDriverById(driverId);
            setDriver(driver);
        } catch (error) {
            console.error('Failed to fetch driver:', error);
        }
    };

    return <DriverContext.Provider value={[driver, setDriver]}>{children}</DriverContext.Provider>;
}

export function useDriverContext() {
    return useContext(DriverContext);
}
