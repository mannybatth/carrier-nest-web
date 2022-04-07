import { apiUrl } from '../../constants';
import { JSONResponse, LocationEntry } from '../../interfaces/models';

export const queryLocations = async (query: string) => {
    const response = await fetch(apiUrl + '/maps/locations?q=' + query);
    const { data, errors }: JSONResponse<{ locations: LocationEntry[] }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.locations;
};
