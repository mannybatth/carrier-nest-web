import { LoadStatus, LoadActivityAction, Load, Driver } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const PATCH = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    const tokenCarrierId = req.auth.user?.carrierId || req.auth.user?.defaultCarrierId;
    if (!tokenCarrierId) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    const loadId = context.params.id;

    const { status, driverId, longitude, latitude } = (await req.json()) as {
        status: LoadStatus;
        driverId?: string;
        longitude?: number;
        latitude?: number;
    };

    let load: Load;
    let driver: Driver;

    if (driverId) {
        const [_load, _driver] = await Promise.all([
            prisma.load.findFirst({
                where: {
                    id: loadId,
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
                id: loadId,
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
        where: { id: loadId },
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
