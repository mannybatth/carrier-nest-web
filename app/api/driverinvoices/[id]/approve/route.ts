import { DriverInvoiceStatus } from '@prisma/client';
import { auth } from 'auth';
import prisma from 'lib/prisma';
import { NextAuthRequest } from 'next-auth/lib';
import { NextRequest, NextResponse } from 'next/server';
import { sendDriverInvoiceApprovalNotification } from 'lib/driver-invoice-notifications';
import { DriverInvoiceNotificationHelper } from 'lib/helpers/DriverInvoiceNotificationHelper';
import {
    getClientIP,
    checkRateLimit,
    createRateLimitResponse,
    validateDriverPhone,
    parsePhoneAuthRequest,
    getRateLimitHeaders,
} from 'lib/api/phone-auth-utils';

// Handler for phone-based authentication (drivers)
async function phoneBasedHandler(req: NextRequest, { params }: { params: { id: string } }) {
    const invoiceId = params.id;
    const clientIP = getClientIP(req);

    // Check rate limiting
    const rateLimit = await checkRateLimit(clientIP);
    if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit.remaining);
    }

    // Parse request body
    const { driverPhone, error: parseError } = await parsePhoneAuthRequest(req);
    if (parseError) {
        return parseError;
    }

    if (!driverPhone) {
        return NextResponse.json(
            { code: 400, errors: [{ message: 'Driver phone number is required' }] },
            {
                status: 400,
                headers: getRateLimitHeaders(rateLimit.remaining),
            },
        );
    }

    // Validate driver phone
    const { success, invoice, response } = await validateDriverPhone(invoiceId, driverPhone, clientIP, rateLimit);
    if (!success || !invoice) {
        return response!;
    }

    // Check if invoice is pending
    if (invoice.status !== DriverInvoiceStatus.PENDING) {
        return NextResponse.json(
            { code: 400, errors: [{ message: 'Invoice is not in pending status' }] },
            {
                status: 400,
                headers: getRateLimitHeaders(rateLimit.remaining),
            },
        );
    }

    // Get full invoice with relationships for approval
    const fullInvoice = await prisma.driverInvoice.findUnique({
        where: { id: invoiceId },
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

    if (!fullInvoice) {
        return NextResponse.json(
            { code: 404, errors: [{ message: 'Invoice not found' }] },
            {
                status: 404,
                headers: getRateLimitHeaders(rateLimit.remaining),
            },
        );
    }

    return await approveInvoice(fullInvoice, rateLimit.remaining);
}

// Shared approval logic
async function approveInvoice(invoice: any, rateLimitRemaining?: number) {
    try {
        // Update the invoice status to APPROVED
        const updatedInvoice = await prisma.driverInvoice.update({
            where: { id: invoice.id },
            data: {
                status: DriverInvoiceStatus.APPROVED,
                updatedAt: new Date(),
            },
        });

        // Create in-app notification for invoice approval
        try {
            await DriverInvoiceNotificationHelper.notifyInvoiceApproved({
                invoiceId: invoice.id,
                carrierId: invoice.carrierId,
                driverId: invoice.driverId,
                driverName: invoice.driver.name,
                invoiceNum: invoice.invoiceNum.toString(),
                amount: Number(invoice.totalAmount),
                approvedAt: new Date(),
            });
        } catch (notificationError) {
            console.error('Failed to create invoice approval notification:', notificationError);
            // Notification failure doesn't affect the API response
        }

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

        const headers = rateLimitRemaining !== undefined ? getRateLimitHeaders(rateLimitRemaining) : {};

        return NextResponse.json(
            {
                code: 200,
                data: {
                    message: 'Invoice approved successfully',
                    status: updatedInvoice.status,
                },
            },
            { headers },
        );
    } catch (error) {
        console.error('Error approving invoice:', error);
        const headers = rateLimitRemaining !== undefined ? getRateLimitHeaders(rateLimitRemaining) : {};
        return NextResponse.json({ code: 500, errors: [{ message: 'Server error' }] }, { status: 500, headers });
    }
}

// Main POST handler using auth wrapper that handles both authenticated and phone-based requests
export const POST = auth(async (req: NextAuthRequest, { params }: { params: { id: string } }) => {
    const invoiceId = params.id;
    const clientIP = getClientIP(req);

    // Check if we have proper authentication
    if (!req.auth) {
        // No authentication, use phone-based handler
        return await phoneBasedHandler(req, { params });
    }

    // Authenticated user - proceed with carrier authentication
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

        return await approveInvoice(invoice);
    } catch (error) {
        console.error('Error approving invoice:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Server error' }] }, { status: 500 });
    }
});
