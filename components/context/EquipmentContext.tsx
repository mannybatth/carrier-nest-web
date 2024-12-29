import { ExpandedEquipment } from 'interfaces/models';
import { getEquipmentById } from 'lib/rest/equipment';
import React, { createContext, useContext, useEffect, useState } from 'react';

const EquipmentContext = createContext<[ExpandedEquipment, React.Dispatch<React.SetStateAction<ExpandedEquipment>>]>([
    null,
    () => null,
]);

type EquipmentProviderProps = {
    children: React.ReactNode;
    equipmentId: string;
};

export function EquipmentProvider({ children, equipmentId }: EquipmentProviderProps) {
    const [equipment, setEquipment] = useState<ExpandedEquipment>(null);

    useEffect(() => {
        fetchEquipment();
    }, [equipmentId]);

    const fetchEquipment = async () => {
        try {
            const equipment = await getEquipmentById(equipmentId);
            setEquipment(equipment);
        } catch (error) {
            console.error('Failed to fetch equipment:', error);
        }
    };

    return <EquipmentContext.Provider value={[equipment, setEquipment]}>{children}</EquipmentContext.Provider>;
}

export function useEquipmentContext() {
    return useContext(EquipmentContext);
}
