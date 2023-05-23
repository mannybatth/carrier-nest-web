import { Customer } from '@prisma/client';
import { apiUrl } from '../../constants';
import { JSONResponse } from '../../interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';

export const getAllCustomers = async ({
    sort,
    limit,
    offset,
}: {
    sort?: Sort;
    limit?: number;
    offset?: number;
}): Promise<{ customers: Customer[]; metadata: PaginationMetadata }> => {
    const params = new URLSearchParams();
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
    const response = await fetch(apiUrl + '/customers?' + params.toString());
    const { data, errors }: JSONResponse<{ customers: Customer[]; metadata: PaginationMetadata }> =
        await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};

export const getCustomerById = async (id: number) => {
    const response = await fetch(apiUrl + '/customers/' + id);
    const { data, errors }: JSONResponse<{ customer: Customer }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.customer;
};

export const searchCustomersByName = async (value: string) => {
    const response = await fetch(apiUrl + '/customers/search?q=' + value);
    const { data, errors }: JSONResponse<{ customers: Customer[] }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.customers;
};

export const fullTextSearchCustomersByName = async (value: string) => {
    const response = await fetch(apiUrl + '/customers/search/?fullText=true&q=' + value);
    const { data, errors }: JSONResponse<{ customers: Customer[] }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.customers;
};

export const createCustomer = async (customer: Partial<Customer>) => {
    const response = await fetch(apiUrl + '/customers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(customer),
    });
    const { data, errors }: JSONResponse<{ customer: Customer }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.customer;
};

export const updateCustomer = async (id: number, customer: Partial<Customer>) => {
    const response = await fetch(apiUrl + '/customers/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(customer),
    });
    const { data, errors }: JSONResponse<{ updatedCustomer: Customer }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.updatedCustomer;
};

export const deleteCustomerById = async (id: number) => {
    const response = await fetch(apiUrl + '/customers/' + id, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};
