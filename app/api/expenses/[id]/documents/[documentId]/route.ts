import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';

export async function DELETE(request: NextRequest, { params }: { params: { id: string; documentId: string } }) {
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
        });

        if (!existingExpense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        // Check if the document link exists for this expense
        const expenseDocument = await prisma.expenseDocument.findFirst({
            where: {
                id: params.documentId,
                expenseId: params.id,
            },
            include: {
                document: true,
            },
        });

        if (!expenseDocument) {
            return NextResponse.json({ error: 'Document not found for this expense' }, { status: 404 });
        }

        // Delete the expense document link
        await prisma.expenseDocument.delete({
            where: {
                id: params.documentId,
            },
        });

        // Optionally delete the document itself if it's not linked to other expenses
        // Check if this document is linked to other expenses
        const otherLinks = await prisma.expenseDocument.findMany({
            where: {
                documentId: expenseDocument.document.id,
            },
        });

        // If no other links exist, delete the document
        if (otherLinks.length === 0) {
            await prisma.document.delete({
                where: {
                    id: expenseDocument.document.id,
                },
            });

            // TODO: Also delete the file from storage service (S3, Google Cloud, etc.)
            // deleteFileFromStorage(expenseDocument.document.storageUrl);
        }

        return NextResponse.json({
            message: 'Document deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
