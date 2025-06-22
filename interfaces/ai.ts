export interface AILoad {
    logistics_company: string;
    load_number: string;
    stops: AIStop[];
    rate: number;
    invoice_emails: string[];
    customer_details?: AICustomerDetails;
}

export interface AICustomerDetails {
    name: string;
    contact_email?: string;
    billing_email?: string;
    payment_status_email?: string;
    address?: AICustomerAddress;
}

export interface AICustomerAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
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
