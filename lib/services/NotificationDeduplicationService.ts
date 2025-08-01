import prisma from '../prisma';
import { NotificationType } from '../../interfaces/notifications';

export class NotificationDeduplicationService {
    /**
     * Check if a notification is a true duplicate (same data being sent repeatedly)
     * This prevents bugs like double-form-submissions but allows rapid legitimate changes
     */
    static async isDuplicateNotification(params: {
        type: NotificationType;
        assignmentId: string;
        userId: string;
        customData?: Record<string, any>;
        maxRecentChecks?: number; // Check last N notifications to find exact duplicates
    }): Promise<boolean> {
        const { type, assignmentId, userId, customData, maxRecentChecks = 3 } = params;

        // For STATUS_CHANGE notifications, never consider them duplicates
        // Allow all status changes to create notifications
        if (type === NotificationType.STATUS_CHANGE) {
            return false;
        }

        // For other notification types, check for exact data matches in recent notifications
        const recentNotifications = await prisma.notification.findMany({
            where: {
                type,
                assignmentId,
                userId,
            },
            select: {
                id: true,
                data: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: maxRecentChecks,
        });

        // Check if any recent notification has identical data
        for (const notification of recentNotifications) {
            if (JSON.stringify(notification.data) === JSON.stringify(customData)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Create notification only if it's not an exact duplicate of recent notifications
     * This prevents bugs like double-form-submissions while allowing rapid legitimate changes
     */
    static async createUniqueNotification(notificationData: {
        type: NotificationType;
        title: string;
        message: string;
        priority: any;
        carrierId: string;
        userId: string;
        driverId?: string;
        assignmentId: string;
        routeLegId: string;
        loadId: string;
        data: Record<string, any>;
    }) {
        // Check for exact duplicates in recent notifications (only prevents true duplicates)
        // This allows rapid legitimate changes but prevents bugs like double-form-submissions
        const isDuplicate = await this.isDuplicateNotification({
            type: notificationData.type,
            assignmentId: notificationData.assignmentId,
            userId: notificationData.userId,
            customData: notificationData.data,
            maxRecentChecks: 3, // Only check last 3 notifications for exact duplicates
        });

        if (isDuplicate) {
            return null;
        }

        // Create the notification - allows all legitimate changes, even rapid ones
        try {
            const notification = await prisma.notification.create({
                data: notificationData,
            });

            return notification;
        } catch (error: any) {
            console.error(
                `Error creating notification: ${notificationData.type} for assignment ${notificationData.assignmentId}`,
                error,
            );
            throw error;
        }
    }
}
