import { Customer, Prisma } from '@prisma/client';

export type Sort = {
    key: string;
    order: 'asc' | 'desc' | null;
};

export type JSONResponse<T> = {
    data?: T;
    errors?: Array<{ message: string }>;
};

export type SearchResult<T> = {
    sim: number;
} & T;

export type PaginationMetadata = {
    total: number;
    currentOffset: number;
    currentLimit: number;
    prev?: {
        offset: number;
        limit: number;
    };
    next?: {
        offset: number;
        limit: number;
    };
};

/**
 * Load
 */
export enum LoadStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    INVOICED = 'invoiced',
}

const simpleLoadStop = Prisma.validator<Prisma.LoadStopArgs>()({
    select: {
        type: true,
        name: true,
        street: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        date: true,
        time: true,
    },
});
export type SimpleLoadStop = Prisma.LoadStopGetPayload<typeof simpleLoadStop>;

const simpleLoad = Prisma.validator<Prisma.LoadArgs>()({
    select: {
        customerId: true,
        refNum: true,
        rate: true,
        distance: true,
        distanceUnit: true,
    },
});
export type SimpleLoad = Prisma.LoadGetPayload<typeof simpleLoad>;

export type ExpandedLoad = SimpleLoad & {
    id?: number;
    customer?: Customer;
    shipper?: SimpleLoadStop;
    receiver?: SimpleLoadStop;
    stops?: SimpleLoadStop[];
    invoice?: ExpandedInvoice;
    driver?: ExpandedDriver;
    loadDocuments?: ExpandedLoadDocument[];
};

/**
 * Customer
 */
const simpleCustomer = Prisma.validator<Prisma.CustomerArgs>()({
    select: {
        name: true,
        contactEmail: true,
        billingEmail: true,
        paymentStatusEmail: true,
        street: true,
        city: true,
        state: true,
        zip: true,
        country: true,
    },
});
export type SimpleCustomer = Prisma.CustomerGetPayload<typeof simpleCustomer>;

export type ExpandedCustomer = SimpleCustomer & {
    id?: number;
    loads?: ExpandedLoad[];
};

/**
 * Invoice
 */
const simpleInvoiceItem = Prisma.validator<Prisma.InvoiceItemArgs>()({
    select: {
        title: true,
        amount: true,
    },
});
export type SimpleInvoiceItem = Prisma.InvoiceItemGetPayload<typeof simpleInvoiceItem>;

export type ExpandedInvoiceItem = SimpleInvoiceItem & {
    id?: number;
};

const simpleInvoice = Prisma.validator<Prisma.InvoiceArgs>()({
    select: {
        totalAmount: true,
        dueNetDays: true,
        invoicedAt: true,
    },
});
export type SimpleInvoice = Prisma.InvoiceGetPayload<typeof simpleInvoice>;

export type ExpandedInvoice = SimpleInvoice & {
    id?: number;
    createdAt?: Date;
    updatedAt?: Date;
    paidAmount?: number;
    paidAt?: Date;
    load?: ExpandedLoad & Record<string, unknown>;
    extraItems?: ExpandedInvoiceItem[];
};

/**
 * Driver
 */
const simpleDriver = Prisma.validator<Prisma.DriverArgs>()({
    select: {
        name: true,
        email: true,
        phone: true,
    },
});
export type SimpleDriver = Prisma.DriverGetPayload<typeof simpleDriver>;

export type ExpandedDriver = SimpleDriver & {
    id?: number;
    loads?: (ExpandedLoad & Record<string, unknown>)[];
};

/**
 * Load Document
 */
const simpleLoadDocument = Prisma.validator<Prisma.LoadDocumentArgs>()({
    select: {
        type: true,
        filename: true,
    },
});
export type SimpleLoadDocument = Prisma.LoadDocumentGetPayload<typeof simpleLoadDocument>;

export type ExpandedLoadDocument = SimpleLoadDocument & {
    id?: number;
    createdAt?: Date;
    updatedAt?: Date;
    load?: ExpandedLoad & Record<string, unknown>;
};
