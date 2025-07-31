import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { NextAuthRequest } from 'next-auth/lib';
import prisma from '../../../../lib/prisma';
import { ServerNotificationService } from '../../../../lib/services/ServerNotificationService';
import { NotificationType } from '../../../../interfaces/notifications';

export const GET = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const carrierId = searchParams.get('carrierId') || session.user.defaultCarrierId;
        const userId = searchParams.get('userId') || session.user.id;

        if (!carrierId) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Carrier ID required' }] }, { status: 400 });
        }

        // Build where clause for database query
        const where: any = {
            carrierId: carrierId,
            isRead: false,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        };

        if (userId) {
            // Only include notifications specifically for this user, not driver notifications
            where.userId = userId;
        }

        // Get all unread notifications first
        const notifications = await prisma.notification.findMany({
            where,
            select: {
                id: true,
                type: true,
                userId: true,
                carrierId: true,
            },
        });

        // Filter notifications based on user preferences
        let unreadCount = 0;
        for (const notification of notifications) {
            const isEnabled = await ServerNotificationService.isNotificationEnabled(
                notification.userId,
                notification.carrierId,
                notification.type as NotificationType,
            );

            if (isEnabled) {
                unreadCount++;
            }
        }

        return NextResponse.json({
            code: 200,
            data: { count: unreadCount },
        });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});
