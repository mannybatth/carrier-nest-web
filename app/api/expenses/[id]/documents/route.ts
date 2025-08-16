import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';

// Route segment config for handling document operations
export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute should be enough for database operations

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

        // Support two modes: 1) Upload new document data 2) Associate existing document by ID
        if (body.documentId) {
            // Mode 1: Associate existing document by ID
            const { documentId } = body;

            // Check if document exists and is not already associated
            const existingDocument = await prisma.document.findUnique({
                where: { id: documentId },
            });

            if (!existingDocument) {
                return NextResponse.json({ error: 'Document not found' }, { status: 404 });
            }

            // Check if document is already associated with this expense
            const existingAssociation = await prisma.expenseDocument.findFirst({
                where: {
                    expenseId: params.id,
                    documentId: documentId,
                },
            });

            if (existingAssociation) {
                return NextResponse.json({ error: 'Document already associated with this expense' }, { status: 400 });
            }

            // Create the association
            const expenseDocument = await prisma.expenseDocument.create({
                data: {
                    expenseId: params.id,
                    documentId: documentId,
                },
                include: {
                    document: true,
                },
            });

            return NextResponse.json({
                message: 'Document associated successfully',
                ...expenseDocument,
            });
        } else {
            // Mode 2: Create new document from uploaded data
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
        }
    } catch (error) {
        console.error('Error uploading document:', error);

        // Handle specific error types
        if (error.code === 'ECONNRESET' || error.name === 'AbortError') {
            console.log('Client aborted the request');
            return NextResponse.json({ error: 'Upload was cancelled' }, { status: 499 }); // Client Closed Request
        }

        if (error.message?.includes('timeout')) {
            return NextResponse.json(
                { error: 'Upload timeout - please try again with a smaller file' },
                { status: 408 },
            );
        }

        // Generic error for other cases
        const errorMessage = error.message || 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
