import polyline from '@mapbox/polyline';
import { metersToMiles } from 'lib/helpers/distance';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export async function getGeocoding(address: string): Promise<{
    longitude: number;
    latitude: number;
}> {
    const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            address,
        )}.json?access_token=${MAPBOX_TOKEN}`,
    );

    if (!response.ok) {
        throw new Error(`Mapbox: Geocoding request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.features.length === 0) {
        throw new Error('Mapbox: No geocoding results found');
    }

    return {
        longitude: data.features[0].center[0],
        latitude: data.features[0].center[1],
    };
}

export async function getRouteForCoords(coords: number[][]) {
    const coordString = coords.map((coord) => `${coord[0]},${coord[1]}`).join(';');
    const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?access_token=${MAPBOX_TOKEN}&geometries=geojson`,
    );

    if (!response.ok) {
        throw new Error(`Mapbox: Directions request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.routes.length === 0) {
        throw new Error('Mapbox: No directions results found');
    }

    const coordinates = flipped(data.routes[0].geometry.coordinates);
    const routePolyline: string = polyline.encode(coordinates);

    const distanceMeters = data.routes[0].distance;
    const durationSeconds = data.routes[0].duration;

    const distanceMiles = metersToMiles(distanceMeters); // Convert meters to miles
    const durationHours = durationSeconds / 3600; // Convert seconds to hours

    return {
        routeEncoded: routePolyline,
        distanceMiles: distanceMiles,
        durationHours: durationHours,
    };
}

function flipped(coords: number[][]) {
    return coords.map((coord) => [coord[1], coord[0]]);
}
