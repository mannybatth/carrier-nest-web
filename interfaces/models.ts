import { Prisma } from '@prisma/client';

export type JSONResponse<T> = {
    code: number;
    data?: T;
    errors?: Array<{ message: string }>;
};

export type SearchResult<T> = {
    sim: number;
} & T;

/**
 * Load
 */
const expandedLoad = Prisma.validator<Prisma.LoadArgs>()({
    include: {
        customer: { select: { id: true, name: true } },
        carrier: { select: { id: true, name: true } },
        invoice: {
            select: {
                id: true,
                status: true,
                invoiceNum: true,
                totalAmount: true,
                invoicedAt: true,
                dueDate: true,
                dueNetDays: true,
                paidAmount: true,
                remainingAmount: true,
                lastPaymentAt: true,
            },
        },
        shipper: {
            select: {
                id: true,
                type: true,
                name: true,
                street: true,
                city: true,
                state: true,
                zip: true,
                country: true,
                date: true,
                time: true,
                stopIndex: true,
                latitude: true,
                longitude: true,
                poNumbers: true,
                pickUpNumbers: true,
                referenceNumbers: true,
            },
        },
        receiver: {
            select: {
                id: true,
                type: true,
                name: true,
                street: true,
                city: true,
                state: true,
                zip: true,
                country: true,
                date: true,
                time: true,
                stopIndex: true,
                latitude: true,
                longitude: true,
                poNumbers: true,
                pickUpNumbers: true,
                referenceNumbers: true,
            },
        },
        stops: {
            select: {
                id: true,
                type: true,
                name: true,
                street: true,
                city: true,
                state: true,
                zip: true,
                country: true,
                date: true,
                time: true,
                stopIndex: true,
                latitude: true,
                longitude: true,
                poNumbers: true,
                pickUpNumbers: true,
                referenceNumbers: true,
            },
        },
        route: true,
        driverAssignments: {
            select: {
                assignedAt: true,
                driver: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        },
        loadDocuments: true,
        podDocuments: true,
        rateconDocument: true,
    },
});
export type ExpandedLoad = Partial<Prisma.LoadGetPayload<typeof expandedLoad>> & {
    route?: ExpandedRoute;
};

/**
 * Customer
 */
const expandedCustomer = Prisma.validator<Prisma.CustomerArgs>()({
    include: {
        loads: true,
    },
});
export type ExpandedCustomer = Partial<Prisma.CustomerGetPayload<typeof expandedCustomer>>;

const expandedLoadStop = Prisma.validator<Prisma.LoadStopArgs>()({
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
        stopIndex: true,
        latitude: true,
        longitude: true,
        poNumbers: true,
        pickUpNumbers: true,
        referenceNumbers: true,
    },
});
export type ExpandedLoadStop = Partial<Prisma.LoadStopGetPayload<typeof expandedLoadStop>>;

/**
 * Invoice
 */
export enum UIInvoiceStatus {
    NOT_PAID = 'not paid',
    PARTIALLY_PAID = 'partially paid',
    OVERDUE = 'overdue',
    PAID = 'paid',
}
const expandedInvoice = Prisma.validator<Prisma.InvoiceArgs>()({
    include: {
        load: {
            include: {
                customer: true,
                shipper: true,
                receiver: true,
                stops: true,
            },
        },
        extraItems: {
            select: {
                id: true,
                title: true,
                amount: true,
            },
        },
        payments: {
            select: {
                id: true,
                amount: true,
                paidAt: true,
            },
        },
    },
});
export type ExpandedInvoice = Partial<Prisma.InvoiceGetPayload<typeof expandedInvoice>>;

const expandedRoute = Prisma.validator<Prisma.RouteArgs>()({
    include: {
        routeLegs: {
            include: {
                locations: {
                    include: {
                        loadStop: true,
                        location: true,
                    },
                },
                driverAssignments: {
                    select: {
                        id: true,
                        assignedAt: true,
                        driver: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        },
    },
});
export type ExpandedRoute = Partial<Prisma.RouteGetPayload<typeof expandedRoute>>;

const expandedRouteLeg = Prisma.validator<Prisma.RouteLegArgs>()({
    include: {
        locations: {
            include: {
                loadStop: true,
                location: true,
            },
        },
        driverAssignments: {
            select: {
                id: true,
                assignedAt: true,
                driver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        },
    },
});
export type ExpandedRouteLeg = Partial<Prisma.RouteLegGetPayload<typeof expandedRouteLeg>>;
/**
 * Driver
 */
const expandedDriver = Prisma.validator<Prisma.DriverArgs>()({
    include: {
        assignments: {
            include: {
                routeLeg: {
                    include: {
                        locations: {
                            include: {
                                loadStop: true,
                                location: true,
                            },
                        },
                        driverAssignments: {
                            select: {
                                id: true,
                                assignedAt: true,
                                driver: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        devices: true,
    },
});
export type ExpandedDriver = Partial<Prisma.DriverGetPayload<typeof expandedDriver>>;

/**
 * LoadDocument
 */
const expandedLoadDocument = Prisma.validator<Prisma.LoadDocumentArgs>()({
    include: {
        load: true,
    },
});
export type ExpandedLoadDocument = Partial<Prisma.LoadDocumentGetPayload<typeof expandedLoadDocument>>;

/**
 * LoadActivity
 */
const expandedLoadActivity = Prisma.validator<Prisma.LoadActivityArgs>()({
    include: {
        load: true,
        actorUser: true,
        actorDriver: true,
        actionDocument: true,
        actionDriver: true,
    },
});
export type ExpandedLoadActivity = Partial<Prisma.LoadActivityGetPayload<typeof expandedLoadActivity>>;

export function exclude<ExpandedLoad, Key extends keyof ExpandedLoad>(
    load: ExpandedLoad,
    keys: Key[],
): Omit<ExpandedLoad, Key> {
    const filteredEntries = Object.entries(load).filter(([key]) => !keys.includes(key as Key));
    return filteredEntries.length
        ? (Object.fromEntries(filteredEntries) as Omit<ExpandedLoad, Key>)
        : ({} as Omit<ExpandedLoad, Key>);
}
