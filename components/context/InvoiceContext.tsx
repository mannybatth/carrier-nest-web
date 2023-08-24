import React, { createContext, useContext, useEffect, useState } from 'react';
import { ExpandedInvoice } from '../../interfaces/models';
import { getInvoiceById } from '../../lib/rest/invoice';

const InvoiceContext = createContext<[ExpandedInvoice, React.Dispatch<React.SetStateAction<ExpandedInvoice>>]>([
    null,
    () => null,
]);

type InvoiceProviderProps = {
    children: React.ReactNode;
    invoiceId: string;
};

export function InvoiceProvider({ children, invoiceId }: InvoiceProviderProps) {
    const [invoice, setInvoice] = useState<ExpandedInvoice>(null);

    useEffect(() => {
        fetchInvoice();
    }, [invoiceId]);

    const fetchInvoice = async () => {
        try {
            const invoice = await getInvoiceById(invoiceId);
            setInvoice(invoice);
        } catch (error) {
            console.error('Failed to fetch invoice:', error);
        }
    };

    return <InvoiceContext.Provider value={[invoice, setInvoice]}>{children}</InvoiceContext.Provider>;
}

export function useInvoiceContext() {
    return useContext(InvoiceContext);
}
