import { apiUrl } from '../constants';
import { ExpandedLoad, JSONResponse } from '../../interfaces/models';
import { DashboardStats } from '../../interfaces/stats';

export const getUpcomingLoads = async (todayDataOnly: boolean): Promise<ExpandedLoad[]> => {
    const response = await fetch(`${apiUrl}/loads/upcoming?todayDataOnly=${todayDataOnly}`, { cache: 'no-cache' });

    const { data, errors }: { data: { loads: ExpandedLoad[] }; errors?: { message: string }[] } = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }

    return data.loads;
};

export const getDashboardStats = async (statsTimeFrame: string): Promise<DashboardStats> => {
    const response = await fetch(`${apiUrl}/stats?timeframe=${statsTimeFrame}`, { cache: 'no-cache' });
    const { data, errors }: JSONResponse<DashboardStats> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};
