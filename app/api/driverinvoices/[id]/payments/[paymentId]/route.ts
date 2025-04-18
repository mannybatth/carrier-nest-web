import { DriverInvoiceStatus, Prisma } from '@prisma/client';
import { auth } from 'auth';
import prisma from 'lib/prisma';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

export const DELETE = auth(async (req: NextAuthRequest, context: { params: { id: string; paymentId: string } }) => {
    return deleteDriverPayment(req, context);
});

async function deleteDriverPayment(req: NextAuthRequest, { params }: { params: { id: string; paymentId: string } }) {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        // Extract paymentId from the request body
        const paymentId = params.paymentId;
        const invoiceId = params.id;

        if (!paymentId) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Payment ID is required' }] }, { status: 400 });
        }

        // Get the current user's carrierId
        const carrierId = req.auth.user.defaultCarrierId;

        // Find the payment record including its related invoice
        const payment = await prisma.driverInvoicePayment.findUnique({
            where: { id: paymentId },
            include: { invoice: true },
        });

        if (!payment) {
            return NextResponse.json({ code: 404, errors: [{ message: 'Payment not found' }] }, { status: 404 });
        }

        // Ensure the invoice belongs to the current carrier
        if (payment.invoice.carrierId !== carrierId) {
            return NextResponse.json(
                { code: 403, errors: [{ message: 'Unauthorized to delete this payment' }] },
                { status: 403 },
            );
        }
        // Ensure the payment belongs to the specified invoice
        if (payment.invoice.id !== invoiceId) {
            return NextResponse.json(
                { code: 400, errors: [{ message: 'Payment does not belong to the specified invoice' }] },
                { status: 400 },
            );
        }

        // Use a transaction to delete the payment and update the invoice status
        await prisma.$transaction(async (tx) => {
            // Delete the specified payment record
            await tx.driverInvoicePayment.delete({
                where: { id: paymentId },
            });

            // Recalculate the total paid amount for this invoice
            const aggregate = await tx.driverInvoicePayment.aggregate({
                where: { invoiceId: payment.invoice.id },
                _sum: { amount: true },
            });

            const totalPaid = new Prisma.Decimal(aggregate._sum.amount || 0);

            // Determine the new invoice status
            let newStatus: DriverInvoiceStatus;
            if (totalPaid.isZero()) {
                newStatus = DriverInvoiceStatus.APPROVED;
            } else if (totalPaid.greaterThanOrEqualTo(payment.invoice.totalAmount)) {
                newStatus = DriverInvoiceStatus.PAID;
            } else {
                newStatus = DriverInvoiceStatus.PAID;
            }

            // Update the invoice with the new status
            await tx.driverInvoice.update({
                where: { id: payment.invoice.id },
                data: { status: newStatus },
            });
        });

        return NextResponse.json({ code: 200, data: { message: 'Payment deleted successfully' } });
    } catch (error) {
        console.error('Error deleting invoice payment:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Server error' }] }, { status: 500 });
    }
}
