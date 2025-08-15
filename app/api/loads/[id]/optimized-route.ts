import { Load, LoadStopType } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { exclude, ExpandedLoad, JSONResponse } from 'interfaces/models';
import { Session } from 'next-auth';

// OPTIMIZED: Add lightweight mode for faster initial page loads
const getLoadOptimized = async ({
    session,
    tokenCarrierId,
    query,
    loadId,
}: {
    session?: Session;
    tokenCarrierId?: string;
    query: URLSearchParams;
    loadId: string;
}): Promise<JSONResponse<{ load: ExpandedLoad }>> => {
    const driverId = query.get('driverId');
    const expand = query.get('expand')?.split(',') || [];
    const lightweight = query.get('lightweight') === 'true';
    const fields = query.get('fields')?.split(',') || [];

    // OPTIMIZATION 1: Lightweight mode for faster initial loads
    if (lightweight) {
        const lightLoad = await prisma.load.findFirst({
            where: {
                id: loadId,
                carrierId: session?.user?.defaultCarrierId || tokenCarrierId,
                ...(driverId ? { driverAssignments: { some: { driverId: driverId } } } : null),
            },
            select: {
                // Essential fields only for fast initial render
                id: true,
                loadNum: true,
                status: true,
                rate: !driverId, // Exclude rate for drivers
                refNum: true,
                createdAt: true,
                customer: { select: { id: true, name: true } },
                shipper: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                        state: true,
                        date: true,
                        time: true,
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                        state: true,
                        date: true,
                        time: true,
                    },
                },
                invoice: { select: { id: true, invoiceNum: true, status: true } },
            },
        });

        if (!lightLoad) {
            return { code: 404, errors: [{ message: 'Load not found' }] };
        }

        return { code: 200, data: { load: lightLoad as ExpandedLoad } };
    }

    // OPTIMIZATION 2: Field selection based on frontend needs
    const buildSelect = () => {
        if (fields.length > 0) {
            const selectObject: any = {};
            fields.forEach((field) => {
                selectObject[field] = true;
            });
            return selectObject;
        }
        return undefined; // Return all fields if no specific fields requested
    };

    // OPTIMIZATION 3: Optimized include structure with better nesting
    const buildInclude = () => {
        const include: any = {};

        if (expand.includes('customer')) {
            include.customer = { select: { id: true, name: true, email: true, phone: true } };
        }

        if (expand.includes('shipper')) {
            include.shipper = {
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
            };
        }

        if (expand.includes('receiver')) {
            include.receiver = {
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
            };
        }

        if (expand.includes('stops')) {
            include.stops = {
                orderBy: { stopIndex: 'asc' },
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
            };
        }

        if (expand.includes('driverAssignments')) {
            include.driverAssignments = {
                select: {
                    id: true,
                    assignedAt: true,
                    chargeType: true,
                    chargeValue: true,
                    billedLoadRate: true,
                    driver: { select: { id: true, name: true, email: true, phone: true, active: true } },
                },
            };
        }

        // OPTIMIZATION 4: Conditional document loading (most expensive)
        if (expand.includes('documents')) {
            include.loadDocuments = {
                orderBy: { createdAt: 'desc' },
                take: 20, // Limit initial documents load
                select: {
                    id: true,
                    fileName: true,
                    fileType: true,
                    fileSize: true,
                    createdAt: true,
                    fileUrl: true, // Only essential document fields
                },
            };
            include.rateconDocument = {
                select: {
                    id: true,
                    fileName: true,
                    fileType: true,
                    fileSize: true,
                    createdAt: true,
                    fileUrl: true,
                },
            };
            include.podDocuments = {
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    fileName: true,
                    fileType: true,
                    fileSize: true,
                    createdAt: true,
                    fileUrl: true,
                },
            };
            include.bolDocuments = {
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    fileName: true,
                    fileType: true,
                    fileSize: true,
                    createdAt: true,
                    fileUrl: true,
                },
            };
        }

        if (expand.includes('invoice')) {
            include.invoice = {
                select: {
                    id: true,
                    invoiceNum: true,
                    status: true,
                    totalAmount: true,
                    createdAt: true,
                    dueDate: true,
                },
            };
        }

        if (expand.includes('carrier')) {
            include.carrier = {
                select: { id: true, name: true, dotNumber: true, mcNumber: true },
            };
        }

        // OPTIMIZATION 5: Route data with better performance
        if (expand.includes('route')) {
            include.route = {
                select: {
                    id: true,
                    loadId: true,
                    routeLegs: {
                        orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
                        take: 50, // Limit route legs
                        select: {
                            id: true,
                            driverInstructions: true,
                            scheduledDate: true,
                            scheduledTime: true,
                            startedAt: true,
                            endedAt: true,
                            distanceMiles: true,
                            durationHours: true,
                            status: true,
                            startLatitude: true,
                            startLongitude: true,
                            endLatitude: true,
                            endLongitude: true,
                            locations: {
                                select: {
                                    id: true,
                                    loadStop: { select: { id: true, name: true, city: true, state: true } },
                                    location: { select: { id: true, name: true, latitude: true, longitude: true } },
                                },
                            },
                            driverAssignments: {
                                select: {
                                    id: true,
                                    assignedAt: true,
                                    chargeType: true,
                                    chargeValue: true,
                                    billedLoadRate: true,
                                    driver: {
                                        select: { id: true, name: true, email: true, phone: true, active: true },
                                    },
                                },
                            },
                        },
                    },
                },
            };
        }

        // OPTIMIZATION 6: Expenses with essential data only
        if (expand.includes('expenses')) {
            include.expenses = {
                orderBy: { createdAt: 'desc' },
                take: 20, // Limit initial expenses load
                select: {
                    id: true,
                    amount: true,
                    receiptDate: true,
                    currencyCode: true,
                    paidBy: true,
                    approvalStatus: true,
                    description: true,
                    vendorName: true,
                    createdAt: true,
                    category: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                    driver: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    documents: {
                        take: 5, // Limit documents per expense
                        select: {
                            id: true,
                            document: {
                                select: {
                                    id: true,
                                    fileName: true,
                                    fileType: true,
                                    fileSize: true,
                                    fileUrl: true,
                                },
                            },
                        },
                    },
                },
            };
        }

        return include;
    };

    // OPTIMIZATION 6: Single optimized query with proper indexing hints
    const load = await prisma.load.findFirst({
        where: {
            id: loadId,
            carrierId: session?.user?.defaultCarrierId || tokenCarrierId,
            ...(driverId ? { driverAssignments: { some: { driverId: driverId } } } : null),
        },
        ...(buildSelect() ? { select: buildSelect() } : {}),
        include: buildInclude(),
    });

    if (!load) {
        return { code: 404, errors: [{ message: 'Load not found' }] };
    }

    // OPTIMIZATION 7: Exclude sensitive data for drivers
    if (driverId) {
        const loadWithoutRate = exclude(load, ['rate']);
        return {
            code: 200,
            data: { load: loadWithoutRate as Omit<Load, 'rate'> },
        };
    }

    return { code: 200, data: { load: load as Load } };
};

// OPTIMIZATION 8: Add caching layer (Redis recommended)
export const getCachedLoad = async (loadId: string, cacheKey: string) => {
    // Implement Redis caching here
    // const cached = await redis.get(cacheKey);
    // if (cached) return JSON.parse(cached);
    // ... fetch from DB and cache result
};

export { getLoadOptimized };
