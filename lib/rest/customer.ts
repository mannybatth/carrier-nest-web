import { Customer } from '@prisma/client';
import { apiUrl } from '../../constants';
import { JSONResponse } from '../../interfaces/models';

export const getAllCustomers = async () => {
    const customers = await fetch(apiUrl + '/customers');
    return customers;
};

export const searchCustomersByName = async (value: string) => {
    const response = await fetch(apiUrl + '/customers/search?name=' + value);
    const { data, errors }: JSONResponse<Customer[]> = await response.json();
    return data;
};
