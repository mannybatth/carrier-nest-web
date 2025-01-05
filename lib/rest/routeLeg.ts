import { apiUrl } from '../../constants';
import { JSONResponse } from '../../interfaces/models';
import { LoadStatus, RouteLegStatus } from '@prisma/client';

export const updateRouteLegStatus = async (
    routeLegId: string,
    routeLegStatus: RouteLegStatus,
    extras: {
        driverId?: string;
        startLatitude?: number;
        startLongitude?: number;
        endLatitude?: number;
        endLongitude?: number;
        latitude?: number;
        longitude?: number;
    } = {},
) => {
    const response = await fetch(apiUrl + '/route-leg/' + routeLegId, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ routeLegStatus, ...extras }),
    });

    const { data, errors }: JSONResponse<{ loadStatus: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.loadStatus as LoadStatus;
};
