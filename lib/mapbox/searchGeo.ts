import polyline from '@mapbox/polyline';
import { Prisma } from '@prisma/client';
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

    // Use driving-traffic profile with truck-optimized parameters and request alternatives
    const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordString}?` +
            `access_token=${MAPBOX_TOKEN}&` +
            `geometries=geojson&` +
            `exclude=ferry&` +
            `annotations=duration,distance&` +
            `overview=full&` +
            `steps=false&` +
            `alternatives=true&` +
            `continue_straight=false`,
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Mapbox API Error:', response.status, errorText);
        throw new Error(`Mapbox: Directions request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.routes.length === 0) {
        throw new Error('Mapbox: No directions results found');
    }

    // Process all available routes
    const routes = data.routes.map((route: any, index: number) => {
        const coordinates = flipped(route.geometry.coordinates);
        const routePolyline: string = polyline.encode(coordinates);

        const distanceMeters = route.distance;
        const durationSeconds = route.duration;

        const distanceMiles = new Prisma.Decimal(metersToMiles(distanceMeters));
        const durationHours = new Prisma.Decimal(durationSeconds / 3600);

        return {
            routeEncoded: routePolyline,
            distanceMiles: distanceMiles.toNearest(0.01).toNumber(),
            durationHours: durationHours.toNearest(0.01).toNumber(),
            isSelected: index === 0, // First route is selected by default
            routeIndex: index,
        };
    });

    return {
        routes,
        selectedRoute: routes[0], // Return the first route as selected
        routeEncoded: routes[0].routeEncoded,
        distanceMiles: routes[0].distanceMiles,
        durationHours: routes[0].durationHours,
    };
}

function flipped(coords: number[][]) {
    return coords.map((coord) => [coord[1], coord[0]]);
}
