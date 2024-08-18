import { apiUrl } from '../../constants';
import { ExpandedDriverAssignment, JSONResponse } from 'interfaces/models';

export const getAssignmentById = async (id: string): Promise<ExpandedDriverAssignment> => {
    const response = await fetch(apiUrl + '/assignment/' + id);
    const { data, errors }: JSONResponse<ExpandedDriverAssignment> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};
