import { Driver, DriverInvoiceStatus, Prisma } from '@prisma/client';
import { auth } from 'auth';
import prisma from 'lib/prisma';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

// This API route is at /api/driverinvoices/[id]/payments
export const POST = auth(async (req: NextAuthRequest, { params }: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    // Capture the invoice ID from the route parameter
    const invoiceId = params.id;

    try {
        // Extract required fields from the request body
        const { amount, paymentDate, notes } = await req.json();

        if (amount == null || !paymentDate) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [{ message: 'Missing required fields: amount, paymentDate' }],
                },
                { status: 400 },
            );
        }

        const carrierId = req.auth.user.defaultCarrierId;
        // Find the invoice and verify that it belongs to the current carrier
        const invoice = await prisma.driverInvoice.findUnique({ where: { id: invoiceId } });
        if (!invoice || invoice.carrierId !== carrierId) {
            return NextResponse.json(
                { code: 404, errors: [{ message: 'Invoice not found or unauthorized' }] },
                { status: 404 },
            );
        }

        // Use a transaction to create the payment and update the invoice status atomically
        const newPayment = await prisma.$transaction(async (tx) => {
            // Create the invoice payment record
            const payment = await tx.driverInvoicePayment.create({
                data: {
                    invoiceId,
                    amount: Number(amount),
                    paymentDate: new Date(paymentDate),
                    notes: notes || null,
                },
            });

            // Aggregate the total payments made for this invoice
            const aggregate = await tx.driverInvoicePayment.aggregate({
                where: { invoiceId },
                _sum: { amount: true },
            });

            const totalPaid = new Prisma.Decimal(aggregate._sum.amount || 0);
            let newStatus: DriverInvoiceStatus;

            if (totalPaid.greaterThanOrEqualTo(invoice.totalAmount)) {
                newStatus = DriverInvoiceStatus.PAID;
            } else if (totalPaid.isZero()) {
                newStatus = DriverInvoiceStatus.APPROVED;
            } else {
                newStatus = DriverInvoiceStatus.PARTIALLY_PAID;
            }

            // Update the invoice status based on the aggregated payments
            await tx.driverInvoice.update({
                where: { id: invoiceId },
                data: { status: newStatus },
            });

            return payment;
        });

        return NextResponse.json({ code: 200, data: { paymentId: newPayment.id } });
    } catch (error) {
        console.error('Error adding payment:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Server error' }] }, { status: 500 });
    }
});
