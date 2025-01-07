import { apiUrl } from '../../constants';
import { ExpandedDriverAssignment, ExpandedRoute, JSONResponse } from 'interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { CreateAssignmentRequest, UpdateAssignmentRequest } from 'interfaces/assignment';

interface GetAssignmentsResponse {
    assignments: ExpandedDriverAssignment[];
    metadata: PaginationMetadata;
}

export const getAllAssignments = async ({
    limit,
    offset,
    sort,
}: {
    limit: number;
    offset: number;
    sort: Sort;
}): Promise<GetAssignmentsResponse> => {
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
    const response = await fetch('/api/assignments' + '?' + params.toString());
    const { data, errors }: JSONResponse<GetAssignmentsResponse> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};

export const getAssignmentById = async (id: string): Promise<ExpandedDriverAssignment> => {
    const response = await fetch(apiUrl + '/assignments/' + id);
    const { data, errors }: JSONResponse<ExpandedDriverAssignment> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};

export const createRouteLeg = async (createAssignmentRequest: CreateAssignmentRequest): Promise<ExpandedRoute> => {
    const response = await fetch(apiUrl + '/assignments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(createAssignmentRequest),
    });

    const { data, errors }: JSONResponse<{ route: ExpandedRoute }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.route as ExpandedRoute;
};

export const updateRouteLeg = async (updateAssignmentRequest: UpdateAssignmentRequest): Promise<ExpandedRoute> => {
    const response = await fetch(apiUrl + '/assignments', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateAssignmentRequest),
    });

    const { data, errors }: JSONResponse<{ route: ExpandedRoute }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.route as ExpandedRoute;
};

export const removeRouteLegById = async (routeLegId: string) => {
    const params = new URLSearchParams({
        routeLegId: routeLegId,
    });

    const response = await fetch(apiUrl + '/assignments?' + params.toString(), {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<void> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};
