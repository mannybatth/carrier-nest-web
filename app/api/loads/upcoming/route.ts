import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const now = new Date();

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const todayDataOnly = req.nextUrl.searchParams.get('todayDataOnly') === 'true';

    try {
        const loads = await prisma.load.findMany({
            where: {
                carrierId: session.user.defaultCarrierId,
                OR: [
                    // Regular today or 14-day logic
                    ...(todayDataOnly
                        ? [
                              {
                                  OR: [
                                      { shipper: { date: { gte: todayStart, lte: todayEnd } } },
                                      { receiver: { date: { gte: todayStart, lte: todayEnd } } },
                                      { stops: { some: { date: { gte: todayStart, lte: todayEnd } } } },
                                  ],
                              },
                          ]
                        : [
                              {
                                  OR: [
                                      {
                                          AND: [
                                              { shipper: { date: { lte: now } } },
                                              { receiver: { date: { gte: todayStart } } },
                                          ],
                                      },
                                      {
                                          shipper: { date: { gte: todayStart, lte: oneWeekLater } },
                                      },
                                  ],
                              },
                          ]),
                    // ADD: Undelivered loads from the past
                    {
                        status: {
                            notIn: ['DELIVERED', 'POD_READY'],
                        },
                        shipper: {
                            date: {
                                lt: todayStart, // strictly before today
                            },
                        },
                    },
                ],
            },
            orderBy: [
                {
                    shipper: {
                        date: 'asc',
                    },
                },
                {
                    receiver: {
                        date: 'asc',
                    },
                },
            ],
            include: {
                customer: true,
                shipper: true,
                receiver: true,
                stops: true,
                podDocuments: true,
                invoice: true,
                driverAssignments: {
                    select: {
                        id: true,
                        assignedAt: true,
                        driver: true,
                    },
                },
            },
        });

        // Sort: push 'delivered' and 'pod_ready' to bottom
        const getStatusPriority = (status: string) => {
            if (status === 'delivered') return 2;
            if (status === 'pod_ready') return 1;
            return 0;
        };

        loads.sort((a, b) => getStatusPriority(a.status) - getStatusPriority(b.status));

        return NextResponse.json({ code: 200, data: loads });
    } catch (error) {
        console.error('[LOAD FETCH ERROR]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
