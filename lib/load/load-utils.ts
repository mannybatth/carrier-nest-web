import { ExpandedLoad, LoadStatus } from '../../interfaces/models';

export const loadStatus = (load: ExpandedLoad): LoadStatus => {
    if (load.invoice) {
        return LoadStatus.INVOICED;
    }

    const dropOffDate = new Date(load.receiver.date);
    if (Date.now() > dropOffDate.getTime()) {
        return LoadStatus.COMPLETED;
    }

    return LoadStatus.PENDING;
};
