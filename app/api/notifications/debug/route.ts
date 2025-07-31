import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { NextAuthRequest } from 'next-auth/lib';
import prisma from '../../../../lib/prisma';

export const GET = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    try {
        const carrierId = session.user.defaultCarrierId;
        const userId = session.user.id;

        // Get all notifications for this carrier
        const allNotifications = await prisma.notification.findMany({
            where: {
                carrierId: carrierId,
            },
            select: {
                id: true,
                title: true,
                message: true,
                isRead: true,
                readAt: true,
                userId: true,
                carrierId: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Get notifications that match the current user
        const userNotifications = await prisma.notification.findMany({
            where: {
                carrierId: carrierId,
                OR: [{ userId: userId }, { userId: null }],
            },
            select: {
                id: true,
                title: true,
                message: true,
                isRead: true,
                readAt: true,
                userId: true,
                carrierId: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({
            code: 200,
            data: {
                session: { userId, carrierId },
                allNotifications,
                userNotifications,
                counts: {
                    total: allNotifications.length,
                    userSpecific: userNotifications.length,
                    unread: userNotifications.filter((n) => !n.isRead).length,
                },
            },
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});
