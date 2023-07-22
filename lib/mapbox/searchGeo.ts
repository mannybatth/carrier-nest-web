import axios from 'axios';
import polyline from '@mapbox/polyline';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export async function getGeocoding(address: string): Promise<{
    longitude: number;
    latitude: number;
}> {
    const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`,
        {
            params: {
                access_token: MAPBOX_TOKEN,
            },
        },
    );

    if (response.data.features.length === 0) {
        throw new Error('Mapbox: No geocoding results found');
    }

    return {
        longitude: response.data.features[0].center[0],
        latitude: response.data.features[0].center[1],
    };
}

export async function getRouteEncoded(coords: number[][]) {
    const coordString = coords.map((coord) => `${coord[0]},${coord[1]}`).join(';');
    const response = await axios.get(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}`, {
        params: {
            access_token: MAPBOX_TOKEN,
            geometries: 'geojson',
        },
    });

    if (response.data.routes.length === 0) {
        throw new Error('Mapbox: No directions results found');
    }

    const coordinates = flipped(response.data.routes[0].geometry.coordinates);
    const routePolyline: string = polyline.encode(coordinates);

    return routePolyline;
}

function flipped(coords: number[][]) {
    const flipped = [];
    for (let i = 0; i < coords.length; i++) {
        const coord = coords[i].slice();
        flipped.push([coord[1], coord[0]]);
    }
    return flipped;
}
