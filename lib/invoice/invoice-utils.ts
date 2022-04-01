import { InvoiceStatus } from '@prisma/client';
import { ExpandedInvoice, UIInvoiceStatus } from '../../interfaces/models';

export const invoiceTermOptions = [
    {
        value: 0,
        label: 'Due on Receipt',
    },
    {
        value: 15,
        label: 'Net 15 days',
    },
    {
        value: 30,
        label: 'Net 30 days',
    },
    {
        value: 45,
        label: 'Net 45 days',
    },
];

export const invoiceStatus = (invoice: ExpandedInvoice): UIInvoiceStatus => {
    if (invoice.status === InvoiceStatus.PAID) {
        return UIInvoiceStatus.PAID;
    }

    if (invoice.dueNetDays > 0) {
        const now = new Date();
        if (now > new Date(invoice.dueDate)) {
            return UIInvoiceStatus.OVERDUE;
        }
    }

    if (invoice.status === InvoiceStatus.PARTIALLY_PAID) {
        return UIInvoiceStatus.PARTIALLY_PAID;
    }

    return UIInvoiceStatus.NOT_PAID;
};
