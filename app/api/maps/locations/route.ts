import { auth } from 'auth';
import { LocationEntry } from 'interfaces/location';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth || !req.auth.user) {
        return NextResponse.json({ code: 404, errors: [{ message: 'No session found' }] }, { status: 404 });
    }

    const query = req.nextUrl.searchParams.get('q');
    if (!query) {
        return NextResponse.json(
            { code: 400, errors: [{ message: 'Query parameter "q" is required' }] },
            { status: 400 },
        );
    }

    const params = new URLSearchParams({
        access_token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
        types: 'address',
        country: 'us,ca',
        proximity: 'ip',
    });

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?${params.toString()}`;
    const response = await fetch(url);
    const json = await response.json();

    const findValueInContext = (name: string, context: any[], keyToReturn = 'text'): string => {
        const feature = context.find((x) => x.id.includes(`${name}.`));
        if (!feature) {
            return null;
        }
        return feature[keyToReturn];
    };

    const locations = json?.features
        ?.map((feature: any) => {
            const place = findValueInContext('place', feature.context);
            if (!place) {
                return null;
            }

            const regionCode = findValueInContext('region', feature.context, 'short_code');
            const regionText = findValueInContext('region', feature.context);
            const countryCode = findValueInContext('country', feature.context, 'short_code')?.toUpperCase();
            const countryText = findValueInContext('country', feature.context);
            return {
                street: feature.place_name.split(',')[0],
                city: place,
                region: {
                    shortCode: regionCode,
                    text: regionText,
                },
                zip: findValueInContext('postcode', feature.context),
                country: {
                    shortCode: countryCode,
                    text: countryText,
                },
                longitude: feature.center[0],
                latitude: feature.center[1],
            } as LocationEntry;
        })
        .filter((x) => x);

    return NextResponse.json({ code: 200, data: { locations } }, { status: 200 });
});
