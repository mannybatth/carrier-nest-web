import React, { createContext, useContext, useEffect, useState } from 'react';
import { ExpandedCustomer } from '../../interfaces/models';
import { getCustomerById } from '../../lib/rest/customer';

const CustomerContext = createContext<[ExpandedCustomer, React.Dispatch<React.SetStateAction<ExpandedCustomer>>]>([
    null,
    () => null,
]);

type CustomerProviderProps = {
    children: React.ReactNode;
    customerId: string;
};

export function CustomerProvider({ children, customerId }: CustomerProviderProps) {
    const [customer, setCustomer] = useState<ExpandedCustomer>(null);

    useEffect(() => {
        fetchCustomer();
    }, [customerId]);

    const fetchCustomer = async () => {
        try {
            const customer = await getCustomerById(customerId);
            setCustomer(customer);
        } catch (error) {
            console.error('Failed to fetch Customer:', error);
        }
    };

    return <CustomerContext.Provider value={[customer, setCustomer]}>{children}</CustomerContext.Provider>;
}

export function useCustomerContext() {
    return useContext(CustomerContext);
}
