import { Driver } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { Session } from 'next-auth';

export const GET = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    const id = req.nextUrl.searchParams.get('id');
    const expand = req.nextUrl.searchParams.get('expand');

    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const response = await getDriver({ session, query: { id, expand } });
    return NextResponse.json(response, { status: response.code });
});

export const PUT = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    const id = req.nextUrl.searchParams.get('id');

    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const driver = await prisma.driver.findFirst({
        where: {
            id: String(id),
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!driver) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Driver not found' }] }, { status: 404 });
    }

    const driverData = await req.json();

    const updatedDriver = await prisma.driver.update({
        where: {
            id: String(id),
        },
        data: {
            name: driverData.name,
            email: driverData.email || '',
            phone: driverData.phone || '',
            defaultChargeType: driverData.defaultChargeType || undefined,
            perMileRate: driverData.perMileRate,
            perHourRate: driverData.perHourRate,
            defaultFixedPay: driverData.defaultFixedPay,
            takeHomePercent: driverData.takeHomePercent,
        },
    });

    return NextResponse.json({ code: 200, data: { updatedDriver } }, { status: 200 });
});

export const DELETE = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    const id = req.nextUrl.searchParams.get('id');

    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const driver = await prisma.driver.findFirst({
        where: {
            id: String(id),
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
            id: String(id),
        },
    });

    return NextResponse.json({ code: 200, data: { result: 'Driver deleted' } }, { status: 200 });
});

const getDriver = async ({
    session,
    query,
}: {
    session: Session;
    query: { id: string | null; expand: string | null };
}): Promise<{ code: number; data: { driver: Driver | null } }> => {
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

    const driver = await prisma.driver.findFirst({
        where: {
            id: String(query.id),
            carrierId: session.user.defaultCarrierId,
        },
        include,
    });
    return {
        code: 200,
        data: { driver },
    };
};
