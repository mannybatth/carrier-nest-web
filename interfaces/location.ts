import { SubdivisionInfo, subdivision } from 'iso-3166-2';

export interface LocationEntry {
    street: string;
    city: string;
    region: {
        shortCode: string;
        text: string;
        iso3166Info?: SubdivisionInfo.Full;
    };
    zip: string;
    country: {
        shortCode: string;
        text: string;
    };
    longitude: number;
    latitude: number;
}

export const regionFromLocationEntry = (
    location: LocationEntry,
): {
    regionText: string;
    iso3166Info?: SubdivisionInfo.Full;
} => {
    const regionCode = location?.region?.shortCode;
    if (regionCode) {
        const iso3166Info = subdivision(regionCode);
        if (iso3166Info) {
            return {
                regionText: iso3166Info.regionCode,
                iso3166Info,
            };
        } else {
            return {
                regionText: regionCode,
            };
        }
    } else {
        return {
            regionText: location?.region?.text,
        };
    }
};
