import { RouteLeg } from '@prisma/client';
import { apiUrl } from '../../constants';
import { ExpandedRoute, ExpandedRouteLeg, JSONResponse } from '../../interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { LoadLegStatus } from 'pages/loads/[id]';
import { RouteLegUpdate } from 'interfaces/route-leg';

export const getAllRouteLegs = async ({
    sort,
    limit,
    offset,
}: {
    sort?: Sort;
    limit?: number;
    offset?: number;
}): Promise<{ routeLegs: RouteLeg[]; metadata: PaginationMetadata }> => {
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
    const { data, errors }: JSONResponse<{ routeLegs: RouteLeg[]; metadata: PaginationMetadata }> =
        await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};

export const getRouteLegById = async (id: string) => {
    const response = await fetch(apiUrl + '/drivers/' + id);
    const { data, errors }: JSONResponse<{ routeLeg: RouteLeg }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.routeLeg;
};

export const getRouteLegsForLoadId = async (loadId: string) => {
    const response = await fetch(apiUrl + '/loads/' + loadId + '/drivers');
    const { data, errors }: JSONResponse<{ routeLegs: RouteLeg[] }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.routeLegs;
};

export const createRouteLeg = async (loadId: string, routeLeg: Partial<RouteLeg>, sendSms: boolean) => {
    const response = await fetch(apiUrl + '/loads/' + loadId + '/assign-leg', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ routeLeg, sendSms, loadId }),
    });

    const { data, errors }: JSONResponse<{ expandedRouteDetails: ExpandedRoute }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.expandedRouteDetails;
};

export const updateRouteLeg = async (
    loadId: string,
    routeLegId: string,
    routeLegUpdate: RouteLegUpdate,
    sendSms: boolean,
) => {
    const response = await fetch(apiUrl + '/loads/' + loadId + '/assign-leg/' + routeLegId, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ routeLegUpdate, sendSms, loadId }),
    });

    const { data, errors }: JSONResponse<{ updatedRoute: ExpandedRouteLeg }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.updatedRoute;
};

export const updateRouteLegStatus = async (loadId: string, routeLegId: string, routeLegStatus: LoadLegStatus) => {
    const response = await fetch(apiUrl + '/loads/' + loadId + '/assign-leg/' + routeLegId, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ routeLegStatus, loadId }),
    });

    const { data, errors }: JSONResponse<{ loadStatus: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.loadStatus;
};

export const removeRouteLeg = async (loadId: string, routeLegId: string) => {
    const response = await fetch(apiUrl + '/loads/' + loadId + '/assign-leg/' + routeLegId, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    console.log('response', response);
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};

export const deleteRouteLegById = async (id: string) => {
    const response = await fetch(apiUrl + '/drivers/' + id, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};

export const removeDriverFromLoad = async (loadId: string, driverId: string) => {
    const response = await fetch(apiUrl + '/loads/' + loadId + '/assign-driver/' + driverId, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};
