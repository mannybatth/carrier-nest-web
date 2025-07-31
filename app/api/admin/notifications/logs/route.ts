import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { NextAuthRequest } from 'next-auth/lib';
import prisma from '../../../../../lib/prisma';

interface NotificationLog {
    id: string;
    timestamp: string;
    type: string;
    userContact: string; // Changed from userEmail to userContact to handle both email and phone
    carrierId: string;
    status: 'sent' | 'failed' | 'filtered';
    title: string;
}

export const GET = auth(async (req: NextAuthRequest) => {
    const session = req.auth;

    if (!session || !session.user?.isSiteAdmin) {
        return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500); // Max 500 logs
        const offset = parseInt(searchParams.get('offset') || '0');

        // Get total count for pagination
        const totalCount = await prisma.notification.count();

        // Get recent notifications with detailed info
        const notifications = await prisma.notification.findMany({
            take: limit,
            skip: offset,
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                id: true,
                type: true,
                userId: true,
                driverId: true,
                carrierId: true,
                createdAt: true,
                title: true,
                message: true,
                user: {
                    select: {
                        email: true,
                    },
                },
            },
        });

        // Need to fetch driver information for notifications that have driverId
        const driverIds = notifications
            .filter((n) => n.driverId)
            .map((n) => n.driverId!)
            .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

        const drivers = await prisma.driver.findMany({
            where: {
                id: { in: driverIds },
            },
            select: {
                id: true,
                phone: true,
            },
        });

        const driverMap = new Map(drivers.map((d) => [d.id, d.phone]));

        // Transform notifications into log format with real data only
        const logs: NotificationLog[] = notifications.map((notification) => {
            let userContact = 'Unknown';

            if (notification.driverId) {
                // For driver notifications, use phone
                userContact = driverMap.get(notification.driverId) || 'Unknown Driver';
            } else if (notification.user?.email) {
                // For user notifications, use email
                userContact = notification.user.email;
            }

            return {
                id: notification.id,
                timestamp: notification.createdAt.toISOString(),
                type: notification.type,
                userContact,
                carrierId: notification.carrierId,
                status: 'sent', // Default to sent for real notifications in the system
                title: notification.title || 'No title',
            };
        });

        return NextResponse.json({
            logs,
            total: totalCount,
            limit,
            offset,
            hasMore: offset + limit < totalCount,
        });
    } catch (error) {
        console.error('Error fetching notification logs:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
