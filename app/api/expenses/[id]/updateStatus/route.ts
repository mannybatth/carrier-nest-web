import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';

// Import the optimized include object
import { EXPENSE_INCLUDE } from 'lib/api/expense-includes';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();

    if (!session?.user?.defaultCarrierId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { status, rejectionReason } = body;

        if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return NextResponse.json(
                {
                    error: 'Invalid status. Must be APPROVED, REJECTED, or PENDING',
                },
                { status: 400 },
            );
        }

        // Check if expense exists and belongs to carrier
        const existingExpense = await prisma.expense.findFirst({
            where: {
                id: params.id,
                carrierId: session.user.defaultCarrierId,
                deletedAt: null,
            },
            select: {
                id: true,
                driverInvoiceId: true,
                approvalStatus: true,
            },
        });

        if (!existingExpense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        // Check if expense is already linked to a driver invoice
        if (existingExpense.driverInvoiceId) {
            return NextResponse.json(
                {
                    error: 'Cannot modify expense that is already linked to a driver invoice',
                    details: {
                        expenseId: params.id,
                        driverInvoiceId: existingExpense.driverInvoiceId,
                    },
                },
                { status: 400 },
            );
        }

        // Prepare update data
        const updateData: any = {
            approvalStatus: status,
            updatedById: session.user.id,
        };

        if (status === 'APPROVED') {
            updateData.approvedById = session.user.id;
            updateData.approvedAt = new Date();
            updateData.rejectionReason = null;
        } else if (status === 'REJECTED') {
            updateData.approvedById = null;
            updateData.approvedAt = null;
            updateData.rejectionReason = rejectionReason || '';
        } else if (status === 'PENDING') {
            // Clear approval data when setting back to pending
            updateData.approvedById = null;
            updateData.approvedAt = null;
            updateData.rejectionReason = null;
        }

        const updatedExpense = await prisma.expense.update({
            where: {
                id: params.id,
                driverInvoiceId: null, // Extra safety - only update non-invoiced expenses
            },
            data: updateData,
            include: EXPENSE_INCLUDE,
        });

        return NextResponse.json(updatedExpense);
    } catch (error) {
        console.error('Error updating expense status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
