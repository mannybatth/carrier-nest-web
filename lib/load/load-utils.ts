import { ExpandedLoad, UIInvoiceStatus, LoadStatus } from '../../interfaces/models';
import { invoiceStatus } from '../invoice/invoice-utils';
import distance from '@turf/distance';
import { point } from '@turf/helpers';

export const loadStatus = (load: ExpandedLoad): LoadStatus => {
    if (load.invoice) {
        const inStatus = invoiceStatus(load.invoice);
        if (inStatus === UIInvoiceStatus.NOT_PAID) {
            return LoadStatus.INVOICED;
        } else if (inStatus === UIInvoiceStatus.OVERDUE) {
            return LoadStatus.OVERDUE;
        } else if (inStatus === UIInvoiceStatus.PARTIALLY_PAID) {
            return LoadStatus.INVOICED;
        } else if (inStatus === UIInvoiceStatus.PAID) {
            return LoadStatus.PAID;
        }
    }

    const dropOffDate = new Date(load.receiver.date);
    if (Date.now() > dropOffDate.getTime()) {
        return LoadStatus.COMPLETED;
    }

    return LoadStatus.PENDING;
};

export const getLoadDistance = (load: ExpandedLoad): number => {
    const stops = load.stops;

    const from = point([load.shipper.longitude, load.shipper.latitude]);
    const to = point([load.receiver.longitude, load.receiver.latitude]);

    const miles = distance(from, to, { units: 'miles' });

    console.log('miles', miles);

    return miles;
};
