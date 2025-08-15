import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';
import { NextAuthRequest } from 'next-auth/lib';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const refNum = searchParams.get('refNum')?.trim();
    const loadNum = searchParams.get('loadNum')?.trim();
    const driverId = searchParams.get('driverId')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 25); // Max 25 results

    if (!refNum && !loadNum) {
        return NextResponse.json({ message: 'Either refNum or loadNum parameter is required' }, { status: 400 });
    }

    // Validate search terms
    const searchTerm = refNum || loadNum;
    if (searchTerm && searchTerm.length < 2) {
        return NextResponse.json({ message: 'Search term must be at least 2 characters' }, { status: 400 });
    }

    try {
        const carrierId = req.auth.user.defaultCarrierId;

        // Build where clause for load lookup
        const whereClause: any = {
            carrierId,
        };

        // Search by refNum or loadNum
        if (refNum) {
            whereClause.refNum = {
                contains: refNum,
                mode: 'insensitive',
            };
        } else if (loadNum) {
            whereClause.loadNum = {
                contains: loadNum,
                mode: 'insensitive',
            };
        }

        // If driverId is provided, filter by driver assignments
        if (driverId) {
            whereClause.driverAssignments = {
                some: {
                    driverId: driverId,
                },
            };
        }

        const loads = await prisma.load.findMany({
            where: whereClause,
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                shipper: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                        state: true,
                        street: true,
                        zip: true,
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                        state: true,
                        street: true,
                        zip: true,
                        date: true,
                    },
                },
                driverAssignments: {
                    include: {
                        driver: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: [{ refNum: 'asc' }, { loadNum: 'asc' }],
            take: limit,
        });

        // Transform the data to include useful information for display
        const transformedLoads = loads.map((load) => ({
            id: load.id,
            refNum: load.refNum,
            loadNum: load.loadNum,
            customer: load.customer,
            shipper: load.shipper
                ? {
                      id: load.shipper.id,
                      name: load.shipper.name,
                      city: load.shipper.city,
                      state: load.shipper.state,
                      street: load.shipper.street,
                      zip: load.shipper.zip,
                  }
                : null,
            receiver: load.receiver
                ? {
                      id: load.receiver.id,
                      name: load.receiver.name,
                      city: load.receiver.city,
                      state: load.receiver.state,
                      street: load.receiver.street,
                      zip: load.receiver.zip,
                      date: load.receiver.date,
                  }
                : null,
            assignedDrivers: load.driverAssignments.map((assignment) => ({
                driverId: assignment.driverId,
                driverName: assignment.driver?.name,
            })),
            hasDriverAssignments: load.driverAssignments.length > 0,
        }));

        return NextResponse.json({
            success: true,
            data: {
                loads: transformedLoads,
                count: transformedLoads.length,
                searchCriteria: {
                    refNum,
                    loadNum,
                    driverId,
                },
            },
        });
    } catch (error) {
        console.error('Error looking up loads:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
});
