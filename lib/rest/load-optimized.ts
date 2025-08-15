import { apiUrl } from '../constants';
import { ExpandedLoad, JSONResponse } from '../../interfaces/models';

// Enhanced getLoadById with selective loading
export const getLoadByIdOptimized = async (
    id: string,
    driverId?: string,
    options?: {
        expandCarrier?: boolean;
        fields?: string[]; // New: selective field loading
        includeActivity?: boolean; // New: optionally include recent activity
        lightweight?: boolean; // New: minimal data for faster loading
    },
): Promise<ExpandedLoad> => {
    const { expandCarrier = false, fields, includeActivity = false, lightweight = false } = options || {};

    let expand = 'customer,shipper,receiver,stops,invoice,driverAssignments,documents,route,additionalStops,expenses';

    // Lightweight mode for faster initial load
    if (lightweight) {
        expand = 'customer,shipper,receiver,invoice,stops,expenses'; // Essential data including stops for route display and expenses
    }

    if (expandCarrier) {
        expand += ',carrier';
    }

    if (includeActivity) {
        expand += ',recentActivity'; // Last 5 activities
    }

    const params = new URLSearchParams({
        expand: expand,
        ...(driverId ? { driverId } : {}),
        ...(fields ? { fields: fields.join(',') } : {}),
        ...(lightweight ? { lightweight: 'true' } : {}),
    });

    const response = await fetch(apiUrl + '/loads/' + id + '?' + params.toString());
    const { data, errors }: JSONResponse<{ load: ExpandedLoad }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.load;
};
