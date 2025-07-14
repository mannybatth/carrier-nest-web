import { DriverInvoiceStatus } from '@prisma/client';
import { auth } from 'auth';
import prisma from 'lib/prisma';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import { sendDriverInvoiceApprovalNotification } from 'lib/driver-invoice-notifications';

export const POST = auth(async (req: NextAuthRequest, { params }: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const invoiceId = params.id;

    try {
        const carrierId = req.auth.user.defaultCarrierId;

        // Find the invoice and verify that it belongs to the current carrier and is in PENDING status
        const invoice = await prisma.driverInvoice.findFirst({
            where: {
                id: invoiceId,
                carrierId,
                status: DriverInvoiceStatus.PENDING,
            },
            include: {
                driver: {
                    select: {
                        name: true,
                    },
                },
                carrier: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                assignments: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!invoice) {
            return NextResponse.json(
                { code: 404, errors: [{ message: 'Invoice not found, already approved, or unauthorized' }] },
                { status: 404 },
            );
        }

        // Update the invoice status to APPROVED
        const updatedInvoice = await prisma.driverInvoice.update({
            where: { id: invoiceId },
            data: {
                status: DriverInvoiceStatus.APPROVED,
                updatedAt: new Date(),
            },
        });

        // Send email notification to carrier asynchronously
        if (invoice.carrier?.email) {
            setImmediate(async () => {
                try {
                    await sendDriverInvoiceApprovalNotification({
                        carrierName: invoice.carrier.name,
                        carrierEmail: invoice.carrier.email,
                        driverName: invoice.driver.name,
                        invoiceNumber: invoice.invoiceNum.toString(),
                        invoiceAmount: new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                        }).format(Number(invoice.totalAmount)),
                        approvedDate: new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        }),
                        assignmentCount: invoice.assignments.length,
                        fromDate: invoice.fromDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                        }),
                        toDate: invoice.toDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                        }),
                        invoiceId: invoice.id,
                    });
                } catch (emailError) {
                    console.error('Failed to send invoice approval notification:', emailError);
                    // Email failure doesn't affect the API response since it's async
                }
            });
        }

        return NextResponse.json({
            code: 200,
            data: {
                message: 'Invoice approved successfully',
                status: updatedInvoice.status,
            },
        });
    } catch (error) {
        console.error('Error approving invoice:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Server error' }] }, { status: 500 });
    }
});
