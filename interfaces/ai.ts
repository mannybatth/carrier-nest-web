export interface AILoad {
    logistics_company: string;
    load_number: string;
    stops: AIStop[];
    rate: string;
    invoice_emails: string[];
}

export interface AIStop {
    type: 'PU' | 'SO';
    name: string;
    address: AIAddress;
    date: string;
    time: string;
}

export interface AIAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}
