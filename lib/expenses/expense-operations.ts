import { ExpandedExpense } from '../../interfaces/models';

export type ExpenseStatus = 'APPROVED' | 'REJECTED' | 'PENDING';

export interface ExpenseStatusUpdateParams {
    expenseId: string;
    status: ExpenseStatus;
    rejectionReason?: string;
}

export interface BulkExpenseStatusUpdateParams {
    expenseIds: string[];
    status: ExpenseStatus;
    rejectionReason?: string;
}

/**
 * Update a single expense status
 */
export const updateExpenseStatus = async (params: ExpenseStatusUpdateParams): Promise<ExpandedExpense> => {
    const { expenseId, status, rejectionReason } = params;

    const requestBody = {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason || '' : undefined,
    };

    const response = await fetch(`/api/expenses/${expenseId}/updateStatus`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        let errorMessage = `Failed to update expense status to ${status.toLowerCase()}`;

        try {
            // Try to parse JSON error response
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
            // If JSON parsing fails, try to get text content
            try {
                const errorText = await response.text();
                if (errorText && !errorText.includes('<!DOCTYPE')) {
                    errorMessage = errorText;
                } else {
                    errorMessage = `Server error (${response.status}): ${response.statusText}`;
                }
            } catch (textError) {
                errorMessage = `Server error (${response.status}): ${response.statusText}`;
            }
        }

        throw new Error(errorMessage);
    }

    return response.json();
};

/**
 * Approve a single expense
 */
export const approveExpense = async (expenseId: string): Promise<ExpandedExpense> => {
    return updateExpenseStatus({
        expenseId,
        status: 'APPROVED',
    });
};

/**
 * Reject a single expense
 */
export const rejectExpense = async (expenseId: string, rejectionReason?: string): Promise<ExpandedExpense> => {
    return updateExpenseStatus({
        expenseId,
        status: 'REJECTED',
        rejectionReason,
    });
};

/**
 * Reset expense status to pending
 */
export const resetExpenseStatus = async (expenseId: string): Promise<ExpandedExpense> => {
    return updateExpenseStatus({
        expenseId,
        status: 'PENDING',
    });
};

/**
 * Bulk update expense statuses
 */
export const bulkUpdateExpenseStatus = async (
    params: BulkExpenseStatusUpdateParams,
): Promise<{ message: string; count: number }> => {
    const { expenseIds, status, rejectionReason } = params;

    const response = await fetch('/api/expenses/bulk-updateStatus', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            expenseIds,
            status,
            rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to bulk update expense statuses to ${status.toLowerCase()}`);
    }

    return response.json();
};

/**
 * Delete a single expense
 */
export const deleteExpense = async (expenseId: string): Promise<void> => {
    const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete expense');
    }
};

/**
 * Get approval/rejection status display information
 */
export const getExpenseStatusInfo = (expense: Partial<ExpandedExpense>) => {
    const status = expense.approvalStatus;
    const approvedBy = expense.approvedBy;
    const approvedAt = expense.approvedAt;
    const rejectionReason = expense.rejectionReason;
    const updatedBy = expense.updatedBy;

    if (status === 'APPROVED') {
        return {
            status: 'APPROVED',
            statusText: 'Approved',
            statusColor: 'green',
            actionBy: approvedBy?.name || 'Unknown',
            actionAt: approvedAt,
            reason: null,
        };
    } else if (status === 'REJECTED') {
        return {
            status: 'REJECTED',
            statusText: 'Rejected',
            statusColor: 'red',
            actionBy: updatedBy?.name || 'Unknown',
            actionAt: expense.updatedAt,
            reason: rejectionReason,
        };
    } else {
        return {
            status: 'PENDING',
            statusText: 'Pending',
            statusColor: 'yellow',
            actionBy: null,
            actionAt: null,
            reason: null,
        };
    }
};
