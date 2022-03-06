import { Load } from '@prisma/client';
import { apiUrl } from '../../constants';
import { JSONResponse, ExpandedLoad, SimpleLoad, Sort } from '../../interfaces/models';

export const getAllLoadsWithCustomer = async (sort?: Sort): Promise<ExpandedLoad[]> => {
    const params = new URLSearchParams({
        expand: 'customer',
    });
    if (sort && sort.key) {
        params.append('sortBy', sort.key);
    }
    if (sort && sort.order) {
        params.append('sortDir', sort.order);
    }
    const response = await fetch(apiUrl + '/loads?' + params.toString());
    const { data, errors }: JSONResponse<ExpandedLoad[]> = await response.json();
    return data;
};

export const getLoadById = async (id: number): Promise<ExpandedLoad> => {
    const params = new URLSearchParams({
        expand: 'customer,loadStops',
    });
    const response = await fetch(apiUrl + '/loads/' + id + '?' + params.toString());
    const { data, errors }: JSONResponse<ExpandedLoad> = await response.json();
    console.log(data);
    return data;
};

export const createLoad = async (load: SimpleLoad) => {
    const response = await fetch(apiUrl + '/loads', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(load),
    });
    const { data, errors }: JSONResponse<Load> = await response.json();
    return data;
};

export const updateLoad = async (id: number, load: SimpleLoad) => {
    const response = await fetch(apiUrl + '/loads/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(load),
    });
    const { data, errors }: JSONResponse<ExpandedLoad> = await response.json();
    return data;
};
