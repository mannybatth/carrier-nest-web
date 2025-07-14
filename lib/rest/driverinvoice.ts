import { DriverInvoice, DriverInvoiceStatus, Driver } from '@prisma/client';
import { apiUrl } from '../constants';
import {
    ExpandedDriverInvoice,
    JSONResponse,
    NewDriverInvoice,
    SimplifiedDriverInvoice,
    UIDriverInvoiceStatus,
} from '../../interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { DriverInvoiceStats } from 'interfaces/stats';

export const getDriverInvoices = async ({
    sort,
    limit,
    offset,
    status,
}: {
    sort?: Sort;
    limit?: number;
    offset?: number;
    status?: UIDriverInvoiceStatus;
} = {}): Promise<{ invoices: SimplifiedDriverInvoice[]; metadata: PaginationMetadata }> => {
    const params = new URLSearchParams();
    if (sort?.key) params.append('sortBy', sort.key);
    if (sort?.order) params.append('sortDir', sort.order);
    if (limit !== undefined) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    if (status) params.append('status', status);

    const response = await fetch(apiUrl + '/driverinvoices?' + params.toString());
    const { data, errors }: JSONResponse<{ invoices: SimplifiedDriverInvoice[]; metadata: PaginationMetadata }> =
        await response.json();

    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
};

export const getDriverInvoiceById = async (id: string): Promise<ExpandedDriverInvoice> => {
    const response = await fetch(`${apiUrl}/driverinvoices/${id}`);
    const { data, errors }: JSONResponse<ExpandedDriverInvoice> = await response.json();

    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
};

export const createDriverInvoice = async (invoice: Partial<NewDriverInvoice>) => {
    const response = await fetch(`${apiUrl}/driverinvoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
    });

    const { data, errors }: JSONResponse<{ invoiceId: number }> = await response.json();

    if (errors) throw new Error(errors.map((e) => e.message).join(', '));

    return data.invoiceId;
};

export const updateDriverInvoice = async (id: string, invoice: Partial<ExpandedDriverInvoice>) => {
    const response = await fetch(`${apiUrl}/driverinvoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
    });
    const { data, errors }: JSONResponse<{ invoiceNum: string }> = await response.json();

    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data.invoiceNum;
};

export const deleteDriverInvoiceById = async (id: string) => {
    const response = await fetch(`${apiUrl}/driverinvoices/${id}`, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ message: string }> = await response.json();

    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data.message;
};

export const getDriverInvoiceStatus = async (id: string): Promise<DriverInvoiceStatus> => {
    const response = await fetch(`${apiUrl}/driverinvoices/${id}/status`);
    const { data, errors }: JSONResponse<{ status: DriverInvoiceStatus }> = await response.json();
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data.status;
};

export const addDriverInvoicePayment = async (
    id: string,
    payment: { amount: string; paymentDate: string; notes?: string },
): Promise<string> => {
    const response = await fetch(`${apiUrl}/driverinvoices/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment),
    });
    const { data, errors }: JSONResponse<{ paymentId: string }> = await response.json();
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data.paymentId;
};

export const deleteDriverInvoicePayment = async (id: string, paymentId: string): Promise<string> => {
    const response = await fetch(`${apiUrl}/driverinvoices/${id}/payments/${paymentId}`, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ message: string }> = await response.json();
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data.message;
};

export const getNextDriverInvoiceNum = async () => {
    const response = await fetch(apiUrl + '/driverinvoices/next-invoice-num');
    const { data, errors }: JSONResponse<{ nextInvoiceNum: number }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.nextInvoiceNum;
};

export const getDriverInvoiceStats = async (): Promise<DriverInvoiceStats> => {
    const response = await fetch(apiUrl + '/driverinvoices/stats');
    const { data, errors }: JSONResponse<{ stats: DriverInvoiceStats }> = await response.json();

    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data.stats;
};

export const updateDriverInvoiceStatus = async (id: string, status: DriverInvoiceStatus): Promise<string> => {
    const response = await fetch(`${apiUrl}/driverinvoices/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
    const { data, errors }: JSONResponse<{ message: string }> = await response.json();

    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data.message;
};

export const approveDriverInvoice = async (id: string): Promise<string> => {
    const response = await fetch(`${apiUrl}/driverinvoices/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    const { data, errors }: JSONResponse<{ message: string }> = await response.json();

    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data.message;
};
