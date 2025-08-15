import { Driver } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { Session } from 'next-auth';
import { ExpandedDriver } from 'interfaces/models';
import { isProPlan } from 'lib/subscription';

const BASIC_PLAN_MAX_DRIVERS = 5;

export const GET = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const driverId = context.params.id;
    const expand = req.nextUrl.searchParams.get('expand');

    const response = await getDriver({ session, query: { driverId, expand } });
    return NextResponse.json(response, { status: response.code });
});

export const PUT = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const driverId = context.params.id;

    const driver = await prisma.driver.findFirst({
        where: {
            id: driverId,
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!driver) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Driver not found' }] }, { status: 404 });
    }

    const driverData = (await req.json()) as Driver;

    driverData.phone = driverData.phone?.trim();

    // Check subscription seats when activating a driver
    if (driverData.active === true && !driver.active) {
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

        const maxDrivers =
            isProPlan(carrier.subscription) && carrier.subscription?.numberOfDrivers
                ? carrier.subscription.numberOfDrivers
                : BASIC_PLAN_MAX_DRIVERS;

        if (activeDriverCount >= maxDrivers) {
            return NextResponse.json(
                {
                    error: 'No available seats in your subscription. Please upgrade your plan or deactivate another driver.',
                    code: 'SUBSCRIPTION_LIMIT_REACHED',
                    availableSeats: Math.max(0, maxDrivers - activeDriverCount),
                    totalSeats: maxDrivers,
                },
                { status: 403 },
            );
        }
    }

    if (driverData.phone) {
        const existingDriver = await prisma.driver.findFirst({
            where: {
                phone: driverData.phone,
                carrierId: session.user.defaultCarrierId,
            },
        });

        // If the driver exists, return an error response
        if (existingDriver && existingDriver.id !== driverId) {
            return NextResponse.json(
                {
                    code: 409,
                    errors: [{ message: 'A driver with the given phone number already exists.' }],
                },
                { status: 409 },
            );
        }
    }

    const updatedDriver = await prisma.driver.update({
        where: {
            id: driverId,
        },
        data: {
            ...(driverData.name !== undefined && { name: driverData.name }),
            ...(driverData.email !== undefined && { email: driverData.email || '' }),
            ...(driverData.phone !== undefined && { phone: driverData.phone || '' }),
            ...(driverData.active !== undefined && { active: driverData.active }),
            ...(driverData.type !== undefined && { type: driverData.type }),
            ...(driverData.defaultChargeType !== undefined && {
                defaultChargeType: driverData.defaultChargeType || undefined,
            }),
            ...(driverData.perMileRate !== undefined && { perMileRate: driverData.perMileRate }),
            ...(driverData.perHourRate !== undefined && { perHourRate: driverData.perHourRate }),
            ...(driverData.defaultFixedPay !== undefined && { defaultFixedPay: driverData.defaultFixedPay }),
            ...(driverData.takeHomePercent !== undefined && { takeHomePercent: driverData.takeHomePercent }),
            ...(driverData.baseGuaranteeAmount !== undefined && {
                baseGuaranteeAmount: driverData.baseGuaranteeAmount,
            }),
        },
    });

    // If driver is being deactivated, clear their device records to revoke app access
    if (driverData.active === false) {
        await prisma.device.deleteMany({
            where: {
                driverId: driverId,
            },
        });
    }

    return NextResponse.json({ code: 200, data: { updatedDriver } }, { status: 200 });
});

export const PATCH = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const driverId = context.params.id;

    const driver = await prisma.driver.findFirst({
        where: {
            id: driverId,
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!driver) {
        return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const { active } = await req.json();

    const updatedDriver = await prisma.driver.update({
        where: { id: driverId },
        data: { active },
        include: {
            devices: true,
        },
    });

    // If driver is being deactivated, clear their device records to revoke app access
    if (active === false) {
        await prisma.device.deleteMany({
            where: {
                driverId: driverId,
            },
        });
    }

    // Add hasDriverApp property
    const driverWithAppStatus: ExpandedDriver = {
        ...updatedDriver,
        hasDriverApp: updatedDriver.devices && updatedDriver.devices.length > 0,
    };

    return NextResponse.json(driverWithAppStatus, { status: 200 });
});

export const DELETE = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const driverId = context.params.id;

    const driver = await prisma.driver.findFirst({
        where: {
            id: driverId,
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!driver) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Driver not found' }] }, { status: 404 });
    }

    const assignments = await prisma.driverAssignment.findMany({
        where: {
            driverId: driver.id,
            carrierId: session.user.defaultCarrierId,
            routeLeg: {
                status: { not: 'COMPLETED' },
            },
        },
    });

    if (assignments.length > 0) {
        return NextResponse.json(
            {
                code: 400,
                errors: [
                    { message: 'Driver is assigned to an active route, remove assignment before deleting driver.' },
                ],
            },
            { status: 400 },
        );
    }

    await prisma.driver.delete({
        where: {
            id: driverId,
        },
    });

    return NextResponse.json({ code: 200, data: { result: 'Driver deleted' } }, { status: 200 });
});

const getDriver = async ({
    session,
    query,
}: {
    session: Session;
    query: { driverId: string; expand: string };
}): Promise<{ code: number; data: { driver: ExpandedDriver | null } }> => {
    const expand = query.expand ? String(query.expand).split(',') : [];
    const include = expand.reduce((acc, relation) => {
        if (relation.includes('(')) {
            const [rel, limit] = relation.split('(');
            acc[rel] = {
                take: parseInt(limit.replace(')', ''), 10),
            };
        } else {
            acc[relation] = true;
        }
        return acc;
    }, {});

    // Always include devices to check if driver has app
    include['devices'] = true;

    const driver = await prisma.driver.findFirst({
        where: {
            id: query.driverId,
            carrierId: session.user.defaultCarrierId,
        },
        include,
    });

    if (driver) {
        // Add computed field for app status
        const driverWithDevices = driver as ExpandedDriver;
        const driverWithAppStatus: ExpandedDriver = {
            ...driverWithDevices,
            hasDriverApp: driverWithDevices.devices && driverWithDevices.devices.length > 0,
        };

        return {
            code: 200,
            data: { driver: driverWithAppStatus },
        };
    }

    return {
        code: 200,
        data: { driver },
    };
};
