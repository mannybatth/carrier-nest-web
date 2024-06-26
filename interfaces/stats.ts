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

export enum DashboardStatsTimeFrameType {
    ONE_WEEK = '7',
    TWO_WEEK = '14',
    MONTH = '30',
    YEAR = '364',
    ALL = `3640`,
}
