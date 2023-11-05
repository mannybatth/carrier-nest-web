export interface AILoad {
    logistics_company: string;
    load_number: string;
    stops: AIStop[];
    rate: number;
    invoice_emails: string[];
}

export interface AIStop {
    type: 'PU' | 'SO';
    name: string;
    address: AIAddress;
    date: string;
    time: string;
    po_numbers?: string[];
    pickup_numbers?: string[];
    reference_numbers?: string[];
}

export interface AIAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}
