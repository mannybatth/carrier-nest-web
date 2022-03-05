import { Customer } from '@prisma/client';
import { apiUrl } from '../../constants';
import { JSONResponse, SimpleCustomer } from '../../interfaces/models';

export const getAllCustomers = async () => {
    const response = await fetch(apiUrl + '/customers');
    const { data, errors }: JSONResponse<Customer[]> = await response.json();
    return data;
};

export const searchCustomersByName = async (value: string) => {
    const response = await fetch(apiUrl + '/customers/search?q=' + value);
    const { data, errors }: JSONResponse<Customer[]> = await response.json();
    return data;
};

export const fullTextSearchCustomersByName = async (value: string) => {
    const response = await fetch(apiUrl + '/customers/search/?fullText=true&q=' + value);
    const { data, errors }: JSONResponse<Customer[]> = await response.json();
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
    const { data, errors }: JSONResponse<Customer> = await response.json();
    return data;
};
