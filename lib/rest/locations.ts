import { Location } from '@prisma/client';
import { apiUrl } from '../constants';
import { JSONResponse } from '../../interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';

export const getAllLocations = async ({
    sort,
    limit,
    offset,
}: {
    sort?: Sort;
    limit?: number;
    offset?: number;
}): Promise<{ locations: Location[]; metadata: PaginationMetadata }> => {
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
    const response = await fetch(apiUrl + '/locations?' + params.toString());
    const { data, errors }: JSONResponse<{ locations: Location[]; metadata: PaginationMetadata }> =
        await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};

export const getLocationById = async (id: string) => {
    const response = await fetch(apiUrl + '/locations/' + id);
    const { data, errors }: JSONResponse<{ location: Location }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.location;
};

export const searchLocationsByName = async (value: string) => {
    const response = await fetch(apiUrl + '/locations/search?q=' + value);
    const { data, errors }: JSONResponse<{ locations: Location[] }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.locations;
};

export const fullTextSearchLocationsByName = async (value: string) => {
    const response = await fetch(apiUrl + '/locations/search/?fullText=true&q=' + value);
    const { data, errors }: JSONResponse<{ locations: Location[] }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.locations;
};

export const createLocation = async (location: Partial<Location>) => {
    const response = await fetch(apiUrl + '/locations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(location),
    });
    const { data, errors }: JSONResponse<{ location: Location }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.location;
};

export const updateLocation = async (id: string, location: Partial<Location>) => {
    const response = await fetch(apiUrl + '/locations/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(location),
    });
    const { data, errors }: JSONResponse<{ updatedLocation: Location }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.updatedLocation;
};

export const deleteLocationById = async (id: string) => {
    const response = await fetch(apiUrl + '/locations/' + id, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};
