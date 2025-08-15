import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.defaultCarrierId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { expenseIds, status, rejectionReason } = body;

        if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
            return NextResponse.json({ error: 'Expense IDs are required' }, { status: 400 });
        }

        if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return NextResponse.json(
                { error: 'Valid status is required (APPROVED, REJECTED, or PENDING)' },
                { status: 400 },
            );
        }

        // If rejecting, rejection reason is optional
        if (status === 'REJECTED' && rejectionReason) {
            // Only validate if rejection reason is provided
            if (typeof rejectionReason !== 'string') {
                return NextResponse.json({ error: 'Rejection reason must be a string if provided' }, { status: 400 });
            }
        }

        // Verify all expenses exist, belong to the carrier, and have the same status
        const expenses = await prisma.expense.findMany({
            where: {
                id: { in: expenseIds },
                carrierId: session.user.defaultCarrierId,
            },
            select: {
                id: true,
                approvalStatus: true,
                carrierId: true,
                driverInvoiceId: true,
            },
        });

        // Check if all expenses were found
        if (expenses.length !== expenseIds.length) {
            const foundIds = expenses.map((e) => e.id);
            const missingIds = expenseIds.filter((id) => !foundIds.includes(id));

            return NextResponse.json(
                {
                    error: `Some expenses were not found or do not belong to your carrier`,
                    details: {
                        found: expenses.length,
                        requested: expenseIds.length,
                        missingIds,
                    },
                },
                { status: 400 },
            );
        }

        // Check if any expenses are already linked to driver invoices
        const invoicedExpenses = expenses.filter((e) => e.driverInvoiceId);
        if (invoicedExpenses.length > 0) {
            return NextResponse.json(
                {
                    error: 'Some expenses are already linked to driver invoices and cannot be modified',
                    details: {
                        invoicedExpenseIds: invoicedExpenses.map((e) => e.id),
                        count: invoicedExpenses.length,
                    },
                },
                { status: 400 },
            );
        }

        // Check if all expenses have the same approval status
        const statusSet = new Set(expenses.map((e) => e.approvalStatus));
        const uniqueStatuses = Array.from(statusSet);
        if (uniqueStatuses.length > 1) {
            return NextResponse.json(
                {
                    error: 'All selected expenses must have the same approval status',
                    details: {
                        foundStatuses: uniqueStatuses,
                        expenseStatusBreakdown: expenses.map((e) => ({
                            id: e.id,
                            status: e.approvalStatus,
                        })),
                    },
                },
                { status: 400 },
            );
        }

        const currentStatus = uniqueStatuses[0];

        // Prevent setting the same status (no-op operations)
        if (currentStatus === status) {
            return NextResponse.json(
                {
                    error: `Expenses are already ${status.toLowerCase()}`,
                    details: {
                        currentStatus,
                        requestedStatus: status,
                    },
                },
                { status: 400 },
            );
        }

        // Prepare update data based on status
        const updateData: any = {
            approvalStatus: status,
            updatedAt: new Date(),
        };

        if (status === 'APPROVED') {
            updateData.approvedById = session.user.id;
            updateData.approvedAt = new Date();
            // Clear rejection reason when approving
            updateData.rejectionReason = null;
        } else if (status === 'REJECTED') {
            // Only set rejection reason if it's provided and not empty
            if (rejectionReason && rejectionReason.trim()) {
                updateData.rejectionReason = rejectionReason.trim();
            }
            // Clear approval fields when rejecting
            updateData.approvedById = null;
            updateData.approvedAt = null;
        } else if (status === 'PENDING') {
            // Clear all approval/rejection fields when resetting to pending
            updateData.approvedById = null;
            updateData.approvedAt = null;
            updateData.rejectionReason = null;
        }

        // Bulk update expenses
        const result = await prisma.expense.updateMany({
            where: {
                id: { in: expenseIds },
                carrierId: session.user.defaultCarrierId,
                driverInvoiceId: null, // Extra safety - only update non-invoiced expenses
            },
            data: updateData,
        });

        return NextResponse.json({
            message: `Successfully updated status to ${status.toLowerCase()} for ${result.count} expenses`,
            count: result.count,
        });
    } catch (error) {
        console.error('Error in bulk status update:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
