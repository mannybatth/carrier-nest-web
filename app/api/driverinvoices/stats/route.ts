import { InvoiceStatus, Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { DriverInvoiceStats } from 'interfaces/stats';

export const GET = auth(async (req: NextAuthRequest) => {
    // Ensure user is authenticated
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const carrierId = session.user.defaultCarrierId;
    const now = new Date();

    try {
        // 1. Calculate the total sum of all driver invoices
        const totalInvoiceAgg = await prisma.driverInvoice.aggregate({
            where: { carrierId },
            _sum: { totalAmount: true },
        });
        const totalInvoiceSum = totalInvoiceAgg._sum.totalAmount || new Prisma.Decimal(0);

        // 2. Calculate the total sum of all payments for invoices of this carrier
        const totalPaymentsAgg = await prisma.driverInvoicePayment.aggregate({
            where: { invoice: { carrierId } },
            _sum: { amount: true },
        });
        const totalPayments = totalPaymentsAgg._sum.amount || new Prisma.Decimal(0);

        // Payable balance = total invoice sum - total payments
        const payableBalance = totalInvoiceSum.sub(totalPayments);

        // 3. For Approved Balance:
        //    a. Sum the totalAmount for invoices that have the approved status.
        const approvedInvoiceAgg = await prisma.driverInvoice.aggregate({
            where: { carrierId, status: 'APPROVED' },
            _sum: { totalAmount: true },
        });
        const approvedTotal = approvedInvoiceAgg._sum.totalAmount || new Prisma.Decimal(0);

        //    b. Get all approved invoice IDs.
        const approvedInvoices = await prisma.driverInvoice.findMany({
            where: { carrierId, status: 'APPROVED' },
            select: { id: true },
        });
        const approvedInvoiceIds = approvedInvoices.map((inv) => inv.id);

        //    c. Sum the payments for those approved invoices.
        const approvedPaymentsAgg = await prisma.driverInvoicePayment.aggregate({
            where: { invoiceId: { in: approvedInvoiceIds } },
            _sum: { amount: true },
        });
        const approvedPayments = approvedPaymentsAgg._sum.amount || new Prisma.Decimal(0);

        // Approved balance = sum of approved invoices - payments for approved invoices.
        const approvedBalance = approvedTotal.sub(approvedPayments);

        // 4. Total Paid This Month:
        //    Define the start and end date for the current month.
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const monthlyPaymentsAgg = await prisma.driverInvoicePayment.aggregate({
            where: {
                invoice: { carrierId },
                paymentDate: {
                    gte: firstDayOfMonth,
                    lt: firstDayOfNextMonth,
                },
            },
            _sum: { amount: true },
        });
        const totalPaidThisMonth = monthlyPaymentsAgg._sum.amount || new Prisma.Decimal(0);

        const stats: DriverInvoiceStats = {
            payableBalance: Number(payableBalance),
            approvedBalance: Number(approvedBalance),
            totalPaidThisMonth: Number(totalPaidThisMonth),
        };

        return NextResponse.json({
            code: 200,
            data: { stats },
        });
    } catch (error) {
        console.error('Error calculating driver invoice stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
