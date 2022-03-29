import { Customer, Driver, Load } from '@prisma/client';
import { apiUrl } from '../../constants';
import { JSONResponse, SearchResult } from '../../interfaces/models';

export type BatchSearchResult = {
    loads: SearchResult<Load>[];
    customers: SearchResult<Customer>[];
    drivers: SearchResult<Driver>[];
};
export const search = async (q: string): Promise<BatchSearchResult> => {
    const response = await fetch(apiUrl + '/search?q=' + q);
    const { data, errors }: JSONResponse<BatchSearchResult> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};
