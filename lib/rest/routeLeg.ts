import { apiUrl } from '../../constants';
import { ExpandedRoute, JSONResponse } from '../../interfaces/models';
import { CreateAssignmentRequest, UpdateAssignmentRequest } from '../../interfaces/assignment';
import { LoadStatus, RouteLegStatus } from '@prisma/client';

export const createRouteLeg = async (createAssignmentRequest: CreateAssignmentRequest) => {
    const response = await fetch(apiUrl + '/assignment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(createAssignmentRequest),
    });

    const { data, errors }: JSONResponse<{ expandedRouteDetails: ExpandedRoute }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.expandedRouteDetails;
};

export const updateRouteLeg = async (updateAssignmentRequest: UpdateAssignmentRequest) => {
    const response = await fetch(apiUrl + '/assignment', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateAssignmentRequest),
    });

    const { data, errors }: JSONResponse<{ expandedRouteDetails: ExpandedRoute }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.expandedRouteDetails;
};

export const removeRouteLegById = async (routeLegId: string) => {
    const params = new URLSearchParams({
        routeLegId: routeLegId,
    });

    const response = await fetch(apiUrl + '/assignment?' + params.toString(), {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};

export const updateRouteLegStatus = async (routeLegId: string, routeLegStatus: RouteLegStatus) => {
    const response = await fetch(apiUrl + '/assignment/' + routeLegId, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ routeLegStatus }),
    });

    const { data, errors }: JSONResponse<{ loadStatus: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.loadStatus as LoadStatus;
};
