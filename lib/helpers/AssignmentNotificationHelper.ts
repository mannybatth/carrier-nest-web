import { ServerNotificationService } from '../services/ServerNotificationService';
import { NotificationType } from '../../interfaces/notifications';

export class AssignmentNotificationHelper {
    /**
     * Create notification when driver starts assignment
     */
    static async notifyAssignmentStarted(params: {
        assignmentId: string;
        routeLegId: string;
        loadId: string;
        carrierId: string;
        driverId: string;
        driverName: string;
        loadNum: string;
    }) {
        try {
            // Notification to company/admin users
            await ServerNotificationService.createAssignmentNotification({
                type: NotificationType.ASSIGNMENT_STARTED,
                assignmentId: params.assignmentId,
                routeLegId: params.routeLegId,
                loadId: params.loadId,
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    refNum: params.loadNum, // Use loadNum as refNum for order number
                    loadRefNum: params.loadNum, // Keep both for compatibility
                    loadLoadNum: params.loadNum,
                    action: 'started',
                },
            });

            // Notification specifically for the driver
            await ServerNotificationService.createDriverAssignmentNotification({
                type: NotificationType.ASSIGNMENT_STARTED,
                assignmentId: params.assignmentId,
                routeLegId: params.routeLegId,
                loadId: params.loadId,
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    refNum: params.loadNum, // Use loadNum as refNum for order number
                    loadRefNum: params.loadNum, // Keep both for compatibility
                    loadLoadNum: params.loadNum,
                    action: 'started',
                    forDriver: true,
                },
            });
        } catch (error) {
            console.error('Error creating assignment started notification:', error);
        }
    }

    /**
     * Create notification when driver completes assignment
     */
    static async notifyAssignmentCompleted(params: {
        assignmentId: string;
        routeLegId: string;
        loadId: string;
        carrierId: string;
        driverId: string;
        driverName: string;
        loadNum: string;
    }) {
        try {
            // Notification to company/admin users
            await ServerNotificationService.createAssignmentNotification({
                type: NotificationType.ASSIGNMENT_COMPLETED,
                assignmentId: params.assignmentId,
                routeLegId: params.routeLegId,
                loadId: params.loadId,
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    refNum: params.loadNum, // Use loadNum as refNum for order number
                    loadRefNum: params.loadNum, // Keep both for compatibility
                    loadLoadNum: params.loadNum,
                    action: 'completed',
                },
            });

            // Notification specifically for the driver
            await ServerNotificationService.createDriverAssignmentNotification({
                type: NotificationType.ASSIGNMENT_COMPLETED,
                assignmentId: params.assignmentId,
                routeLegId: params.routeLegId,
                loadId: params.loadId,
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    refNum: params.loadNum, // Use loadNum as refNum for order number
                    loadRefNum: params.loadNum, // Keep both for compatibility
                    loadLoadNum: params.loadNum,
                    action: 'completed',
                    forDriver: true,
                },
            });
        } catch (error) {
            console.error('Error creating assignment completed notification:', error);
        }
    }

    /**
     * Create notification when assignment is updated
     */
    static async notifyAssignmentUpdated(params: {
        assignmentId: string;
        routeLegId: string;
        loadId: string;
        carrierId: string;
        driverId?: string;
        driverName?: string;
        loadNum: string;
        updateType: string;
    }) {
        try {
            await ServerNotificationService.createAssignmentNotification({
                type: NotificationType.ASSIGNMENT_UPDATED,
                assignmentId: params.assignmentId,
                routeLegId: params.routeLegId,
                loadId: params.loadId,
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    refNum: params.loadNum, // Use loadNum as refNum for order number
                    loadRefNum: params.loadNum, // Keep both for compatibility
                    loadLoadNum: params.loadNum,
                    updateType: params.updateType,
                },
            });
        } catch (error) {
            console.error('Error creating assignment updated notification:', error);
        }
    }

    /**
     * Create notification when driver uploads document
     */
    static async notifyDocumentUploaded(params: {
        assignmentId: string;
        routeLegId: string;
        loadId: string;
        carrierId: string;
        driverId: string;
        driverName: string;
        loadNum: string;
        documentType: string;
        documentName?: string;
        uploadedByType?: string;
    }) {
        try {
            // Notification to all company/admin users in the carrier who have this notification enabled
            await ServerNotificationService.createAssignmentNotification({
                type: NotificationType.DOCUMENT_UPLOADED,
                assignmentId: params.assignmentId,
                routeLegId: params.routeLegId,
                loadId: params.loadId,
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    refNum: params.loadNum,
                    documentType: params.documentType,
                    documentName: params.documentName,
                    uploadedByType: params.uploadedByType,
                },
            });

            // Notification specifically for the driver
            await ServerNotificationService.createDriverAssignmentNotification({
                type: NotificationType.DOCUMENT_UPLOADED,
                assignmentId: params.assignmentId,
                routeLegId: params.routeLegId,
                loadId: params.loadId,
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    refNum: params.loadNum,
                    documentType: params.documentType,
                    documentName: params.documentName,
                    uploadedByType: params.uploadedByType,
                    forDriver: true,
                },
            });
        } catch (error) {
            console.error('Error creating document uploaded notification:', error);
        }
    }

    /**
     * Create notification when document is deleted
     */
    static async notifyDocumentDeleted(params: {
        assignmentId: string;
        routeLegId: string;
        loadId: string;
        carrierId: string;
        driverId?: string;
        driverName?: string;
        loadNum: string;
        documentType: string;
        documentName?: string;
        deletedBy: string;
        deletedByType?: string;
        reason?: string;
    }) {
        try {
            // Notification to all company/admin users in the carrier who have this notification enabled
            await ServerNotificationService.createAssignmentNotification({
                type: NotificationType.DOCUMENT_DELETED,
                assignmentId: params.assignmentId,
                routeLegId: params.routeLegId,
                loadId: params.loadId,
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    refNum: params.loadNum,
                    documentType: params.documentType,
                    documentName: params.documentName,
                    deletedBy: params.deletedBy,
                    deletedByType: params.deletedByType,
                    reason: params.reason,
                },
            });

            // Notification specifically for the driver (if this is a driver assignment)
            // Only send driver notification if someone else (not the driver) deleted the document
            if (params.driverId && params.deletedByType !== 'Driver') {
                await ServerNotificationService.createDriverAssignmentNotification({
                    type: NotificationType.DOCUMENT_DELETED,
                    assignmentId: params.assignmentId,
                    routeLegId: params.routeLegId,
                    loadId: params.loadId,
                    carrierId: params.carrierId,
                    driverId: params.driverId,
                    customData: {
                        driverName: params.driverName,
                        refNum: params.loadNum,
                        documentType: params.documentType,
                        documentName: params.documentName,
                        deletedBy: params.deletedBy,
                        deletedByType: params.deletedByType,
                        reason: params.reason,
                        forDriver: true,
                    },
                });
            }
        } catch (error) {
            console.error('Error creating document deleted notification:', error);
        }
    }

    /**
     * Create notification to remind driver about assignment requirements
     */
    static async notifyDriverAssignmentReminder(params: {
        assignmentId: string;
        routeLegId: string;
        loadId: string;
        carrierId: string;
        driverId: string;
        driverName: string;
        loadNum: string;
        reminderType: 'document_required' | 'status_update' | 'delivery_approaching' | 'check_in_required';
        additionalInfo?: string;
    }) {
        try {
            const notificationType =
                params.reminderType === 'delivery_approaching'
                    ? NotificationType.DEADLINE_APPROACHING
                    : NotificationType.ASSIGNMENT_UPDATED;

            await ServerNotificationService.createDriverAssignmentNotification({
                type: notificationType,
                assignmentId: params.assignmentId,
                routeLegId: params.routeLegId,
                loadId: params.loadId,
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    refNum: params.loadNum, // Use loadNum as refNum for order number
                    loadRefNum: params.loadNum, // Keep both for compatibility
                    loadLoadNum: params.loadNum,
                    reminderType: params.reminderType,
                    additionalInfo: params.additionalInfo,
                    forDriver: true,
                },
            });
        } catch (error) {
            console.error('Error creating driver assignment reminder:', error);
        }
    }

    /**
     * Create notification when driver shares location
     */
    static async notifyLocationUpdate(params: {
        assignmentId: string;
        routeLegId: string;
        loadId: string;
        carrierId: string;
        driverId: string;
        driverName: string;
        loadNum: string;
        latitude: number;
        longitude: number;
    }) {
        try {
            await ServerNotificationService.createAssignmentNotification({
                type: NotificationType.LOCATION_UPDATE,
                assignmentId: params.assignmentId,
                routeLegId: params.routeLegId,
                loadId: params.loadId,
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    refNum: params.loadNum, // Use loadNum as refNum for order number
                    loadRefNum: params.loadNum, // Keep both for compatibility
                    loadLoadNum: params.loadNum,
                    latitude: params.latitude,
                    longitude: params.longitude,
                },
            });
        } catch (error) {
            console.error('Error creating location update notification:', error);
        }
    }

    /**
     * Create notification when driver approves invoice
     */
    static async notifyInvoiceApproved(params: {
        assignmentId?: string;
        routeLegId?: string;
        loadId?: string;
        carrierId: string;
        driverId: string;
        driverName: string;
        invoiceNum: string;
        amount: number;
    }) {
        try {
            await ServerNotificationService.createAssignmentNotification({
                type: NotificationType.INVOICE_APPROVED,
                assignmentId: params.assignmentId || '',
                routeLegId: params.routeLegId || '',
                loadId: params.loadId || '',
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    invoiceNum: params.invoiceNum,
                    amount: params.amount,
                },
            });
        } catch (error) {
            console.error('Error creating invoice approved notification:', error);
        }
    }

    /**
     * Create notification when assignment status changes
     */
    static async notifyStatusChange(params: {
        assignmentId: string;
        routeLegId: string;
        loadId: string;
        carrierId: string;
        driverId?: string;
        driverName?: string;
        loadNum: string;
        fromStatus: string;
        toStatus: string;
        changedBy?: string; // Name of the user/driver who changed the status
        changedByType?: string; // Type of user who changed the status (e.g., 'Driver', 'Admin', 'Dispatcher')
    }) {
        try {
            await ServerNotificationService.createAssignmentNotification({
                type: NotificationType.STATUS_CHANGE,
                assignmentId: params.assignmentId,
                routeLegId: params.routeLegId,
                loadId: params.loadId,
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    refNum: params.loadNum, // Use loadNum as refNum for order number
                    loadRefNum: params.loadNum, // Keep both for compatibility
                    loadLoadNum: params.loadNum,
                    fromStatus: params.fromStatus,
                    toStatus: params.toStatus,
                    changedBy: params.changedBy, // Who changed the status
                    changedByType: params.changedByType, // Type of user who changed the status
                },
            });
        } catch (error) {
            console.error('Error creating status change notification:', error);
        }
    }
}
