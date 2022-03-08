import { apiUrl } from '../../constants';
import { ExpandedCustomer, JSONResponse, SimpleCustomer, Sort } from '../../interfaces/models';

export const getAllCustomers = async (sort?: Sort) => {
    const params = new URLSearchParams();
    if (sort && sort.key) {
        params.append('sortBy', sort.key);
    }
    if (sort && sort.order) {
        params.append('sortDir', sort.order);
    }
    const response = await fetch(apiUrl + '/customers?' + params.toString());
    const { data, errors }: JSONResponse<ExpandedCustomer[]> = await response.json();
    return data;
};

export const getCustomerById = async (id: number) => {
    const response = await fetch(apiUrl + '/customers/' + id);
    const { data, errors }: JSONResponse<ExpandedCustomer> = await response.json();
    return data;
};

export const searchCustomersByName = async (value: string) => {
    const response = await fetch(apiUrl + '/customers/search?q=' + value);
    const { data, errors }: JSONResponse<ExpandedCustomer[]> = await response.json();
    return data;
};

export const fullTextSearchCustomersByName = async (value: string) => {
    const response = await fetch(apiUrl + '/customers/search/?fullText=true&q=' + value);
    const { data, errors }: JSONResponse<ExpandedCustomer[]> = await response.json();
    return data;
};

export const createCustomer = async (customer: SimpleCustomer) => {
    const response = await fetch(apiUrl + '/customers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(customer),
    });
    const { data, errors }: JSONResponse<ExpandedCustomer> = await response.json();
    return data;
};

export const updateCustomer = async (id: number, customer: SimpleCustomer) => {
    const response = await fetch(apiUrl + '/customers/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(customer),
    });
    const { data, errors }: JSONResponse<ExpandedCustomer> = await response.json();
    return data;
};

export const deleteCustomerById = async (id: number) => {
    const response = await fetch(apiUrl + '/customers/' + id, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<string> = await response.json();
    return data;
};
