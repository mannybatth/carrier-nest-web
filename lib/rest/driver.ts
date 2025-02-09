import { Driver } from '@prisma/client';
import { apiUrl } from '../constants';
import { ExpandedDriver, JSONResponse } from '../../interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';

export const getAllDrivers = async ({
    sort,
    limit,
    offset,
}: {
    sort?: Sort;
    limit?: number;
    offset?: number;
}): Promise<{ drivers: Driver[]; metadata: PaginationMetadata }> => {
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
    const response = await fetch(apiUrl + '/drivers?' + params.toString());
    const { data, errors }: JSONResponse<{ drivers: Driver[]; metadata: PaginationMetadata }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};

export const getDriverById = async (id: string, expand?: string) => {
    const params = new URLSearchParams();
    if (expand) {
        params.append('expand', expand);
    }
    const response = await fetch(apiUrl + '/drivers/' + id + '?' + params.toString());
    const { data, errors }: JSONResponse<{ driver: ExpandedDriver }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.driver;
};

export const getDriversForLoadId = async (loadId: string) => {
    const response = await fetch(apiUrl + '/loads/' + loadId + '/drivers');
    const { data, errors }: JSONResponse<{ drivers: Driver[] }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.drivers;
};

export const searchDriversByName = async (value: string) => {
    const response = await fetch(apiUrl + '/drivers/search?q=' + value);
    const { data, errors }: JSONResponse<{ drivers: Driver[] }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.drivers;
};

export const fullTextSearchDriversByName = async (value: string) => {
    const response = await fetch(apiUrl + '/drivers/search/?fullText=true&q=' + value);
    const { data, errors }: JSONResponse<{ drivers: Driver[] }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.drivers;
};

export const createDriver = async (driver: Partial<Driver>, sendAppLinkSMS: boolean) => {
    const response = await fetch(apiUrl + '/drivers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driver: driver, sendAppLinkSMS: sendAppLinkSMS }),
    });
    const { data, errors }: JSONResponse<{ driver: Driver }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.driver;
};

export const updateDriver = async (id: string, driver: Partial<Driver>) => {
    const response = await fetch(apiUrl + '/drivers/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(driver),
    });
    const { data, errors }: JSONResponse<{ updatedDriver: Driver }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.updatedDriver;
};

export const deleteDriverById = async (id: string) => {
    const response = await fetch(apiUrl + '/drivers/' + id, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};
