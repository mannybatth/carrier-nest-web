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
        const { notificationIds, userId } = body;

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Invalid notification IDs' }] }, { status: 400 });
        }

        // Build where clause - notifications can be user-specific or for all users (userId: null)
        const whereClause = {
            id: { in: notificationIds },
            // Always use OR logic to include both user-specific and general notifications
            OR: [
                { userId: userId || session.user.id },
                { userId: null }, // Include notifications for all users in carrier
            ],
            // Also ensure we're only updating notifications for the correct carrier
            carrierId: session.user.defaultCarrierId,
        };

        // Update notifications in database
        const updateResult = await prisma.notification.updateMany({
            where: whereClause,
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        return NextResponse.json({
            code: 200,
            data: { updatedCount: updateResult.count },
        });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});
