import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { EXPENSE_INCLUDE } from 'lib/api/expense-includes';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();

    if (!session?.user?.defaultCarrierId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Optimized single query that includes all related data
        const expense = await prisma.expense.findFirst({
            where: {
                id: params.id,
                carrierId: session.user.defaultCarrierId,
                deletedAt: null,
            },
            include: EXPENSE_INCLUDE,
        });

        if (!expense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        return NextResponse.json(expense);
    } catch (error) {
        console.error('Error fetching expense:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();

    if (!session?.user?.defaultCarrierId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            categoryId,
            amount,
            currencyCode,
            paidBy,
            receiptDate,
            loadId,
            driverId,
            equipmentId,
            street,
            city,
            state,
            postalCode,
            country,
            description,
            vendorName,
        } = body;

        // Check if expense exists and belongs to carrier
        const existingExpense = await prisma.expense.findFirst({
            where: {
                id: params.id,
                carrierId: session.user.defaultCarrierId,
                deletedAt: null,
            },
        });

        if (!existingExpense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        // Prepare update data
        const updateData: any = {
            updatedById: session.user.id,
        };

        if (categoryId !== undefined) updateData.categoryId = categoryId;
        if (amount !== undefined) updateData.amount = new Decimal(amount);
        if (currencyCode !== undefined) updateData.currencyCode = currencyCode;
        if (paidBy !== undefined) updateData.paidBy = paidBy;
        if (receiptDate !== undefined) updateData.receiptDate = receiptDate ? new Date(receiptDate) : null;
        if (loadId !== undefined) updateData.loadId = loadId || null;
        if (driverId !== undefined) updateData.driverId = driverId || null;
        if (equipmentId !== undefined) updateData.equipmentId = equipmentId || null;
        if (street !== undefined) updateData.street = street || null;
        if (city !== undefined) updateData.city = city || null;
        if (state !== undefined) updateData.state = state || null;
        if (postalCode !== undefined) updateData.postalCode = postalCode || null;
        if (country !== undefined) updateData.country = country || null;
        if (description !== undefined) updateData.description = description || null;
        if (vendorName !== undefined) updateData.vendorName = vendorName || null;

        const updatedExpense = await prisma.expense.update({
            where: { id: params.id },
            data: updateData,
            include: EXPENSE_INCLUDE,
        });

        return NextResponse.json(updatedExpense);
    } catch (error) {
        console.error('Error updating expense:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();

    if (!session?.user?.defaultCarrierId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
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
            },
        });

        if (!existingExpense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        // Check if expense is already linked to a driver invoice
        if (existingExpense.driverInvoiceId) {
            return NextResponse.json(
                {
                    error: 'Cannot delete expense that is already linked to a driver invoice',
                    details: {
                        expenseId: params.id,
                        driverInvoiceId: existingExpense.driverInvoiceId,
                    },
                },
                { status: 400 },
            );
        }

        // Soft delete the expense
        await prisma.expense.update({
            where: {
                id: params.id,
                driverInvoiceId: null, // Extra safety - only delete non-invoiced expenses
            },
            data: {
                deletedAt: new Date(),
                updatedById: session.user.id,
            },
        });

        return NextResponse.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
