import { ExpandedInvoice, InvoiceStatus } from '../../interfaces/models';

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

export const invoiceStatus = (invoice: ExpandedInvoice): InvoiceStatus => {
    if (invoice.lastPaymentAt) {
        if (invoice.paidAmount >= invoice.totalAmount) {
            return InvoiceStatus.PAID;
        }
        return InvoiceStatus.PARTIALLY_PAID;
    }

    if (invoice.dueNetDays > 0) {
        const dueDate = new Date(invoice.invoicedAt);
        dueDate.setDate(dueDate.getDate() + invoice.dueNetDays);
        const now = new Date();

        if (now > dueDate) {
            return InvoiceStatus.OVERDUE;
        }
    }
    return InvoiceStatus.NOT_PAID;
};
