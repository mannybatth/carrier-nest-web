import { LoadStatus, LoadActivityAction } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const PATCH = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    const tokenCarrierId = req.auth.user?.carrierId || req.auth.user?.defaultCarrierId;
    if (!tokenCarrierId) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    const { status, driverId, longitude, latitude } = (await req.json()) as {
        status: LoadStatus;
        driverId?: string;
        longitude?: number;
        latitude?: number;
    };

    let load;
    let driver;

    if (driverId) {
        const [_load, _driver] = await Promise.all([
            prisma.load.findFirst({
                where: {
                    id: id as string,
                    carrierId: tokenCarrierId,
                    driverAssignments: { some: { driverId: driverId } },
                },
            }),
            prisma.driver.findFirst({
                where: {
                    id: driverId,
                    carrierId: tokenCarrierId,
                },
            }),
        ]);
        load = _load;
        driver = _driver;
    } else {
        load = await prisma.load.findFirst({
            where: {
                id: id as string,
                carrierId: req.auth.user.defaultCarrierId,
            },
        });
    }

    if (!load) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Load not found' }] }, { status: 404 });
    }

    const fromStatus = load.status;
    const toStatus = status;

    const updatedLoad = await prisma.load.update({
        where: { id: id as string },
        data: { status },
    });

    await prisma.loadActivity.create({
        data: {
            load: {
                connect: {
                    id: updatedLoad.id,
                },
            },
            carrierId: updatedLoad.carrierId,
            action: LoadActivityAction.CHANGE_STATUS,
            ...(req.auth ? { actorUser: { connect: { id: req.auth.user.id } } } : {}),
            ...(driverId ? { actorDriver: { connect: { id: driverId } } } : {}),
            ...(driver ? { actorDriverName: driver?.name } : {}),
            fromStatus,
            toStatus,
            ...(longitude ? { longitude } : {}),
            ...(latitude ? { latitude } : {}),
        },
    });

    return NextResponse.json({ code: 200, data: { load: updatedLoad } }, { status: 200 });
});
