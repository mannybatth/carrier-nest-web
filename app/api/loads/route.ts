import { Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import startOfDay from 'date-fns/startOfDay';
import { BASIC_PLAN_TOTAL_LOADS } from 'lib/constants';
import { ExpandedLoad } from 'interfaces/models';
import { calcPaginationMetadata } from 'lib/pagination';
import { isProPlan } from 'lib/subscription';
import 'polyfills';

const buildOrderBy = (
    sortBy: string,
    sortDir: 'asc' | 'desc',
): Prisma.Enumerable<Prisma.LoadOrderByWithRelationInput> => {
    if (sortBy === 'status') {
        return [
            {
                invoice: {
                    lastPaymentAt: sortDir,
                },
            },
            {
                invoice: {
                    id: sortDir,
                },
            },
            {
                receiver: {
                    date: sortDir,
                },
            },
        ];
    }
    if (sortBy && sortDir) {
        if (sortBy.includes('.')) {
            const split = sortBy.split('.');
            return {
                [split[0]]: {
                    [split[1]]: sortDir,
                },
            };
        }
        return { [sortBy]: sortDir };
    }
    return undefined;
};

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] });
    }

    const query = req.nextUrl.searchParams;
    const expand = query.get('expand') as string;
    const expandCustomer = expand?.includes('customer');
    const expandShipper = expand?.includes('shipper');
    const expandReceiver = expand?.includes('receiver');
    const expandDriverAssignments = expand?.includes('driverAssignments');
    const expandStops = expand?.includes('stops');

    const sortBy = query.get('sortBy') as string;
    const sortDir = (query.get('sortDir') as 'asc' | 'desc') || 'asc';

    const customerId = query.get('customerId') || undefined;
    const driverId = query.get('driverId') || undefined;
    const limit = query.get('limit') ? Number(query.get('limit')) : undefined;
    const offset = query.get('offset') ? Number(query.get('offset')) : undefined;

    const upcomingOnly = query.get('upcomingOnly') === '1';
    let upcomingOnlyWhereClause = {};

    if (upcomingOnly) {
        const start = startOfDay(new Date());
        const end = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);

        upcomingOnlyWhereClause = {
            OR: [
                {
                    AND: [
                        {
                            shipper: {
                                date: {
                                    lte: new Date(),
                                },
                            },
                        },
                        {
                            receiver: {
                                date: {
                                    gte: start,
                                },
                            },
                        },
                    ],
                },
                {
                    shipper: {
                        date: {
                            gte: start,
                            lte: end,
                        },
                    },
                },
            ],
        };
    }

    if (limit != null || offset != null) {
        if (limit == null || offset == null) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Limit and Offset must be set together' }] });
        }

        if (isNaN(limit) || isNaN(offset)) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Invalid limit or offset' }] });
        }
    }

    const total = await prisma.load.count({
        where: {
            carrierId: req.auth.user.defaultCarrierId,
            ...(customerId ? { customerId } : null),
            ...(driverId ? { driverAssignments: { some: { driverId: driverId } } } : null),
            ...upcomingOnlyWhereClause,
        },
    });

    const metadata = calcPaginationMetadata({ total, limit, offset });

    const loads = await prisma.load.findMany({
        where: {
            carrierId: req.auth.user.defaultCarrierId,
            ...(customerId ? { customerId } : null),
            ...(driverId ? { driverAssignments: { some: { driverId: driverId } } } : null),
            ...upcomingOnlyWhereClause,
        },
        orderBy: buildOrderBy(sortBy, sortDir) || {
            createdAt: 'desc',
        },
        ...(limit ? { take: limit } : { take: 10 }),
        ...(offset ? { skip: offset } : { skip: 0 }),
        include: {
            podDocuments: true,
            invoice: {
                select: {
                    id: true,
                    status: true,
                    totalAmount: true,
                    invoiceNum: true,
                    invoicedAt: true,
                    dueDate: true,
                    dueNetDays: true,
                    paidAmount: true,
                    remainingAmount: true,
                    lastPaymentAt: true,
                },
            },
            ...(expandCustomer ? { customer: { select: { id: true, name: true } } } : {}),
            ...(expandShipper
                ? {
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
                              longitude: true,
                              latitude: true,
                              poNumbers: true,
                              pickUpNumbers: true,
                              referenceNumbers: true,
                          },
                      },
                  }
                : {}),
            ...(expandReceiver
                ? {
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
                              longitude: true,
                              latitude: true,
                              poNumbers: true,
                              pickUpNumbers: true,
                              referenceNumbers: true,
                          },
                      },
                  }
                : {}),
            ...(expandDriverAssignments
                ? {
                      driverAssignments: {
                          select: {
                              id: true,
                              assignedAt: true,
                              driver: true,
                              chargeType: true,
                              chargeValue: true,
                              billedDistanceMiles: true,
                              billedDurationHours: true,
                              billedLoadRate: true,
                          },
                      },
                  }
                : {}),
            ...(expandStops
                ? {
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
                              longitude: true,
                              latitude: true,
                              poNumbers: true,
                              pickUpNumbers: true,
                              referenceNumbers: true,
                          },
                      },
                  }
                : {}),
        },
    });

    return NextResponse.json({ code: 200, data: { metadata, loads } });
});

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] });
    }

    try {
        const carrierId = req.auth.user.defaultCarrierId;

        const subscription = await prisma.subscription.findFirst({
            where: {
                carrierId,
            },
        });

        if (!isProPlan(subscription)) {
            const currentLoads = await prisma.load.count({
                where: { carrierId },
            });

            if (currentLoads >= BASIC_PLAN_TOTAL_LOADS) {
                return NextResponse.json({
                    code: 400,
                    errors: [{ message: 'Load limit reached for the Basic Plan.' }],
                });
            }
        }

        const loadData = (await req.json()) as ExpandedLoad;

        // Find duplcate load by same customer and load number
        const findDuplicateLoad = await prisma.load.findFirst({
            where: {
                carrierId,
                loadNum: loadData.loadNum,
                customer: {
                    id: loadData.customer.id,
                },
            },
        });

        if (findDuplicateLoad) {
            return NextResponse.json({
                code: 400,
                errors: [{ message: `Load# ${loadData.loadNum} already exists for ${loadData.customer.name}` }],
            });
        }

        // Generate a new refnum with retry logic to handle concurrent requests
        let load;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            try {
                // Use a transaction to ensure atomic refNum generation
                load = await prisma.$transaction(async (tx) => {
                    // Find the last load created for the carrier
                    const lastLoad = await tx.load.findFirst({
                        where: {
                            carrierId,
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        select: {
                            refNum: true,
                        },
                    });

                    // Extract the numeric part from the last refNum and increment it
                    // If no last load found, start with LD-1
                    const lastLoadNum = lastLoad ? parseInt(lastLoad.refNum.split('LD-')[1], 10) : 0;
                    const nextRefNum = `LD-${lastLoadNum + 1}`;

                    return await tx.load.create({
                        data: {
                            refNum: nextRefNum,
                            loadNum: loadData.loadNum || '',
                            rate: loadData.rate || 0,
                            status: 'CREATED',
                            user: {
                                connect: {
                                    id: req.auth.user.id,
                                },
                            },
                            carrier: {
                                connect: {
                                    id: req.auth.user.defaultCarrierId,
                                },
                            },
                            customer: {
                                connect: {
                                    id: loadData.customer.id,
                                },
                            },
                            shipper: {
                                create: {
                                    type: loadData.shipper.type,
                                    name: loadData.shipper.name,
                                    street: loadData.shipper.street || '',
                                    city: loadData.shipper.city || '',
                                    state: loadData.shipper.state || '',
                                    zip: loadData.shipper.zip || '',
                                    country: loadData.shipper.country || '',
                                    date: loadData.shipper.date || '',
                                    time: loadData.shipper.time || '',
                                    stopIndex: loadData.shipper.stopIndex || 0,
                                    longitude: loadData.shipper.longitude || 0,
                                    latitude: loadData.shipper.latitude || 0,
                                    poNumbers: loadData.shipper.poNumbers || '',
                                    pickUpNumbers: loadData.shipper.pickUpNumbers || '',
                                    referenceNumbers: loadData.shipper.referenceNumbers || '',
                                    user: {
                                        connect: {
                                            id: req.auth.user.id,
                                        },
                                    },
                                },
                            },
                            receiver: {
                                create: {
                                    type: loadData.receiver.type,
                                    name: loadData.receiver.name,
                                    street: loadData.receiver.street || '',
                                    city: loadData.receiver.city || '',
                                    state: loadData.receiver.state || '',
                                    zip: loadData.receiver.zip || '',
                                    country: loadData.receiver.country || '',
                                    date: loadData.receiver.date || '',
                                    time: loadData.receiver.time || '',
                                    stopIndex: loadData.receiver.stopIndex || 0,
                                    longitude: loadData.receiver.longitude || 0,
                                    latitude: loadData.receiver.latitude || 0,
                                    poNumbers: loadData.receiver.poNumbers || '',
                                    pickUpNumbers: loadData.receiver.pickUpNumbers || '',
                                    referenceNumbers: loadData.receiver.referenceNumbers || '',
                                    user: {
                                        connect: {
                                            id: req.auth.user.id,
                                        },
                                    },
                                },
                            },
                            ...(loadData.stops &&
                                loadData.stops.length > 0 && {
                                    stops: {
                                        create: loadData.stops.map((stop) => ({
                                            type: stop.type,
                                            name: stop.name,
                                            street: stop.street || '',
                                            city: stop.city || '',
                                            state: stop.state || '',
                                            zip: stop.zip || '',
                                            country: stop.country || '',
                                            date: stop.date || '',
                                            time: stop.time || '',
                                            stopIndex: stop.stopIndex || 0,
                                            longitude: stop.longitude || 0,
                                            latitude: stop.latitude || 0,
                                            poNumbers: stop.poNumbers || '',
                                            pickUpNumbers: stop.pickUpNumbers || '',
                                            referenceNumbers: stop.referenceNumbers || '',
                                            user: {
                                                connect: {
                                                    id: req.auth.user.id,
                                                },
                                            },
                                        })),
                                    },
                                }),
                            routeEncoded: loadData.routeEncoded || '',
                            routeDistanceMiles: loadData.routeDistanceMiles || 0,
                            routeDurationHours: loadData.routeDurationHours || 0,
                            ...(loadData.rateconDocument
                                ? {
                                      rateconDocument: {
                                          create: {
                                              fileKey: loadData.rateconDocument.fileKey || '',
                                              fileUrl: loadData.rateconDocument.fileUrl || '',
                                              fileName: loadData.rateconDocument.fileName || '',
                                              fileType: loadData.rateconDocument.fileType || '',
                                              fileSize: loadData.rateconDocument.fileSize || 0,
                                              user: {
                                                  connect: {
                                                      id: req.auth.user.id,
                                                  },
                                              },
                                          },
                                      },
                                  }
                                : {}),
                        },
                    });
                });

                // If we reach here, the creation was successful, break out of the retry loop
                break;
            } catch (error) {
                attempts++;

                // If this is a unique constraint violation and we haven't exceeded max attempts, retry
                if (error.code === 'P2002' && error.meta?.target?.includes('refNum') && attempts < maxAttempts) {
                    // console.log(`Retry attempt ${attempts} for refNum generation due to conflict`);
                    // Add a small random delay to reduce chances of repeated conflicts
                    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
                    continue;
                }

                // If it's not a refNum conflict or we've exceeded max attempts, rethrow the error
                throw error;
            }
        }

        return NextResponse.json({ code: 200, data: { load } });
    } catch (error) {
        console.error('load post error', error);
        return NextResponse.json({ code: 400, errors: [{ message: error.message || JSON.stringify(error) }] });
    }
});
