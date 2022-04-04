import { Customer, InvoiceStatus, Prisma } from '@prisma/client';

export type Sort = {
    key: string;
    order: 'asc' | 'desc' | null;
};

export type JSONResponse<T> = {
    code: number;
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
    PAID = 'paid',
    OVERDUE = 'overdue',
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
export enum UIInvoiceStatus {
    NOT_PAID = 'not paid',
    PARTIALLY_PAID = 'partially paid',
    OVERDUE = 'overdue',
    PAID = 'paid',
}

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

const simpleInvoicePayment = Prisma.validator<Prisma.InvoicePaymentArgs>()({
    select: {
        amount: true,
        paidAt: true,
    },
});
export type SimpleInvoicePayment = Prisma.InvoicePaymentGetPayload<typeof simpleInvoicePayment>;

export type ExpandedInvoicePayment = SimpleInvoicePayment & {
    id?: number;
};

const simpleInvoice = Prisma.validator<Prisma.InvoiceArgs>()({
    select: {
        totalAmount: true,
        invoicedAt: true,
        dueNetDays: true,
    },
});
export type SimpleInvoice = Prisma.InvoiceGetPayload<typeof simpleInvoice>;

export type ExpandedInvoice = SimpleInvoice & {
    id?: number;
    createdAt?: Date;
    updatedAt?: Date;
    status?: InvoiceStatus;
    dueDate?: Date;
    lastPaymentAt?: Date;
    paidAmount?: Prisma.Decimal;
    load?: ExpandedLoad & Record<string, unknown>;
    extraItems?: ExpandedInvoiceItem[];
    payments?: ExpandedInvoicePayment[];
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
        fileKey: true,
        fileUrl: true,
        fileName: true,
        fileType: true,
        fileSize: true,
    },
});
export type SimpleLoadDocument = Prisma.LoadDocumentGetPayload<typeof simpleLoadDocument>;

export type ExpandedLoadDocument = SimpleLoadDocument & {
    id?: number;
    createdAt?: Date;
    load?: ExpandedLoad & Record<string, unknown>;
};
