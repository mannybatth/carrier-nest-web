import { Customer, Prisma } from '@prisma/client';

export type Sort = {
    key: string;
    order: 'asc' | 'desc' | null;
};

export type JSONResponse<T> = {
    data?: T;
    errors?: Array<{ message: string }>;
};

/**
 * Load
 */
const simpleLoad = Prisma.validator<Prisma.LoadArgs>()({
    select: { customerId: true, refNum: true, rate: true, status: true, distance: true, distanceUnit: true },
});
export type SimpleLoad = Prisma.LoadGetPayload<typeof simpleLoad>;

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

export type ExpandedLoad = SimpleLoad & {
    id?: number;
    customer?: Customer;
    shipper?: SimpleLoadStop;
    receiver?: SimpleLoadStop;
    stops?: SimpleLoadStop[];
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
