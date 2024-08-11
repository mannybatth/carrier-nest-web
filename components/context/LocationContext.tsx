import { Location } from '@prisma/client';
import { getLocationById } from 'lib/rest/locations';
import React, { createContext, useContext, useEffect, useState } from 'react';

const LocationContext = createContext<[Location, React.Dispatch<React.SetStateAction<Location>>]>([null, () => null]);

type LocationProviderProps = {
    children: React.ReactNode;
    locationId: string;
};

export function LocationProvider({ children, locationId }: LocationProviderProps) {
    const [location, setLocation] = useState<Location>(null);

    useEffect(() => {
        fetchLocation();
    }, [locationId]);

    const fetchLocation = async () => {
        try {
            const location = await getLocationById(locationId);
            setLocation(location);
        } catch (error) {
            console.error('Failed to fetch location:', error);
        }
    };

    return <LocationContext.Provider value={[location, setLocation]}>{children}</LocationContext.Provider>;
}

export function useLocationContext() {
    return useContext(LocationContext);
}
