import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.defaultCarrierId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { expenseIds } = await request.json();

        if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
            return NextResponse.json({ error: 'Expense IDs are required' }, { status: 400 });
        }

        // Verify all expenses exist and belong to the user's carrier
        const expenses = await prisma.expense.findMany({
            where: {
                id: { in: expenseIds },
                carrierId: session.user.defaultCarrierId,
                deletedAt: null, // Only allow deletion of non-deleted expenses
            },
            select: {
                id: true,
                carrierId: true,
                deletedAt: true,
                driverInvoiceId: true,
            },
        });

        if (expenses.length !== expenseIds.length) {
            const foundIds = expenses.map((e) => e.id);
            const missingIds = expenseIds.filter((id) => !foundIds.includes(id));

            return NextResponse.json(
                {
                    error: 'Some expenses were not found, already deleted, or do not belong to your carrier',
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
                    error: 'Some expenses are already linked to driver invoices and cannot be deleted',
                    details: {
                        invoicedExpenseIds: invoicedExpenses.map((e) => e.id),
                        count: invoicedExpenses.length,
                    },
                },
                { status: 400 },
            );
        }

        // Soft delete expenses by setting deletedAt
        const result = await prisma.expense.updateMany({
            where: {
                id: { in: expenseIds },
                carrierId: session.user.defaultCarrierId,
                deletedAt: null, // Extra safety to only delete non-deleted expenses
                driverInvoiceId: null, // Extra safety - only delete non-invoiced expenses
            },
            data: {
                deletedAt: new Date(),
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({
            message: `Successfully deleted ${result.count} expenses`,
            count: result.count,
        });
    } catch (error) {
        console.error('Error in bulk delete:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
