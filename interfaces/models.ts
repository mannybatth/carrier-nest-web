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
const expandedLoad = Prisma.validator<Prisma.LoadDefaultArgs>()({
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
                id: true,
                assignedAt: true,
                driver: true,
                chargeType: true,
                chargeValue: true,
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
const expandedCustomer = Prisma.validator<Prisma.CustomerDefaultArgs>()({
    include: {
        loads: true,
    },
});
export type ExpandedCustomer = Partial<Prisma.CustomerGetPayload<typeof expandedCustomer>>;

const expandedLoadStop = Prisma.validator<Prisma.LoadStopDefaultArgs>()({
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
const expandedInvoice = Prisma.validator<Prisma.InvoiceDefaultArgs>()({
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

const expandedRoute = Prisma.validator<Prisma.RouteDefaultArgs>()({
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
                        driver: true,
                        chargeType: true,
                        chargeValue: true,
                    },
                },
            },
        },
    },
});
export type ExpandedRoute = Partial<Prisma.RouteGetPayload<typeof expandedRoute>>;

const expandedRouteLeg = Prisma.validator<Prisma.RouteLegDefaultArgs>()({
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
                driver: true,
                chargeType: true,
                chargeValue: true,
            },
        },
    },
});
export type ExpandedRouteLeg = Partial<Prisma.RouteLegGetPayload<typeof expandedRouteLeg>>;

const expandedRouteLegLocation = Prisma.validator<Prisma.RouteLegLocationDefaultArgs>()({
    include: {
        loadStop: true,
        location: true,
    },
});
export type ExpandedRouteLegLocation = Partial<Prisma.RouteLegLocationGetPayload<typeof expandedRouteLegLocation>>;

/**
 * Driver
 */
const expandedDriver = Prisma.validator<Prisma.DriverDefaultArgs>()({
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
                                driver: true,
                                chargeType: true,
                                chargeValue: true,
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
 * DriverAssignment
 */

const expandedDriverAssignment = Prisma.validator<Prisma.DriverAssignmentDefaultArgs>()({
    include: {
        driver: {
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                devices: {
                    select: {
                        fcmToken: true,
                    },
                },
            },
        },
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
                        driver: true,
                        chargeType: true,
                        chargeValue: true,
                    },
                },
            },
        },
        load: {
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
                podDocuments: true,
            },
        },
    },
});
export type ExpandedDriverAssignment = Partial<Prisma.DriverAssignmentGetPayload<typeof expandedDriverAssignment>>;

/**
 * LoadDocument
 */
const expandedLoadDocument = Prisma.validator<Prisma.LoadDocumentDefaultArgs>()({
    include: {
        load: true,
    },
});
export type ExpandedLoadDocument = Partial<Prisma.LoadDocumentGetPayload<typeof expandedLoadDocument>>;

/**
 * LoadActivity
 */
const expandedLoadActivity = Prisma.validator<Prisma.LoadActivityDefaultArgs>()({
    include: {
        load: true,
        actorUser: true,
        actorDriver: true,
        actionDocument: true,
        actionDriver: true,
    },
});
export type ExpandedLoadActivity = Partial<Prisma.LoadActivityGetPayload<typeof expandedLoadActivity>>;

/**
 * Equipment
 */
const expandedEquipment = Prisma.validator<Prisma.EquipmentDefaultArgs>()({
    include: {
        drivers: true,
    },
});
export type ExpandedEquipment = Partial<Prisma.EquipmentGetPayload<typeof expandedEquipment>>;

export function exclude<ExpandedLoad, Key extends keyof ExpandedLoad>(
    load: ExpandedLoad,
    keys: Key[],
): Omit<ExpandedLoad, Key> {
    const filteredEntries = Object.entries(load).filter(([key]) => !keys.includes(key as Key));
    return filteredEntries.length
        ? (Object.fromEntries(filteredEntries) as Omit<ExpandedLoad, Key>)
        : ({} as Omit<ExpandedLoad, Key>);
}
