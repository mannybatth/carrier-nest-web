import { SubdivisionInfo } from 'iso-3166-2';

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
