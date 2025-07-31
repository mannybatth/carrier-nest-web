import { NotificationType, NotificationPriority } from '../../interfaces/notifications';

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

export class NotificationService {
    private static apiUrl = '/api/notifications';

    /**
     * Create a new notification
     */
    static async createNotification(notificationData: NotificationData) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(notificationData),
            });

            if (!response.ok) {
                throw new Error(`Failed to create notification: ${response.statusText}`);
            }

            return await response.json();
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
        try {
            const searchParams = new URLSearchParams();

            if (params.carrierId) searchParams.set('carrierId', params.carrierId);
            if (params.userId) searchParams.set('userId', params.userId);
            if (params.limit) searchParams.set('limit', params.limit.toString());
            if (params.offset) searchParams.set('offset', params.offset.toString());
            if (params.unreadOnly) searchParams.set('unreadOnly', 'true');
            if (params.types?.length) searchParams.set('types', params.types.join(','));

            const response = await fetch(`${this.apiUrl}?${searchParams.toString()}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch notifications: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }

    /**
     * Mark notification(s) as read
     */
    static async markAsRead(notificationIds: string[], userId?: string) {
        try {
            const response = await fetch(`${this.apiUrl}/mark-read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notificationIds, userId }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[NotificationService] markAsRead error response:', errorText);
                throw new Error(`Failed to mark notifications as read: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            throw error;
        }
    }

    /**
     * Mark all notifications as read for a user
     */
    static async markAllAsRead(userId: string, carrierId: string) {
        try {
            const response = await fetch(`${this.apiUrl}/mark-all-read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, carrierId }),
            });

            if (!response.ok) {
                throw new Error(`Failed to mark all notifications as read: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    /**
     * Get unread count
     */
    static async getUnreadCount(userId?: string, carrierId?: string) {
        try {
            const searchParams = new URLSearchParams();
            if (userId) searchParams.set('userId', userId);
            if (carrierId) searchParams.set('carrierId', carrierId);

            const response = await fetch(`${this.apiUrl}/unread-count?${searchParams.toString()}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch unread count: ${response.statusText}`);
            }

            const data = await response.json();
            return data.count || 0;
        } catch (error) {
            console.error('Error fetching unread count:', error);
            return 0;
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

        const { title, message, priority } = this.generateNotificationContent(type, customData);

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
            data: customData,
        });
    }

    /**
     * Generate notification content based on type and context
     */
    private static generateNotificationContent(type: NotificationType, customData?: Record<string, any>) {
        const driverName = customData?.driverName || 'Driver';
        const loadNum = customData?.loadLoadNum || 'Load';

        switch (type) {
            case NotificationType.ASSIGNMENT_STARTED:
                return {
                    title: 'Assignment Started',
                    message: `${driverName} has started assignment for ${loadNum}`,
                    priority: NotificationPriority.MEDIUM,
                };

            case NotificationType.ASSIGNMENT_COMPLETED:
                return {
                    title: 'Assignment Completed',
                    message: `${driverName} has completed assignment for ${loadNum}`,
                    priority: NotificationPriority.HIGH,
                };

            case NotificationType.DOCUMENT_UPLOADED:
                return {
                    title: 'Document Uploaded',
                    message: `${driverName} uploaded a document for ${loadNum}`,
                    priority: NotificationPriority.MEDIUM,
                };

            case NotificationType.DOCUMENT_DELETED:
                return {
                    title: 'Document Deleted',
                    message: `A document was deleted for ${loadNum}`,
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
                    message: `Assignment for ${loadNum} has been updated`,
                    priority: NotificationPriority.MEDIUM,
                };

            case NotificationType.LOCATION_UPDATE:
                return {
                    title: 'Location Update',
                    message: `${driverName} shared location update for ${loadNum}`,
                    priority: NotificationPriority.LOW,
                };

            case NotificationType.STATUS_CHANGE:
                return {
                    title: 'Status Change',
                    message: `Assignment status changed for ${loadNum}`,
                    priority: NotificationPriority.MEDIUM,
                };

            // Driver Invoice Notification Types
            case NotificationType.INVOICE_SUBMITTED:
                return {
                    title: 'Invoice Submitted',
                    message: `${driverName} submitted invoice ${customData?.invoiceNum || ''}`,
                    priority: NotificationPriority.MEDIUM,
                };

            case NotificationType.PAYMENT_STATUS_CHANGE:
                return {
                    title: 'Payment Status Changed',
                    message: `Payment status changed for invoice ${customData?.invoiceNum || ''}`,
                    priority: NotificationPriority.HIGH,
                };

            case NotificationType.INVOICE_DISPUTED:
                return {
                    title: 'Invoice Disputed',
                    message: `${driverName} disputed invoice ${customData?.invoiceNum || ''}`,
                    priority: NotificationPriority.HIGH,
                };

            case NotificationType.INVOICE_ATTENTION_REQUIRED:
                return {
                    title: 'Invoice Attention Required',
                    message: `Invoice ${customData?.invoiceNum || ''} requires attention`,
                    priority: NotificationPriority.HIGH,
                };

            case NotificationType.PAYMENT_PROCESSED:
                return {
                    title: 'Payment Processed',
                    message: `Payment processed for invoice ${customData?.invoiceNum || ''}`,
                    priority: NotificationPriority.MEDIUM,
                };

            case NotificationType.DEADLINE_APPROACHING:
                return {
                    title: 'Deadline Approaching',
                    message: `Invoice ${customData?.invoiceNum || ''} deadline approaching`,
                    priority: NotificationPriority.HIGH,
                };

            case NotificationType.INVOICE_OVERDUE:
                return {
                    title: 'Invoice Overdue',
                    message: `Invoice ${customData?.invoiceNum || ''} is overdue`,
                    priority: NotificationPriority.URGENT,
                };

            default:
                return {
                    title: 'New Notification',
                    message: `Update for ${loadNum}`,
                    priority: NotificationPriority.MEDIUM,
                };
        }
    }

    /**
     * Create driver invoice-specific notifications
     */
    static async createDriverInvoiceNotification(params: {
        type: NotificationType;
        invoiceId: string;
        carrierId: string;
        driverId: string;
        userId?: string;
        customData?: Record<string, any>;
    }) {
        const { type, invoiceId, carrierId, driverId, userId, customData } = params;

        const { title, message, priority } = this.generateNotificationContent(type, customData);

        return await this.createNotification({
            type,
            title,
            message,
            priority,
            carrierId,
            userId,
            driverId,
            data: {
                ...customData,
                invoiceId,
            },
        });
    }

    /**
     * Subscribe to real-time notifications using polling
     */
    static async subscribeToNotifications(
        carrierId: string,
        userId?: string,
        onNotification?: (notification: any) => void,
        pollingInterval = 30000, // 30 seconds
    ) {
        let lastCheck = new Date();

        const pollForNotifications = async () => {
            try {
                const notifications = await this.getNotifications({
                    carrierId,
                    userId,
                    limit: 10,
                    unreadOnly: true,
                });

                // Filter for new notifications since last check
                const newNotifications =
                    notifications.notifications?.filter((n: any) => new Date(n.createdAt) > lastCheck) || [];

                if (newNotifications.length > 0 && onNotification) {
                    newNotifications.forEach(onNotification);
                }

                lastCheck = new Date();
            } catch (error) {
                console.error('Error polling for notifications:', error);
            }
        };

        // Initial check
        await pollForNotifications();

        // Set up polling interval
        const intervalId = setInterval(pollForNotifications, pollingInterval);

        // Return cleanup function
        return () => clearInterval(intervalId);
    }
}
