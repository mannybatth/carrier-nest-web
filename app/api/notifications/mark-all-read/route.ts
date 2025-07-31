import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { NextAuthRequest } from 'next-auth/lib';
import prisma from '../../../../lib/prisma';

export const PATCH = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { userId, carrierId, driverId } = body;

        if (!carrierId) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Carrier ID required' }] }, { status: 400 });
        }

        // If userId is null, check for driverId and get driver info
        let targetUserId = userId || session.user.id;
        let driverName = null;

        if (!userId && driverId) {
            const driver = await prisma.driver.findUnique({
                where: { id: driverId },
                select: { id: true, name: true },
            });

            if (driver) {
                targetUserId = driverId; // Use driverId directly since drivers don't have userId
                driverName = driver.name;
            } else {
                return NextResponse.json({ code: 404, errors: [{ message: 'Driver not found' }] }, { status: 404 });
            }
        }

        // Update all unread notifications in database
        const updateResult = await prisma.notification.updateMany({
            where: {
                carrierId: carrierId,
                OR: [
                    { userId: targetUserId },
                    { userId: null }, // Include notifications for all users in carrier
                ],
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        return NextResponse.json({
            code: 200,
            data: {
                updatedCount: updateResult.count,
                targetUserId,
                driverName,
            },
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});
