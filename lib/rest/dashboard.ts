import { apiUrl } from '../../constants';
import { ExpandedLoad, JSONResponse } from '../../interfaces/models';
import { DashboardStats } from '../../interfaces/stats';

export const getUpcomingLoads = async (): Promise<ExpandedLoad[]> => {
    const response = await fetch(`${apiUrl}/loads/upcoming`);
    const { data, errors }: JSONResponse<ExpandedLoad[]> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};

export const getDashboardStats = async (statsTimeFrame: number): Promise<DashboardStats> => {
    const response = await fetch(`${apiUrl}/stats?timeframe=${statsTimeFrame}`, { cache: 'no-cache' });
    const { data, errors }: JSONResponse<DashboardStats> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};
