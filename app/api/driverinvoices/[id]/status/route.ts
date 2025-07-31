import { DriverInvoiceStatus } from '@prisma/client';
import { auth } from 'auth';
import prisma from 'lib/prisma';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import { DriverInvoiceNotificationHelper } from 'lib/helpers/DriverInvoiceNotificationHelper';

export const POST = auth(async (req: NextAuthRequest, { params }: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    // Capture the invoice ID from the route parameter
    const invoiceId = params.id;

    try {
        // Extract the new status from the request body
        const { status } = await req.json();

        // Validate the provided status
        if (!Object.values(DriverInvoiceStatus).includes(status)) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Invalid status provided' }] }, { status: 400 });
        }

        const carrierId = req.auth.user.defaultCarrierId;
        // Find the invoice and verify that it belongs to the current carrier
        const invoice = await prisma.driverInvoice.findFirst({
            where: { id: invoiceId, status: { in: ['APPROVED', 'PENDING'] } },
            include: {
                driver: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        if (!invoice || invoice.carrierId !== carrierId) {
            return NextResponse.json(
                { code: 404, errors: [{ message: 'Invoice not found or unauthorized' }] },
                { status: 404 },
            );
        }

        // Check if the current status is different from the new one to avoid unnecessary update
        if (invoice.status === status) {
            return NextResponse.json(
                { code: 400, errors: [{ message: 'The invoice is already in the requested status' }] },
                { status: 400 },
            );
        }

        // Store previous status for notification
        const previousStatus = invoice.status;

        // Update the invoice status
        const updatedInvoice = await prisma.driverInvoice.update({
            where: { id: invoiceId },
            data: { status },
        });

        // Create notifications for relevant status changes
        try {
            if (status === DriverInvoiceStatus.APPROVED && previousStatus === DriverInvoiceStatus.PENDING) {
                // Invoice approved notification
                await DriverInvoiceNotificationHelper.notifyInvoiceApproved({
                    invoiceId: invoice.id,
                    carrierId: invoice.carrierId,
                    driverId: invoice.driverId,
                    driverName: invoice.driver.name,
                    invoiceNum: invoice.invoiceNum.toString(),
                    amount: Number(invoice.totalAmount),
                    approvedAt: new Date(),
                });
            } else if (status === DriverInvoiceStatus.PAID || status === DriverInvoiceStatus.PARTIALLY_PAID) {
                // Payment status change notification - removed as per requirements
            }
        } catch (notificationError) {
            console.error('Failed to create status change notification:', notificationError);
            // Notification failure doesn't affect the API response
        }

        return NextResponse.json({
            code: 200,
            data: { message: 'Invoice status updated successfully', status: updatedInvoice.status },
        });
    } catch (error) {
        console.error('Error updating invoice status:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Server error' }] }, { status: 500 });
    }
});
