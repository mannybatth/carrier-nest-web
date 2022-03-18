import { Load } from '@prisma/client';
import { apiUrl } from '../../constants';
import { ExpandedLoad, JSONResponse, PaginationMetadata, SimpleLoad, Sort } from '../../interfaces/models';

export const getLoadsExpanded = async ({
    sort,
    customerId,
    driverId,
    limit,
    offset,
}: {
    sort?: Sort;
    customerId?: number;
    driverId?: number;
    limit?: number;
    offset?: number;
} = {}): Promise<{ loads: ExpandedLoad[]; metadata: PaginationMetadata }> => {
    const params = new URLSearchParams({
        expand: 'customer,shipper,receiver',
    });
    if (sort && sort.key) {
        params.append('sortBy', sort.key);
    }
    if (sort && sort.order) {
        params.append('sortDir', sort.order);
    }
    if (customerId) {
        params.append('customerId', customerId.toString());
    }
    if (driverId) {
        params.append('driverId', driverId.toString());
    }
    if (limit !== undefined) {
        params.append('limit', limit.toString());
    }
    if (offset !== undefined) {
        params.append('offset', offset.toString());
    }
    console.log(`${apiUrl}/loads?${params.toString()}`);
    const response = await fetch(apiUrl + '/loads?' + params.toString());
    const { data, errors }: JSONResponse<{ loads: ExpandedLoad[]; metadata: PaginationMetadata }> =
        await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};

export const getLoadById = async (id: number): Promise<ExpandedLoad> => {
    const params = new URLSearchParams({
        expand: 'customer,shipper,receiver,stops',
    });
    const response = await fetch(apiUrl + '/loads/' + id + '?' + params.toString());
    const { data, errors }: JSONResponse<{ load: ExpandedLoad }> = await response.json();
    return data.load;
};

export const createLoad = async (load: ExpandedLoad) => {
    const response = await fetch(apiUrl + '/loads', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(load),
    });
    const { data, errors }: JSONResponse<{ load: Load }> = await response.json();
    return data.load;
};

export const updateLoad = async (id: number, load: SimpleLoad) => {
    const response = await fetch(apiUrl + '/loads/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(load),
    });
    const { data, errors }: JSONResponse<{ updatedLoad: ExpandedLoad }> = await response.json();
    return data.updatedLoad;
};

export const deleteLoadById = async (id: number) => {
    const response = await fetch(apiUrl + '/loads/' + id, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();
    return data.result;
};
