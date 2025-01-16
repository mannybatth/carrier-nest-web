import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const POST = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    const tokenCarrierId = session?.user?.carrierId as string;
    const tokenDriverId = session?.user?.driverId as string;

    if (!tokenCarrierId || !tokenDriverId) {
        return NextResponse.json(
            {
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            },
            { status: 401 },
        );
    }

    const { fcmToken } = await req.json();
    const driverId = req.nextUrl.searchParams.get('id') as string;

    if (!fcmToken || !driverId) {
        return NextResponse.json(
            {
                code: 400,
                errors: [{ message: 'FCM token and driver ID are required.' }],
            },
            { status: 400 },
        );
    }

    if (tokenDriverId !== driverId) {
        return NextResponse.json(
            {
                code: 403,
                errors: [{ message: 'Driver ID does not match token credentials.' }],
            },
            { status: 403 },
        );
    }

    try {
        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
        });

        if (!driver || driver.carrierId !== tokenCarrierId) {
            return NextResponse.json(
                {
                    code: 404,
                    errors: [{ message: 'Driver not found under carrier' }],
                },
                { status: 404 },
            );
        }

        const existingDevice = await prisma.device.findUnique({
            where: { fcmToken },
        });

        if (existingDevice) {
            const newExistingDevice = await prisma.device.update({
                where: { fcmToken },
                data: { driverId },
            });

            return NextResponse.json(
                {
                    code: 200,
                    data: newExistingDevice,
                },
                { status: 200 },
            );
        }

        const device = await prisma.device.create({
            data: {
                fcmToken,
                driverId,
            },
        });

        return NextResponse.json(
            {
                code: 200,
                data: device,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error('Request error', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Error creating device' }],
            },
            { status: 500 },
        );
    }
});

export const PATCH = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    const tokenDriverId = session?.user?.driverId;

    if (!tokenDriverId) {
        return NextResponse.json(
            {
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            },
            { status: 401 },
        );
    }

    const { deviceId, newFcmToken } = await req.json();
    const driverId = req.nextUrl.searchParams.get('id') as string;

    if (!deviceId || !newFcmToken || !driverId) {
        return NextResponse.json(
            {
                code: 400,
                errors: [{ message: 'Device ID, new FCM token, and driver ID are required.' }],
            },
            { status: 400 },
        );
    }

    if (driverId !== tokenDriverId) {
        return NextResponse.json(
            {
                code: 403,
                errors: [{ message: 'Driver ID does not match token credentials.' }],
            },
            { status: 403 },
        );
    }

    try {
        const deviceToUpdate = await prisma.device.findUnique({
            where: { id: deviceId },
            include: {
                driver: true,
            },
        });

        if (!deviceToUpdate || deviceToUpdate.driverId !== tokenDriverId) {
            return NextResponse.json(
                {
                    code: 404,
                    errors: [{ message: 'Device not found or not authorized to update this device' }],
                },
                { status: 404 },
            );
        }

        const updatedDevice = await prisma.device.update({
            where: { id: deviceId },
            data: { fcmToken: newFcmToken },
        });

        return NextResponse.json(
            {
                code: 200,
                data: updatedDevice,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error('Request error', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Error updating device' }],
            },
            { status: 500 },
        );
    }
});

export const DELETE = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    const tokenDriverId = session?.user?.driverId;

    const { fcmToken } = await req.json();
    const driverId = req.nextUrl.searchParams.get('id') as string;

    if (!fcmToken || !driverId) {
        return NextResponse.json(
            {
                code: 400,
                errors: [{ message: 'FCM token and driver ID are required.' }],
            },
            { status: 400 },
        );
    }

    if (!tokenDriverId) {
        return NextResponse.json(
            {
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            },
            { status: 401 },
        );
    }

    if (driverId !== tokenDriverId) {
        return NextResponse.json(
            {
                code: 403,
                errors: [{ message: 'Driver ID does not match token credentials.' }],
            },
            { status: 403 },
        );
    }

    try {
        const deviceToDelete = await prisma.device.findUnique({
            where: { fcmToken },
        });

        if (!deviceToDelete || deviceToDelete.driverId !== tokenDriverId) {
            return NextResponse.json(
                {
                    code: 404,
                    errors: [{ message: 'Device not found' }],
                },
                { status: 404 },
            );
        }

        await prisma.device.delete({
            where: { fcmToken },
        });

        return NextResponse.json(
            {
                code: 200,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error('Request error', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Error deleting device' }],
            },
            { status: 500 },
        );
    }
});
