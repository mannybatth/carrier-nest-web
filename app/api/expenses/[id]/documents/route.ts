import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

        const body = await request.json();
        const { fileName, originalFileName, mimeType, sizeBytes, storageUrl } = body;

        // Enhanced validation
        if (!fileName || !mimeType || !sizeBytes || !storageUrl) {
            return NextResponse.json({ error: 'Missing required document data' }, { status: 400 });
        }

        if (sizeBytes > 50 * 1024 * 1024) {
            // 50MB limit
            return NextResponse.json({ error: 'File size exceeds maximum limit (50MB)' }, { status: 400 });
        }

        const allowedMimeTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];

        if (!allowedMimeTypes.includes(mimeType)) {
            return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
        }

        // Use transaction for atomic operation
        const result = await prisma.$transaction(async (tx) => {
            // Create document record
            const document = await tx.document.create({
                data: {
                    fileName: originalFileName || fileName,
                    mimeType,
                    sizeBytes,
                    storageUrl,
                    uploadedBy: session.user.id,
                },
            });

            // Link document to expense
            const expenseDocument = await tx.expenseDocument.create({
                data: {
                    expenseId: params.id,
                    documentId: document.id,
                },
                include: {
                    document: true,
                },
            });

            return expenseDocument;
        });

        return NextResponse.json({
            message: 'Document uploaded successfully',
            ...result,
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
