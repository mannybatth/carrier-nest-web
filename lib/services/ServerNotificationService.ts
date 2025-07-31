import prisma from '../prisma';
import { NotificationType, NotificationPriority } from '../../interfaces/notifications';

export interface ServerNotificationData {
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
    invoiceId?: string;
    data?: Record<string, any>;
    expiresAt?: Date;
}

export class ServerNotificationService {
    /**
     * Check if user has enabled notifications for a specific type
     */
    public static async isNotificationEnabled(
        userId: string,
        carrierId: string,
        type: NotificationType,
    ): Promise<boolean> {
        try {
            const preference = await prisma.notificationPreference.findUnique({
                where: {
                    userId_carrierId_type: {
                        userId,
                        carrierId,
                        type,
                    },
                },
                select: { enabled: true },
            });

            const isEnabled = preference ? preference.enabled : true;
            return isEnabled;
        } catch (error) {
            console.error('Error checking notification preference:', error);
            // If there's an error checking preferences, default to enabled
            return true;
        }
    }
    /**
     * Create a new notification directly in the database
     * This is for server-side use in API routes
     */
    static async createNotification(notificationData: ServerNotificationData) {
        try {
            // Prepare data object with invoice ID if provided
            const dataObject = notificationData.data || {};
            if (notificationData.invoiceId) {
                dataObject.invoiceId = notificationData.invoiceId;
            }

            const notification = await prisma.notification.create({
                data: {
                    type: notificationData.type,
                    title: notificationData.title,
                    message: notificationData.message,
                    priority: notificationData.priority || NotificationPriority.MEDIUM,
                    carrierId: notificationData.carrierId,
                    userId: notificationData.userId,
                    driverId: notificationData.driverId,
                    loadId: notificationData.loadId,
                    assignmentId: notificationData.assignmentId,
                    routeLegId: notificationData.routeLegId,
                    data: Object.keys(dataObject).length > 0 ? dataObject : null,
                    expiresAt: notificationData.expiresAt,
                    isRead: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            return notification;
        } catch (error) {
            console.error('Error creating notification in database:', error);
            throw error;
        }
    }

    /**
     * Create driver invoice notification for all users in the carrier who have this notification type enabled
     */
    static async createDriverInvoiceNotification(params: {
        type: NotificationType;
        invoiceId: string;
        carrierId: string;
        driverId: string;
        customData: Record<string, any>;
    }) {
        try {
            // Get all users in this carrier
            const users = await prisma.user.findMany({
                where: {
                    defaultCarrierId: params.carrierId,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            });

            const notifications = [];

            // Create notification for each user who has this notification type enabled
            for (const user of users) {
                const isEnabled = await this.isNotificationEnabled(user.id, params.carrierId, params.type);

                if (isEnabled) {
                    const title = this.getInvoiceNotificationTitle(params.type, params.customData);
                    const message = this.getInvoiceNotificationMessage(params.type, params.customData);
                    const priority = this.getInvoiceNotificationPriority(params.type);

                    const notification = await this.createNotification({
                        type: params.type,
                        title,
                        message,
                        priority,
                        carrierId: params.carrierId,
                        userId: user.id, // This user will receive the notification
                        driverId: params.driverId,
                        invoiceId: params.invoiceId,
                        data: params.customData,
                    });

                    notifications.push(notification);
                } else {
                }
            }

            return notifications;
        } catch (error) {
            console.error('Error creating invoice notifications:', error);
            throw error;
        }
    }

    /**
     * Create assignment notification for all users in the carrier who have this notification type enabled
     */
    static async createAssignmentNotification(params: {
        type: NotificationType;
        assignmentId: string;
        routeLegId: string;
        loadId: string;
        carrierId: string;
        driverId: string;
        customData: Record<string, any>;
    }) {
        try {
            // Get all users in this carrier
            const users = await prisma.user.findMany({
                where: {
                    defaultCarrierId: params.carrierId,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            });

            const notifications = [];

            // Create notification for each user who has this notification type enabled
            for (const user of users) {
                const isEnabled = await this.isNotificationEnabled(user.id, params.carrierId, params.type);

                if (isEnabled) {
                    const title = this.getAssignmentNotificationTitle(params.type, params.customData);
                    const message = this.getAssignmentNotificationMessage(params.type, params.customData);
                    const priority = this.getAssignmentNotificationPriority(params.type);

                    const notification = await this.createNotification({
                        type: params.type,
                        title,
                        message,
                        priority,
                        carrierId: params.carrierId,
                        userId: user.id, // This user will receive the notification
                        driverId: params.driverId,
                        assignmentId: params.assignmentId,
                        routeLegId: params.routeLegId,
                        loadId: params.loadId,
                        data: params.customData,
                    });

                    notifications.push(notification);
                } else {
                }
            }

            return notifications;
        } catch (error) {
            console.error('Error creating assignment notifications:', error);
            throw error;
        }
    }

    /**
     * Create assignment notification specifically for the driver
     */
    static async createDriverAssignmentNotification(params: {
        type: NotificationType;
        assignmentId: string;
        routeLegId: string;
        loadId: string;
        carrierId: string;
        driverId: string;
        customData: Record<string, any>;
    }) {
        // Note: Driver notifications don't use user-based notification preferences
        // since drivers are authenticated via SMS, not user accounts

        const title = this.getDriverAssignmentNotificationTitle(params.type, params.customData);
        const message = this.getDriverAssignmentNotificationMessage(params.type, params.customData);
        const priority = this.getAssignmentNotificationPriority(params.type);

        return await this.createNotification({
            type: params.type,
            title,
            message,
            priority,
            carrierId: params.carrierId,
            // No userId for driver notifications - they're identified by driverId
            driverId: params.driverId,
            assignmentId: params.assignmentId,
            routeLegId: params.routeLegId,
            loadId: params.loadId,
            data: { ...params.customData, forDriver: true },
        });
    }

    private static getInvoiceNotificationTitle(type: NotificationType, data: Record<string, any>): string {
        const invoicePeriod = data.invoicePeriod || data.period || '';
        const periodText = invoicePeriod ? ` (${invoicePeriod})` : '';
        const amount = data.amount ? ` - $${Number(data.amount).toLocaleString()}` : '';

        switch (type) {
            case NotificationType.INVOICE_SUBMITTED:
                return `Invoice #${data.invoiceNum} Submitted${periodText}${amount}`;
            case NotificationType.INVOICE_APPROVED:
                return `Invoice #${data.invoiceNum} Approved${periodText}${amount}`;
            case NotificationType.INVOICE_DISPUTED:
                return `Invoice #${data.invoiceNum} Disputed${periodText}${amount}`;
            case NotificationType.INVOICE_ATTENTION_REQUIRED:
                return `Invoice #${data.invoiceNum} Needs Attention${periodText}${amount}`;
            case NotificationType.INVOICE_OVERDUE:
                return `Invoice #${data.invoiceNum} Overdue${periodText}${amount}`;
            case NotificationType.PAYMENT_PROCESSED:
                return `Payment Processed - Invoice #${data.invoiceNum}${amount}`;
            case NotificationType.PAYMENT_STATUS_CHANGE:
                return `Payment Status Updated - Invoice #${data.invoiceNum}${amount}`;
            default:
                return `Invoice #${data.invoiceNum} Update${periodText}${amount}`;
        }
    }

    private static getInvoiceNotificationMessage(type: NotificationType, data: Record<string, any>): string {
        const amount = data.amount ? `$${Number(data.amount).toLocaleString()}` : '';
        const driverName = data.driverName || 'Driver';
        const invoicePeriod = data.invoicePeriod || data.period || '';
        const assignmentCount = data.assignmentCount || data.assignments?.length || '';
        const periodText = invoicePeriod ? ` for ${invoicePeriod}` : '';
        const assignmentText = assignmentCount
            ? ` covering ${assignmentCount} assignment${assignmentCount !== 1 ? 's' : ''}`
            : '';

        switch (type) {
            case NotificationType.INVOICE_SUBMITTED:
                return `${driverName} has submitted invoice #${data.invoiceNum}${periodText}${assignmentText} totaling ${amount}. Ready for review.`;
            case NotificationType.INVOICE_APPROVED:
                return `Invoice #${data.invoiceNum} from ${driverName}${periodText}${assignmentText} for ${amount} has been approved and scheduled for payment.`;
            case NotificationType.INVOICE_DISPUTED:
                return `Invoice #${
                    data.invoiceNum
                }${periodText}${assignmentText} for ${amount} has been disputed by ${driverName}. Reason: ${
                    data.disputeReason || 'Review required'
                }`;
            case NotificationType.INVOICE_ATTENTION_REQUIRED:
                return `Invoice #${
                    data.invoiceNum
                }${periodText}${assignmentText} for ${amount} requires your immediate attention. ${
                    data.attentionReason || 'Please review and take action.'
                }`;
            case NotificationType.INVOICE_OVERDUE:
                return `Invoice #${
                    data.invoiceNum
                }${periodText}${assignmentText} for ${amount} is overdue. Payment was due ${
                    data.dueDate || 'previously'
                }.`;
            case NotificationType.PAYMENT_PROCESSED:
                return `Payment of ${amount} has been successfully processed for invoice #${data.invoiceNum}${periodText}${assignmentText}. ${driverName} has been notified.`;
            case NotificationType.PAYMENT_STATUS_CHANGE:
                return `Payment status for invoice #${data.invoiceNum}${periodText} (${amount}) changed from ${
                    data.fromStatus || 'previous status'
                } to ${data.toStatus || 'current status'}. ${data.statusReason || ''}`;
            default:
                return `Invoice #${data.invoiceNum}${periodText}${assignmentText} has been updated`;
        }
    }

    private static getInvoiceNotificationPriority(type: NotificationType): NotificationPriority {
        switch (type) {
            case NotificationType.INVOICE_APPROVED:
            case NotificationType.INVOICE_DISPUTED:
            case NotificationType.INVOICE_ATTENTION_REQUIRED:
            case NotificationType.INVOICE_OVERDUE:
            case NotificationType.PAYMENT_PROCESSED:
                return NotificationPriority.HIGH;
            case NotificationType.INVOICE_SUBMITTED:
            case NotificationType.PAYMENT_STATUS_CHANGE:
                return NotificationPriority.MEDIUM;
            default:
                return NotificationPriority.MEDIUM;
        }
    }

    private static getAssignmentNotificationTitle(type: NotificationType, data: Record<string, any>): string {
        const orderNum = data.refNum || data.loadRefNum || 'Unknown';

        switch (type) {
            case NotificationType.ASSIGNMENT_STARTED:
                return `Assignment Started - Order #${orderNum}`;
            case NotificationType.ASSIGNMENT_COMPLETED:
                return `Assignment Completed - Order #${orderNum}`;
            case NotificationType.ASSIGNMENT_UPDATED:
                return `Assignment Updated - Order #${orderNum}`;
            case NotificationType.DOCUMENT_UPLOADED:
                const uploaderType = data.uploadedByType || 'Driver';
                const uploadDocType = data.documentType || 'Document';
                return `${uploadDocType} uploaded by ${uploaderType} on Order #${orderNum}`;
            case NotificationType.DOCUMENT_DELETED:
                const userType = data.deletedByType || 'Admin';
                const deleteDocType = data.documentType || 'Document';
                return `${deleteDocType} deleted by ${userType} on Order #${orderNum}`;
            case NotificationType.LOCATION_UPDATE:
                return `Location Update - Order #${orderNum}`;
            case NotificationType.STATUS_CHANGE:
                const changedBy = data.changedBy ? ` by ${data.changedBy}` : '';
                const changedByType = data.changedByType || 'User';
                // Make title consistent with other assignment notifications
                return `Assignment ${data.toStatus || 'Updated'} - Order #${orderNum}`;
            case NotificationType.DEADLINE_APPROACHING:
                return `Delivery Deadline Approaching - Order #${orderNum}`;
            default:
                return `Assignment Update - Order #${orderNum}`;
        }
    }

    private static getAssignmentNotificationMessage(type: NotificationType, data: Record<string, any>): string {
        const driverName = data.driverName || 'Driver';
        const orderNum = data.refNum || data.loadRefNum || 'Unknown';
        const documentName = data.documentName || data.documentType || 'document';

        switch (type) {
            case NotificationType.ASSIGNMENT_STARTED:
                return `${driverName} has started assignment for order #${orderNum}`;
            case NotificationType.ASSIGNMENT_COMPLETED:
                return `${driverName} has successfully completed assignment for order #${orderNum}`;
            case NotificationType.ASSIGNMENT_UPDATED:
                return `Assignment details updated for order #${orderNum}. Please review the changes.`;
            case NotificationType.DOCUMENT_UPLOADED:
                return `${driverName} uploaded ${data.documentName || documentName} for order #${orderNum}`;
            case NotificationType.DOCUMENT_DELETED:
                return `${data.deletedBy || 'User'} deleted ${documentName} for order #${orderNum}`;
            case NotificationType.LOCATION_UPDATE:
                return `${driverName} location updated for order #${orderNum}`;
            case NotificationType.STATUS_CHANGE:
                const changedBy = data.changedBy || 'User';
                const statusText = data.toStatus?.toLowerCase() || 'updated';
                return `Status set to ${statusText} by ${changedBy} for order #${orderNum}`;
            case NotificationType.DEADLINE_APPROACHING:
                return `Delivery deadline approaching for order #${orderNum}${
                    data.deliveryDate ? ` on ${data.deliveryDate}` : ''
                }`;
            default:
                return `Assignment for order #${orderNum} has been updated`;
        }
    }

    private static getDriverAssignmentNotificationTitle(type: NotificationType, data: Record<string, any>): string {
        const orderNum = data.refNum || data.loadRefNum || 'Unknown';

        switch (type) {
            case NotificationType.ASSIGNMENT_STARTED:
                return `Assignment Started - Order #${orderNum}`;
            case NotificationType.ASSIGNMENT_COMPLETED:
                return `🎉 Great Job! Assignment Completed`;
            case NotificationType.ASSIGNMENT_UPDATED:
                return `📋 Assignment Update - Order #${orderNum}`;
            case NotificationType.DOCUMENT_UPLOADED:
                return `✅ ${data.documentName || data.documentType || 'Document'} Uploaded Successfully`;
            case NotificationType.DOCUMENT_DELETED:
                return `🗑️ ${data.documentName || data.documentType || 'Document'} Removed - Order #${orderNum}`;
            case NotificationType.LOCATION_UPDATE:
                return `📍 Location Updated`;
            case NotificationType.STATUS_CHANGE:
                const changedBy = data.changedBy ? ` by ${data.changedBy}` : '';
                const changedByType = data.changedByType || 'Admin';
                return `🔄 Status Update by ${changedByType} - Order #${orderNum}`;
            case NotificationType.DEADLINE_APPROACHING:
                return `⏰ Delivery Reminder - Order #${orderNum}`;
            default:
                return `Assignment Update - Order #${orderNum}`;
        }
    }

    private static getDriverAssignmentNotificationMessage(type: NotificationType, data: Record<string, any>): string {
        const orderNum = data.refNum || data.loadRefNum || 'Unknown';
        const documentName = data.documentName || data.documentType || 'document';

        switch (type) {
            case NotificationType.ASSIGNMENT_STARTED:
                return `You have successfully started your assignment for order #${orderNum}. Drive safely and keep your status updated!`;
            case NotificationType.ASSIGNMENT_COMPLETED:
                return `Congratulations! You have successfully completed the assignment for order #${orderNum}. Thank you for your excellent work!`;
            case NotificationType.ASSIGNMENT_UPDATED:
                return `Your assignment for order #${orderNum} has been updated. Please check the details and confirm receipt.`;
            case NotificationType.DOCUMENT_UPLOADED:
                return `Your ${documentName} for order #${orderNum} has been uploaded successfully and is being processed.`;
            case NotificationType.DOCUMENT_DELETED:
                return `The ${documentName} for order #${orderNum} has been removed from the system. ${
                    data.reason ? `Reason: ${data.reason}` : 'Please contact dispatch if you have questions.'
                }`;
            case NotificationType.LOCATION_UPDATE:
                return `Your location has been updated for order #${orderNum}. Continue your journey safely.`;
            case NotificationType.STATUS_CHANGE:
                const changedBy = data.changedBy || 'Admin';
                return `Status updated to ${
                    data.toStatus || 'updated'
                } by ${changedBy} for order #${orderNum}. Please review any new requirements.`;
            case NotificationType.DEADLINE_APPROACHING:
                return `Reminder: The delivery deadline for order #${orderNum} is approaching${
                    data.deliveryDate ? ` on ${data.deliveryDate}` : ' soon'
                }. Please ensure timely delivery.`;
            default:
                return `Your assignment for order #${orderNum} has been updated.`;
        }
    }

    private static getAssignmentNotificationPriority(type: NotificationType): NotificationPriority {
        switch (type) {
            case NotificationType.ASSIGNMENT_STARTED:
            case NotificationType.ASSIGNMENT_COMPLETED:
            case NotificationType.DEADLINE_APPROACHING:
                return NotificationPriority.HIGH;
            case NotificationType.ASSIGNMENT_UPDATED:
            case NotificationType.DOCUMENT_UPLOADED:
            case NotificationType.DOCUMENT_DELETED:
            case NotificationType.STATUS_CHANGE:
                return NotificationPriority.MEDIUM;
            case NotificationType.LOCATION_UPDATE:
                return NotificationPriority.LOW;
            default:
                return NotificationPriority.MEDIUM;
        }
    }
}
