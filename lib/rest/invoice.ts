import { Invoice } from '@prisma/client';
import { apiUrl } from '../../constants';
import {
    ExpandedInvoice,
    JSONResponse,
    PaginationMetadata,
    SimpleInvoice,
    SimpleInvoicePayment,
    Sort,
} from '../../interfaces/models';

export const getInvoicesExpanded = async ({
    sort,
    limit,
    offset,
}: {
    sort?: Sort;
    limit?: number;
    offset?: number;
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
    console.log(`${apiUrl}/invoices?${params.toString()}`);
    const response = await fetch(apiUrl + '/invoices?' + params.toString());
    const { data, errors }: JSONResponse<{ invoices: ExpandedInvoice[]; metadata: PaginationMetadata }> =
        await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};

export const getInvoiceById = async (id: number): Promise<ExpandedInvoice> => {
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

export const updateInvoice = async (id: number, invoice: SimpleInvoice) => {
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

export const deleteInvoiceById = async (id: number) => {
    const response = await fetch(apiUrl + '/invoices/' + id, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};

export const createInvoicePayment = async (invoiceId: number, payment: SimpleInvoicePayment) => {
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

export const deleteInvoicePayment = async (invoiceId: number, paymentId: number) => {
    const response = await fetch(apiUrl + '/invoices/' + invoiceId + '/payments/' + paymentId, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};