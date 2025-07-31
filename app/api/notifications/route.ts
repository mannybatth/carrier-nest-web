import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NotificationType, NotificationPriority } from '../../../interfaces/notifications';
import prisma from '../../../lib/prisma';
import { ServerNotificationService } from '../../../lib/services/ServerNotificationService';

export const GET = auth(async (req: NextAuthRequest) => {
    const startTime = performance.now();
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const carrierId = searchParams.get('carrierId') || session.user.defaultCarrierId;
        const userId = searchParams.get('userId') || session.user.id;
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100); // Max 100 notifications per request
        const offset = parseInt(searchParams.get('offset') || '0');
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const types = searchParams.get('types')?.split(',') as NotificationType[] | undefined;
        const since = searchParams.get('since') ? new Date(parseInt(searchParams.get('since')!)) : undefined;

        if (!carrierId) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Carrier ID required' }] }, { status: 400 });
        }

        // Build where clause for database query
        const where: any = {
            carrierId: carrierId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            // Exclude driver-only notifications by ensuring userId exists
            userId: { not: null },
        };

        if (userId) {
            // Only include notifications specifically for this user
            where.userId = userId;
        }

        if (unreadOnly) {
            where.isRead = false;
        }

        if (types && types.length > 0) {
            where.type = { in: types };
        }

        if (since) {
            where.createdAt = { gt: since };
        }

        // Get total count for pagination
        const countStartTime = performance.now();
        const totalCount = await prisma.notification.count({ where });
        const countTime = performance.now();

        // Get notifications from database
        const queryStartTime = performance.now();
        const notifications = await prisma.notification.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { priority: 'desc' }],
            take: limit,
            skip: offset,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        const queryTime = performance.now();

        // PERFORMANCE OPTIMIZATION: Batch fetch all user preferences to avoid N+1 queries
        const prefStartTime = performance.now();
        const userPreferences = userId
            ? await prisma.notificationPreference.findMany({
                  where: {
                      userId: userId,
                      carrierId: carrierId,
                  },
                  select: {
                      type: true,
                      enabled: true,
                  },
              })
            : [];
        const prefTime = performance.now();

        // Create a preference lookup map for O(1) access
        const preferenceMap = new Map<string, boolean>();
        userPreferences.forEach((pref) => {
            preferenceMap.set(pref.type, pref.enabled);
        });

        // Helper function to check if notification is enabled (with preference caching)
        const isNotificationEnabled = (type: NotificationType): boolean => {
            // Check cached preferences first
            if (preferenceMap.has(type)) {
                return preferenceMap.get(type)!;
            }
            // Default to enabled if no preference is set
            return true;
        };

        // Filter notifications based on user preferences and exclude driver notifications
        const filteredNotifications = [];
        const startFilterTime = performance.now();

        for (const notification of notifications) {
            // Exclude driver notifications (they have forDriver: true in their data)
            if (notification.data && typeof notification.data === 'object') {
                const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
                if (data.forDriver === true) {
                    continue;
                }
            }

            // Check user preferences for the notification type (using cached preferences)
            if (isNotificationEnabled(notification.type as NotificationType)) {
                filteredNotifications.push(notification);
            }
        }

        const filterTime = performance.now();

        // Get unread count from filtered notifications
        const filteredUnreadCount = filteredNotifications.filter((n) => !n.isRead).length;

        const totalTime = performance.now();

        return NextResponse.json({
            code: 200,
            data: {
                notifications: filteredNotifications.map((n) => ({
                    ...n,
                    data: n.data ? (typeof n.data === 'string' ? JSON.parse(n.data) : n.data) : null,
                })),
                unreadCount: filteredUnreadCount,
                total: filteredNotifications.length,
                hasMore: offset + filteredNotifications.length < totalCount,
                currentPage: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(totalCount / limit),
                perPage: limit,
            },
        });
    } catch (error) {
        const errorTime = performance.now();
        console.error(`[API Performance] Request failed after ${(errorTime - startTime).toFixed(2)}ms:`, error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});

export const POST = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Unauthorized' }] }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            type,
            title,
            message,
            priority = NotificationPriority.MEDIUM,
            carrierId,
            userId,
            driverId,
            loadId,
            assignmentId,
            routeLegId,
            data,
            expiresAt,
        } = body;

        if (!type || !title || !message || !carrierId) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Missing required fields' }] }, { status: 400 });
        }

        // Create notification in database
        const notification = await prisma.notification.create({
            data: {
                type,
                title,
                message,
                priority,
                carrierId,
                userId,
                driverId,
                loadId,
                assignmentId,
                routeLegId,
                data: data ? JSON.stringify(data) : null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                isRead: false,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({
            code: 201,
            data: {
                ...notification,
                data:
                    notification.data && typeof notification.data === 'string'
                        ? JSON.parse(notification.data)
                        : notification.data,
            },
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});
