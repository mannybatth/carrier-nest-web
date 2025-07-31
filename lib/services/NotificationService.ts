import { NotificationType, NotificationPriority, Notification } from '../../interfaces/notifications';
import prisma from '../prisma';

export interface NotificationData {
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    carrierId: string;
    userId?: string;
    driverId?: string;
    loadId?: string;
    assignmentId?: string;
    routeLegId?: string;
    data?: Record<string, any>;
    expiresAt?: Date;
}

export interface NotificationPreferences {
    type: NotificationType;
    enabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
}

export class NotificationService {
    /**
     * Create a new notification
     */
    static async createNotification(notificationData: NotificationData) {
        try {
            const notification = await prisma.notification.create({
                data: {
                    ...notificationData,
                    priority: notificationData.priority || NotificationPriority.MEDIUM,
                },
                include: {
                    carrier: {
                        select: { id: true, name: true },
                    },
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                    load: {
                        select: { id: true, refNum: true, loadNum: true },
                    },
                },
            });

            // Trigger real-time notification
            await this.broadcastNotification(notification);

            // Queue delivery across different channels
            await this.queueDelivery(notification);

            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Get notifications for a user/carrier
     */
    static async getNotifications(params: {
        userId?: string;
        carrierId: string;
        limit?: number;
        offset?: number;
        unreadOnly?: boolean;
        types?: NotificationType[];
    }) {
        const { userId, carrierId, limit = 50, offset = 0, unreadOnly = false, types } = params;

        const whereClause: any = {
            carrierId,
            ...(userId && { userId }),
            ...(unreadOnly && { isRead: false }),
            ...(types && types.length > 0 && { type: { in: types } }),
            // Only show non-expired notifications
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            // Exclude driver-only notifications by ensuring userId exists
            userId: { not: null },
        };

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: whereClause,
                orderBy: [{ createdAt: 'desc' }, { priority: 'desc' }],
                take: limit,
                skip: offset,
                include: {
                    load: {
                        select: { id: true, refNum: true, loadNum: true },
                    },
                },
            }),
            prisma.notification.count({ where: whereClause }),
        ]);

        // Filter out driver notifications
        const filteredNotifications = notifications.filter((notification) => {
            if (notification.data && typeof notification.data === 'object') {
                const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
                if (data.forDriver === true) {
                    return false;
                }
            }
            return true;
        });

        return {
            notifications: filteredNotifications,
            total: filteredNotifications.length, // Use filtered count
            unreadCount: await this.getUnreadCount(userId, carrierId),
        };
    }

    /**
     * Mark notification(s) as read
     */
    static async markAsRead(notificationIds: string[], userId?: string) {
        const updateData: any = {
            isRead: true,
            readAt: new Date(),
        };

        const whereClause: any = {
            id: { in: notificationIds },
            ...(userId && { userId }),
        };

        return await prisma.notification.updateMany({
            where: whereClause,
            data: updateData,
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    static async markAllAsRead(userId: string, carrierId: string) {
        return await prisma.notification.updateMany({
            where: {
                userId,
                carrierId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    /**
     * Get unread count
     */
    static async getUnreadCount(userId?: string, carrierId?: string) {
        const whereClause: any = {
            isRead: false,
            ...(userId && { userId }),
            ...(carrierId && { carrierId }),
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        };

        return await prisma.notification.count({ where: whereClause });
    }

    /**
     * Clean up expired notifications
     */
    static async cleanupExpiredNotifications() {
        const result = await prisma.notification.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });

        return result;
    }

    /**
     * Broadcast notification to real-time channels
     * This method will be implemented with your chosen real-time solution
     */
    private static async broadcastNotification(notification: any) {
        try {
            // For now, we'll use a simple polling approach
            // This can be replaced with WebSockets, Server-Sent Events, or Pusher later

            // Store in cache/memory for real-time polling
            await this.cacheNotificationForPolling(notification);
        } catch (error) {
            console.error('Error broadcasting notification:', error);
        }
    }

    /**
     * Cache notification for polling-based real-time updates
     */
    private static async cacheNotificationForPolling(notification: any) {
        // This could use Redis, but for simplicity, we'll use a database flag
        // In production, consider using Redis for better performance
        await prisma.notification.update({
            where: { id: notification.id },
            data: {
                data: {
                    ...notification.data,
                    realTimeDelivered: false,
                },
            },
        });
    }

    /**
     * Queue delivery across different channels
     */
    private static async queueDelivery(notification: any) {
        try {
            const deliveries = [];

            // Always create in-app delivery record
            deliveries.push({
                notificationId: notification.id,
                channel: 'in_app',
                status: 'delivered',
                deliveredAt: new Date(),
            });

            if (deliveries.length > 0) {
                await prisma.notificationDelivery.createMany({
                    data: deliveries,
                });
            }
        } catch (error) {
            console.error('Error queuing notification delivery:', error);
        }
    }

    /**
     * Create assignment-specific notifications
     */
    static async createAssignmentNotification(params: {
        type: NotificationType;
        assignmentId: string;
        routeLegId: string;
        loadId: string;
        carrierId: string;
        driverId?: string;
        userId?: string;
        customData?: Record<string, any>;
    }) {
        const { type, assignmentId, routeLegId, loadId, carrierId, driverId, userId, customData } = params;

        // Get assignment details for notification context
        const assignment = await prisma.driverAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                driver: { select: { id: true, name: true } },
                load: { select: { id: true, refNum: true, loadNum: true } },
                routeLeg: {
                    select: {
                        id: true,
                        status: true,
                        scheduledDate: true,
                        locations: {
                            include: {
                                loadStop: { select: { name: true, city: true, state: true } },
                                location: { select: { name: true, city: true, state: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!assignment) return null;

        const { title, message, priority } = this.generateNotificationContent(type, assignment, customData);

        return await this.createNotification({
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
            data: {
                ...customData,
                driverName: assignment.driver.name,
                loadRefNum: assignment.load.refNum,
                loadLoadNum: assignment.load.loadNum,
                routeLegStatus: assignment.routeLeg.status,
            },
        });
    }

    /**
     * Generate notification content based on type and context
     */
    private static generateNotificationContent(
        type: NotificationType,
        assignment: any,
        customData?: Record<string, any>,
    ) {
        const driverName = assignment.driver.name;
        const loadNum = assignment.load.loadNum;
        const refNum = assignment.load.refNum;

        switch (type) {
            case NotificationType.ASSIGNMENT_STARTED:
                return {
                    title: 'Assignment Started',
                    message: `${driverName} has started assignment for Load #${loadNum}`,
                    priority: NotificationPriority.MEDIUM,
                };

            case NotificationType.ASSIGNMENT_COMPLETED:
                return {
                    title: 'Assignment Completed',
                    message: `${driverName} has completed assignment for Load #${loadNum}`,
                    priority: NotificationPriority.HIGH,
                };

            case NotificationType.DOCUMENT_UPLOADED:
                return {
                    title: 'Document Uploaded',
                    message: `${driverName} uploaded a document for Load #${loadNum}`,
                    priority: NotificationPriority.MEDIUM,
                };

            case NotificationType.DOCUMENT_DELETED:
                return {
                    title: 'Document Deleted',
                    message: `A document was deleted for Load #${loadNum}`,
                    priority: NotificationPriority.MEDIUM,
                };

            case NotificationType.INVOICE_APPROVED:
                return {
                    title: 'Invoice Approved',
                    message: `${driverName} approved their invoice`,
                    priority: NotificationPriority.HIGH,
                };

            case NotificationType.ASSIGNMENT_UPDATED:
                return {
                    title: 'Assignment Updated',
                    message: `Assignment for Load #${loadNum} has been updated`,
                    priority: NotificationPriority.MEDIUM,
                };

            case NotificationType.LOCATION_UPDATE:
                return {
                    title: 'Location Update',
                    message: `${driverName} shared location update for Load #${loadNum}`,
                    priority: NotificationPriority.LOW,
                };

            case NotificationType.STATUS_CHANGE:
                return {
                    title: 'Status Change',
                    message: `Assignment status changed for Load #${loadNum}`,
                    priority: NotificationPriority.MEDIUM,
                };

            default:
                return {
                    title: 'New Notification',
                    message: `Update for Load #${loadNum}`,
                    priority: NotificationPriority.MEDIUM,
                };
        }
    }
}
