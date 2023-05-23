import { Load, LoadDocument } from '@prisma/client';
import { apiUrl } from '../../constants';
import { ExpandedLoad, JSONResponse } from '../../interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';

export const getLoadsExpanded = async ({
    sort,
    customerId,
    driverId,
    limit,
    offset,
    currentOnly,
}: {
    sort?: Sort;
    customerId?: number;
    driverId?: number;
    limit?: number;
    offset?: number;
    currentOnly?: boolean;
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
    if (currentOnly) {
        params.append('currentOnly', '1');
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
        expand: 'customer,shipper,receiver,stops,invoice,driver,documents',
    });
    const response = await fetch(apiUrl + '/loads/' + id + '?' + params.toString());
    const { data, errors }: JSONResponse<{ load: ExpandedLoad }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
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

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.load;
};

export const updateLoad = async (id: number, load: Partial<Load>) => {
    const response = await fetch(apiUrl + '/loads/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(load),
    });
    const { data, errors }: JSONResponse<{ updatedLoad: ExpandedLoad }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.updatedLoad;
};

export const deleteLoadById = async (id: number) => {
    const response = await fetch(apiUrl + '/loads/' + id, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};

export const addLoadDocumentToLoad = async (loadId: number, loadDocument: Partial<LoadDocument>) => {
    const response = await fetch(apiUrl + '/loads/' + loadId + '/documents', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(loadDocument),
    });
    const { data, errors }: JSONResponse<{ loadDocument: LoadDocument }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.loadDocument;
};

export const deleteLoadDocumentFromLoad = async (loadId: number, loadDocumentId: number) => {
    const response = await fetch(apiUrl + '/loads/' + loadId + '/documents/' + loadDocumentId, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};
