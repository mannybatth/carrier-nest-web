import { ServerNotificationService } from '../services/ServerNotificationService';
import { NotificationType } from '../../interfaces/notifications';

export class DriverInvoiceNotificationHelper {
    /**
     * Create notification when driver approves invoice
     */
    static async notifyInvoiceApproved(params: {
        invoiceId: string;
        carrierId: string;
        driverId: string;
        driverName: string;
        invoiceNum: string;
        amount: number;
        approvedAt: Date;
    }) {
        try {
            await ServerNotificationService.createDriverInvoiceNotification({
                type: NotificationType.INVOICE_APPROVED,
                invoiceId: params.invoiceId,
                carrierId: params.carrierId,
                driverId: params.driverId,
                customData: {
                    driverName: params.driverName,
                    invoiceNum: params.invoiceNum,
                    amount: params.amount,
                    approvedAt: params.approvedAt.toISOString(),
                },
            });
        } catch (error) {
            console.error('Error creating invoice approved notification:', error);
        }
    }
}
