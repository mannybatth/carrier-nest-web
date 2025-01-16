import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import startOfDay from 'date-fns/startOfDay';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const start = startOfDay(new Date());
    const end = new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000);

    try {
        const loads = await prisma.load.findMany({
            where: {
                carrierId: session.user.defaultCarrierId,
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

        return NextResponse.json({ code: 200, data: loads });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
