export interface AccountingStats {
    totalPaid: number;
    totalUnpaid: number;
    totalOverdue: number;
}

export interface DashboardStats {
    totalLoads: number;
    totalInProgress: number;
    totalReadyToInvoice: number;
    totalRevenue: number;
    totalPaid: number;
}
