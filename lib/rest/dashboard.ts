import { apiUrl } from '../../constants';
import { ExpandedLoad, JSONResponse } from '../../interfaces/models';

export const getUpcomingLoads = async (): Promise<ExpandedLoad[]> => {
    const response = await fetch(`${apiUrl}/loads/upcoming`);
    const { data, errors }: JSONResponse<ExpandedLoad[]> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};
