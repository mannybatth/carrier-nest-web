import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // First, let's check if the document exists and if the user has access to it
        const document = await prisma.document.findUnique({
            where: { id: params.id },
            include: {
                expenseLinks: {
                    include: {
                        expense: {
                            select: {
                                id: true,
                                carrierId: true,
                            },
                        },
                    },
                },
            },
        });

        if (!document) {
            // Let's check if the document exists but with different ID format
            const allDocuments = await prisma.document.findMany({
                where: {
                    id: {
                        contains: params.id.slice(-10), // Check last 10 chars
                    },
                },
                select: { id: true, fileName: true },
            });

            return NextResponse.json(
                {
                    error: 'Document not found',
                    searchedId: params.id,
                    similarDocuments: allDocuments,
                },
                { status: 404 },
            );
        }

        // Check if user has access to any expense that uses this document
        const userCarrierId = session.user?.defaultCarrierId;
        const hasAccess = document.expenseLinks.some((link) => link.expense.carrierId === userCarrierId);

        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // For placeholder storage URLs, return error with helpful message
        if (document.storageUrl.startsWith('placeholder://')) {
            return NextResponse.json(
                {
                    error: 'Document upload failed - file not available in cloud storage',
                    fileName: document.fileName,
                    details:
                        'The document was saved to the database but failed to upload to cloud storage. Please try uploading the document again.',
                },
                { status: 404 },
            );
        }

        // For Google Cloud Storage URLs, fetch and serve the file
        if (document.storageUrl.includes('storage.googleapis.com')) {
            try {
                const fileResponse = await fetch(document.storageUrl);
                if (!fileResponse.ok) {
                    return NextResponse.json({ error: 'Failed to fetch file from storage' }, { status: 404 });
                }

                const fileBlob = await fileResponse.blob();

                return new NextResponse(fileBlob, {
                    headers: {
                        'Content-Type': document.mimeType || 'application/octet-stream',
                        'Content-Disposition': `inline; filename="${document.fileName}"`,
                        'Content-Length': fileBlob.size.toString(),
                    },
                });
            } catch (error) {
                console.error('Error fetching file from storage:', error);
                return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 });
            }
        }

        // For other valid URLs, redirect to them
        try {
            const url = new URL(document.storageUrl);
            return Response.redirect(url.toString());
        } catch {
            return NextResponse.json({ error: 'Invalid storage URL' }, { status: 400 });
        }
    } catch (error) {
        console.error('Document download error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
