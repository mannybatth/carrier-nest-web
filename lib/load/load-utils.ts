import { ExpandedLoad, InvoiceStatus, LoadStatus } from '../../interfaces/models';
import { invoiceStatus } from '../invoice/invoice-utils';

export const loadStatus = (load: ExpandedLoad): LoadStatus => {
    if (load.invoice) {
        const inStatus = invoiceStatus(load.invoice);
        if (inStatus === InvoiceStatus.NOT_PAID) {
            return LoadStatus.INVOICED;
        } else if (inStatus === InvoiceStatus.OVERDUE) {
            return LoadStatus.OVERDUE;
        } else if (inStatus === InvoiceStatus.PARTIALLY_PAID) {
            return LoadStatus.INVOICED;
        } else if (inStatus === InvoiceStatus.PAID) {
            return LoadStatus.PAID;
        }
    }

    const dropOffDate = new Date(load.receiver.date);
    if (Date.now() > dropOffDate.getTime()) {
        return LoadStatus.COMPLETED;
    }

    return LoadStatus.PENDING;
};
