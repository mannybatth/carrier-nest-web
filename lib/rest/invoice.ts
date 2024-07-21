import { Invoice, InvoicePayment } from '@prisma/client';
import { apiUrl } from '../../constants';
import { ExpandedInvoice, UIInvoiceStatus, JSONResponse } from '../../interfaces/models';
import { AccountingStats } from '../../interfaces/stats';
import { PaginationMetadata, Sort } from '../../interfaces/table';

export const getInvoicesExpanded = async ({
    sort,
    limit,
    offset,
    status,
}: {
    sort?: Sort;
    limit?: number;
    offset?: number;
    status?: UIInvoiceStatus;
} = {}): Promise<{ invoices: ExpandedInvoice[]; metadata: PaginationMetadata }> => {
    const params = new URLSearchParams({
        expand: 'load',
    });
    if (sort && sort.key) {
        params.append('sortBy', sort.key);
    }
    if (sort && sort.order) {
        params.append('sortDir', sort.order);
    }
    if (limit !== undefined) {
        params.append('limit', limit.toString());
    }
    if (offset !== undefined) {
        params.append('offset', offset.toString());
    }
    if (status) {
        params.append('status', status);
    }
    const response = await fetch(apiUrl + '/invoices?' + params.toString());
    const { data, errors }: JSONResponse<{ invoices: ExpandedInvoice[]; metadata: PaginationMetadata }> =
        await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};

export const getInvoiceById = async (id: string): Promise<ExpandedInvoice> => {
    const params = new URLSearchParams({
        expand: 'load,extraItems,payments',
    });
    const response = await fetch(apiUrl + '/invoices/' + id + '?' + params.toString());
    const { data, errors }: JSONResponse<{ invoice: ExpandedInvoice }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.invoice;
};

export const createInvoice = async (invoice: ExpandedInvoice) => {
    const response = await fetch(apiUrl + '/invoices', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoice),
    });
    const { data, errors }: JSONResponse<{ invoice: Invoice }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.invoice;
};

export const updateInvoice = async (id: string, invoice: Partial<Invoice>) => {
    const response = await fetch(apiUrl + '/invoices/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoice),
    });
    const { data, errors }: JSONResponse<{ updatedInvoice: ExpandedInvoice }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.updatedInvoice;
};

export const deleteInvoiceById = async (id: string) => {
    const response = await fetch(apiUrl + '/invoices/' + id, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};

export const createInvoicePayment = async (invoiceId: string, payment: Partial<InvoicePayment>) => {
    const response = await fetch(apiUrl + '/invoices/' + invoiceId + '/payments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payment),
    });
    const { data, errors }: JSONResponse<{ updatedInvoice: Invoice }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.updatedInvoice;
};

export const deleteInvoicePayment = async (invoiceId: string, paymentId: string) => {
    const response = await fetch(apiUrl + '/invoices/' + invoiceId + '/payments/' + paymentId, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};

export const getAccountingStats = async () => {
    const response = await fetch(apiUrl + '/invoices/stats');
    const { data, errors }: JSONResponse<{ stats: AccountingStats }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.stats;
};

export const getNextInvoiceNum = async () => {
    const response = await fetch(apiUrl + '/invoices/next-invoice-num');
    const { data, errors }: JSONResponse<{ nextInvoiceNum: number }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.nextInvoiceNum;
};
