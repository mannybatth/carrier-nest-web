import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { isProPlan } from 'lib/subscription';

const BASIC_PLAN_MAX_DRIVERS = 5;

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;

    try {
        const carrier = await prisma.carrier.findUnique({
            where: { id: session.user.defaultCarrierId },
            include: { subscription: true },
        });

        if (!carrier) {
            return NextResponse.json({ error: 'Carrier not found' }, { status: 404 });
        }

        const activeDriverCount = await prisma.driver.count({
            where: {
                carrierId: session.user.defaultCarrierId,
                active: true,
            },
        });

        console.log(
            `[Subscription Info] Carrier: ${session.user.defaultCarrierId}, Active drivers: ${activeDriverCount}`,
        );

        const maxDrivers =
            isProPlan(carrier.subscription) && carrier.subscription?.numberOfDrivers
                ? carrier.subscription.numberOfDrivers
                : BASIC_PLAN_MAX_DRIVERS;

        const availableSeats = Math.max(0, maxDrivers - activeDriverCount);

        console.log(`[Subscription Info] Max drivers: ${maxDrivers}, Available seats: ${availableSeats}`);

        return NextResponse.json({
            totalSeats: maxDrivers,
            usedSeats: activeDriverCount,
            availableSeats,
            plan: carrier.subscription?.plan || 'BASIC',
            status: carrier.subscription?.status || 'inactive',
        });
    } catch (error) {
        console.error('Error fetching subscription info:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
