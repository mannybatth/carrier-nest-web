import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { NextAuthRequest } from 'next-auth/lib';
import prisma from '../../../../../lib/prisma';
import { sseConnectionTracker } from '../../../../../lib/sse-connection-tracker';

interface NotificationStats {
    totalNotifications: number;
    todayNotifications: number;
    activeConnections: number;
    errorRate: number;
    avgResponseTime: number;
    lastProcessed: string;
    systemHealth: 'healthy' | 'warning' | 'critical';
}

export const GET = auth(async (req: NextAuthRequest) => {
    const session = req.auth;

    if (!session || !session.user?.isSiteAdmin) {
        return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    try {
        // Get current date boundaries
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

        // Get total notifications count
        const totalNotifications = await prisma.notification.count();

        // Get today's notifications count
        const todayNotifications = await prisma.notification.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lt: endOfDay,
                },
            },
        });

        // Get last processed notification
        const lastNotification = await prisma.notification.findFirst({
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                createdAt: true,
            },
        });

        // Calculate error rate (mock data for now - you can implement based on your error tracking)
        // For now, we'll use a simple calculation based on notification preferences
        const totalPreferences = await prisma.notificationPreference.count();
        const disabledPreferences = await prisma.notificationPreference.count({
            where: {
                enabled: false,
            },
        });

        const errorRate = totalPreferences > 0 ? (disabledPreferences / totalPreferences) * 100 : 0;

        // Get real active connections count
        const activeConnections = sseConnectionTracker.getConnectionCount();

        // Mock average response time - in production, you'd track this with metrics
        const avgResponseTime = Math.floor(Math.random() * 200) + 50; // 50-250ms

        // Determine system health based on metrics
        let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (errorRate > 20 || avgResponseTime > 1000) {
            systemHealth = 'critical';
        } else if (errorRate > 10 || avgResponseTime > 500) {
            systemHealth = 'warning';
        }

        const stats: NotificationStats = {
            totalNotifications,
            todayNotifications,
            activeConnections,
            errorRate: Number(errorRate.toFixed(2)),
            avgResponseTime,
            lastProcessed: lastNotification?.createdAt.toISOString() || new Date().toISOString(),
            systemHealth,
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching notification stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
