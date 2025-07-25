import { LoadStatus } from '@prisma/client';
import { ExpandedLoad, UIInvoiceStatus } from '../../interfaces/models';
import { invoiceStatus } from '../invoice/invoice-utils';

export enum UILoadStatus {
    BOOKED = 'booked', // load created but not yet set as in progress
    IN_PROGRESS = 'in progress', // load marked as in progress
    DELIVERED = 'delivered', // load delivered to last drop off and awaiting POD docs
    POD_READY = 'POD ready', // POD is uploaded by the driver
    INVOICED = 'invoiced', // invoice is created
    PARTIALLY_PAID = 'partially paid', // incomplete full payment
    PAID = 'paid', // full payment received for invoice
    OVERDUE = 'overdue', // invoice past due date
}

export const isDate24HrInThePast = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return diff > 24 * 60 * 60 * 1000;
};

export const loadStatusToUIStatus = (status: LoadStatus): UILoadStatus => {
    switch (status) {
        case LoadStatus.CREATED:
            return UILoadStatus.BOOKED;
        case LoadStatus.IN_PROGRESS:
            return UILoadStatus.IN_PROGRESS;
        case LoadStatus.DELIVERED:
            return UILoadStatus.DELIVERED;
        case LoadStatus.POD_READY:
            return UILoadStatus.POD_READY;
    }
};

export const loadStatus = (load: ExpandedLoad): UILoadStatus => {
    if (load.invoice) {
        const inStatus = invoiceStatus(load.invoice);
        if (inStatus === UIInvoiceStatus.NOT_PAID) {
            return UILoadStatus.INVOICED;
        } else if (inStatus === UIInvoiceStatus.OVERDUE) {
            return UILoadStatus.OVERDUE;
        } else if (inStatus === UIInvoiceStatus.PARTIALLY_PAID) {
            return UILoadStatus.PARTIALLY_PAID;
        } else if (inStatus === UIInvoiceStatus.PAID) {
            return UILoadStatus.PAID;
        }
    }

    if (load.podDocuments?.length > 0) {
        return UILoadStatus.POD_READY;
    }

    /* const dropOffDate = new Date(load.receiver.date); */
    if (load.status === LoadStatus.DELIVERED) {
        return UILoadStatus.DELIVERED;
    }

    if (load.status === LoadStatus.IN_PROGRESS) {
        return UILoadStatus.IN_PROGRESS;
    }

    return UILoadStatus.BOOKED;
};
