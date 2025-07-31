// Notification system types and enums
export enum NotificationType {
    ASSIGNMENT_STARTED = 'ASSIGNMENT_STARTED',
    ASSIGNMENT_COMPLETED = 'ASSIGNMENT_COMPLETED',
    DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
    DOCUMENT_DELETED = 'DOCUMENT_DELETED',
    INVOICE_APPROVED = 'INVOICE_APPROVED',
    ASSIGNMENT_UPDATED = 'ASSIGNMENT_UPDATED',
    LOCATION_UPDATE = 'LOCATION_UPDATE',
    STATUS_CHANGE = 'STATUS_CHANGE',

    // Driver Invoice Types
    INVOICE_SUBMITTED = 'INVOICE_SUBMITTED',
    PAYMENT_STATUS_CHANGE = 'PAYMENT_STATUS_CHANGE',
    INVOICE_DISPUTED = 'INVOICE_DISPUTED',
    INVOICE_ATTENTION_REQUIRED = 'INVOICE_ATTENTION_REQUIRED',
    PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
    DEADLINE_APPROACHING = 'DEADLINE_APPROACHING',
    INVOICE_OVERDUE = 'INVOICE_OVERDUE',
}

export enum NotificationPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT',
}

export interface Notification {
    id: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    data?: Record<string, any>;
    carrierId: string;
    userId?: string;
    driverId?: string;
    loadId?: string;
    assignmentId?: string;
    routeLegId?: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    isRead: boolean;
    readAt?: Date;
}

export interface NotificationPreference {
    id: string;
    userId: string;
    carrierId: string;
    type: NotificationType;
    enabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationDelivery {
    id: string;
    notificationId: string;
    channel: 'in_app' | 'email' | 'sms' | 'push';
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    sentAt?: Date;
    deliveredAt?: Date;
    error?: string;
    createdAt: Date;
}
