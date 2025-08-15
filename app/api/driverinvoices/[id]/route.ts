import { Prisma } from '@prisma/client';
import { auth } from 'auth';
import prisma from 'lib/prisma';
import { NextAuthRequest } from 'next-auth/lib';
import { NextRequest, NextResponse } from 'next/server';
import {
    getClientIP,
    checkRateLimit,
    createRateLimitResponse,
    validateDriverPhone,
    parsePhoneAuthRequest,
    getRateLimitHeaders,
    incrementRateLimit,
} from 'lib/api/phone-auth-utils';

export const GET = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    return getDriverInvoice(req, context);
});

export const PATCH = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    return updateDriverInvoice(req, context);
});

export const DELETE = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    return deleteDriverInvoice(req, context);
});

async function getDriverInvoice(req: NextAuthRequest, { params }: { params: { id: string } }) {
    const invoiceId = params.id;
    const clientIP = getClientIP(req);

    // Check if we have proper authentication
    if (!req.auth) {
        // No authentication, check for driver phone access with rate limiting
        const rateLimit = await checkRateLimit(clientIP);

        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.remaining);
        }

        // Parse request body for driverPhone
        let driverPhone: string | undefined;
        try {
            const body = await req.json();
            driverPhone = body.driverPhone;
        } catch (error) {
            // Not JSON or no body, try query params
            const url = new URL(req.url || '');
            driverPhone = url.searchParams.get('driverPhone') || undefined;
        }

        if (!driverPhone) {
            // Count failed request toward rate limit
            await incrementRateLimit(clientIP);
            return NextResponse.json(
                {
                    code: 401,
                    errors: [{ message: 'Authentication required or provide driverPhone' }],
                },
                {
                    status: 401,
                    headers: getRateLimitHeaders(Math.max(0, rateLimit.remaining - 1)),
                },
            );
        }

        // Attempt to fetch invoice and verify driver phone
        try {
            const invoice = await prisma.driverInvoice.findUnique({
                where: { id: invoiceId },
                include: {
                    driver: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            active: true,
                            baseGuaranteeAmount: true,
                        },
                    },
                    carrier: {
                        select: {
                            id: true,
                            street: true,
                            city: true,
                            state: true,
                            zip: true,
                            phone: true,
                            email: true,
                            name: true,
                            mcNum: true,
                            dotNum: true,
                        },
                    },
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    assignments: {
                        select: {
                            id: true,
                            createdAt: true,
                            updatedAt: true,
                            chargeType: true,
                            chargeValue: true,
                            billedDistanceMiles: true,
                            billedDurationHours: true,
                            billedLoadRate: true,
                            emptyMiles: true,
                            assignedAt: true,
                            load: {
                                select: {
                                    id: true,
                                    refNum: true,
                                    rate: true,
                                    customer: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                            routeLeg: {
                                select: {
                                    id: true,
                                    scheduledDate: true,
                                    scheduledTime: true,
                                    distanceMiles: true,
                                    durationHours: true,
                                    startedAt: true,
                                    endedAt: true,
                                    startLatitude: true,
                                    startLongitude: true,
                                    endLatitude: true,
                                    endLongitude: true,
                                    locations: {
                                        include: {
                                            loadStop: true,
                                            location: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    lineItems: {
                        select: {
                            id: true,
                            description: true,
                            amount: true,
                            createdAt: true,
                        },
                    },
                    payments: {
                        select: {
                            id: true,
                            amount: true,
                            paymentDate: true,
                            notes: true,
                            createdAt: true,
                        },
                    },
                    expenses: {
                        select: {
                            id: true,
                            description: true,
                            amount: true,
                            receiptDate: true,
                            approvalStatus: true,
                            vendorName: true,
                            category: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                            approvedBy: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                            createdAt: true,
                        },
                    },
                },
            });

            if (!invoice) {
                // Count failed request toward rate limit
                await incrementRateLimit(clientIP);
                return NextResponse.json(
                    { code: 404, errors: [{ message: 'Invoice not found' }] },
                    {
                        status: 404,
                        headers: getRateLimitHeaders(Math.max(0, rateLimit.remaining - 1)),
                    },
                );
            }

            // Normalize phone numbers for comparison (remove all non-digits)
            const normalizePhone = (phone: string): string => {
                return phone.replace(/\D/g, '');
            };

            const invoiceDriverPhone = normalizePhone(invoice.driver.phone || '');
            const providedDriverPhone = normalizePhone(driverPhone);

            if (invoiceDriverPhone !== providedDriverPhone) {
                // Count failed request toward rate limit
                await incrementRateLimit(clientIP);
                return NextResponse.json(
                    { code: 403, errors: [{ message: 'Driver phone does not match invoice' }] },
                    {
                        status: 403,
                        headers: getRateLimitHeaders(Math.max(0, rateLimit.remaining - 1)),
                    },
                );
            }

            // Success - return invoice with rate limit headers
            return NextResponse.json(
                { code: 200, data: invoice },
                {
                    headers: getRateLimitHeaders(rateLimit.remaining),
                },
            );
        } catch (error) {
            console.error('Error fetching driver invoice by phone:', error);
            // Count failed request toward rate limit
            await incrementRateLimit(clientIP);
            return NextResponse.json(
                { code: 500, errors: [{ message: 'Failed to fetch invoice' }] },
                {
                    status: 500,
                    headers: getRateLimitHeaders(Math.max(0, rateLimit.remaining - 1)),
                },
            );
        }
    }

    // Standard authenticated access
    const session = req.auth;

    try {
        const invoice = await prisma.driverInvoice.findUnique({
            where: {
                id: invoiceId,
                carrierId: session.user.defaultCarrierId,
            },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        active: true,
                        baseGuaranteeAmount: true,
                    },
                },
                carrier: {
                    select: {
                        id: true,
                        street: true,
                        city: true,
                        state: true,
                        zip: true,
                        phone: true,
                        email: true,
                        name: true,
                        mcNum: true,
                        dotNum: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                assignments: {
                    select: {
                        id: true,
                        createdAt: true,
                        updatedAt: true,
                        chargeType: true,
                        chargeValue: true,
                        billedDistanceMiles: true,
                        billedDurationHours: true,
                        billedLoadRate: true,
                        emptyMiles: true,
                        assignedAt: true,
                        load: {
                            select: {
                                id: true,
                                refNum: true,
                                rate: true,
                                customer: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                        routeLeg: {
                            select: {
                                id: true,
                                scheduledDate: true,
                                scheduledTime: true,
                                distanceMiles: true,
                                durationHours: true,
                                startedAt: true,
                                endedAt: true,
                                startLatitude: true,
                                startLongitude: true,
                                endLatitude: true,
                                endLongitude: true,
                                locations: {
                                    include: {
                                        loadStop: true,
                                        location: true,
                                    },
                                },
                            },
                        },
                    },
                },
                lineItems: {
                    select: {
                        id: true,
                        description: true,
                        amount: true,
                        createdAt: true,
                    },
                },
                expenses: {
                    select: {
                        id: true,
                        amount: true,
                        receiptDate: true,
                        description: true,
                        vendorName: true,
                        approvalStatus: true,
                        paidBy: true,
                        approvedAt: true,
                        category: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        approvedBy: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        paymentDate: true,
                        notes: true,
                        createdAt: true,
                    },
                },
            },
        });

        return NextResponse.json({ code: 200, data: invoice });
    } catch (error) {
        console.error('Error fetching driver invoice:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Failed to fetch invoice' }] });
    }
}

async function updateDriverInvoice(req: NextAuthRequest, { params }: { params: { id: string } }) {
    const invoiceId = params.id;
    const clientIP = getClientIP(req);

    // Check if we have proper authentication
    if (!req.auth) {
        // No authentication, check for driver phone access with rate limiting
        const rateLimit = await checkRateLimit(clientIP);

        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.remaining);
        }

        // Parse request body for phone-based approval
        const { driverPhone, error: parseError } = await parsePhoneAuthRequest(req);
        if (parseError) {
            return parseError;
        }

        if (!driverPhone) {
            await incrementRateLimit(clientIP);
            return NextResponse.json(
                { code: 400, errors: [{ message: 'Driver phone number is required for approval' }] },
                {
                    status: 400,
                    headers: getRateLimitHeaders(Math.max(0, rateLimit.remaining - 1)),
                },
            );
        }

        // Validate driver phone and get invoice
        const { success, invoice, response } = await validateDriverPhone(invoiceId, driverPhone, clientIP, rateLimit);
        if (!success || !invoice) {
            return response!;
        }

        // Parse the full request body for status update
        try {
            const body = await req.json();
            const { status } = body;

            // Only allow status updates for phone-based requests
            if (!status || status !== 'APPROVED') {
                await incrementRateLimit(clientIP);
                return NextResponse.json(
                    { code: 400, errors: [{ message: 'Only invoice approval is allowed' }] },
                    {
                        status: 400,
                        headers: getRateLimitHeaders(Math.max(0, rateLimit.remaining - 1)),
                    },
                );
            }

            // Check if invoice is in PENDING status
            if (invoice.status !== 'PENDING') {
                await incrementRateLimit(clientIP);
                return NextResponse.json(
                    { code: 400, errors: [{ message: 'Invoice is not in pending status' }] },
                    {
                        status: 400,
                        headers: getRateLimitHeaders(Math.max(0, rateLimit.remaining - 1)),
                    },
                );
            }

            // Update invoice status to APPROVED
            const updatedInvoice = await prisma.driverInvoice.update({
                where: { id: invoiceId },
                data: {
                    status: 'APPROVED',
                    updatedAt: new Date(),
                },
            });

            return NextResponse.json(
                {
                    code: 200,
                    data: {
                        message: 'Invoice approved successfully',
                        status: updatedInvoice.status,
                    },
                },
                {
                    headers: getRateLimitHeaders(rateLimit.remaining),
                },
            );
        } catch (error) {
            console.error('Error in phone-based invoice update:', error);
            await incrementRateLimit(clientIP);
            return NextResponse.json(
                { code: 500, errors: [{ message: 'Failed to update invoice' }] },
                {
                    status: 500,
                    headers: getRateLimitHeaders(Math.max(0, rateLimit.remaining - 1)),
                },
            );
        }
    }

    // Authenticated user - proceed with full update functionality
    const session = req.auth;
    const carrierId = session.user.defaultCarrierId;

    try {
        const body = await req.json();
        const {
            id, // required invoice ID to update
            driverId, // new driverId (if updating)
            fromDate,
            toDate,
            status,
            notes,
            invoiceNum, // new invoice number (if updating)
            assignments, // updated array of assignments with new billing details
            lineItems, // updated array of line items
            expenses = [], // updated array of driver expenses
        } = body;

        if (!id) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Invoice ID is required' }] }, { status: 400 });
        }

        // Validate invoice existence and driver existence (if updating driver) in parallel
        const invoice = await prisma.driverInvoice.findUnique({
            where: { id: id, carrierId },
        });

        if (!invoice) {
            return NextResponse.json({ code: 404, errors: [{ message: 'Invoice not found' }] }, { status: 404 });
        }

        if (driverId && driverId !== invoice.driverId) {
            return NextResponse.json(
                { code: 404, errors: [{ message: 'Driver does not match orginal invoice' }] },
                { status: 404 },
            );
        }

        // Check invoice number uniqueness only if a new invoiceNum is provided and differs from the current
        if (invoiceNum && invoiceNum !== invoice.invoiceNum) {
            return NextResponse.json(
                { code: 400, errors: [{ message: 'Invoice number does not match the original invoice' }] },
                { status: 400 },
            );
        }

        // Validate expenses if provided - ensure they're not attached to other invoices
        if (expenses && expenses.length > 0) {
            const expenseIds = expenses.map((e: any) => e.id);
            const existingExpenses = await prisma.expense.findMany({
                where: {
                    id: { in: expenseIds },
                    driverId,
                    carrierId,
                    approvalStatus: 'APPROVED',
                    paidBy: 'DRIVER',
                    OR: [
                        { driverInvoiceId: null }, // Not attached to any invoice
                        { driverInvoiceId: invoice.id }, // Already attached to this invoice (allowing re-selection)
                    ],
                },
                select: { id: true },
            });

            if (existingExpenses.length !== expenseIds.length) {
                return NextResponse.json(
                    {
                        code: 400,
                        errors: [
                            {
                                message:
                                    'One or more expenses are invalid, not approved, not driver-paid, or already attached to another invoice',
                            },
                        ],
                    },
                    { status: 400 },
                );
            }
        }

        // Validate expenses if provided
        if (expenses && expenses.length > 0) {
            const expenseIds = expenses.map((e: any) => e.id);
            const existingExpenses = await prisma.expense.findMany({
                where: {
                    id: { in: expenseIds },
                    driverId,
                    carrierId,
                    approvalStatus: 'APPROVED',
                    paidBy: 'DRIVER', // Ensure only driver-paid expenses
                },
                select: { id: true },
            });

            if (existingExpenses.length !== expenseIds.length) {
                return NextResponse.json(
                    {
                        code: 400,
                        errors: [{ message: 'One or more expenses are invalid, not approved, or not driver-paid' }],
                    },
                    { status: 400 },
                );
            }
        }

        // Prepare base update data for invoice
        const updatedInvoiceData: any = {};
        if (driverId) updatedInvoiceData.driverId = driverId;
        if (fromDate) updatedInvoiceData.fromDate = new Date(fromDate);
        if (toDate) updatedInvoiceData.toDate = new Date(toDate);
        if (notes !== undefined) updatedInvoiceData.notes = notes;
        // Always set status back to PENDING when invoice is updated
        updatedInvoiceData.status = 'PENDING';
        if (invoiceNum) updatedInvoiceData.invoiceNum = invoiceNum;

        // When assignments are provided, we can use the nested write to update the invoice’s connection.
        if (assignments) {
            // Update assignments relation by replacing it with the new set
            updatedInvoiceData.assignments = {
                set: assignments.map((a: any) => ({ id: a.id })),
            };
        }

        // Update the invoice with the new data
        // Note: We are not updating the invoice number here as it is handled in the transaction below
        await prisma.driverInvoice.update({
            where: { id: id },
            data: updatedInvoiceData,
        });

        const updates = assignments.map((assignment: any) => {
            // Helper function to safely convert to Decimal with proper rounding
            const safeDecimal = (value: any): Prisma.Decimal | null => {
                if (
                    value === null ||
                    value === undefined ||
                    value === 'null' ||
                    value === 'undefined' ||
                    value === ''
                ) {
                    return null;
                }
                try {
                    return new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
                } catch (error) {
                    console.warn(`Failed to convert value to Decimal: ${value}`, error);
                    return null;
                }
            };

            const data: Prisma.DriverAssignmentUpdateInput = {
                chargeType: assignment.chargeType,
                chargeValue: new Prisma.Decimal(assignment.chargeValue).toDecimalPlaces(
                    2,
                    Prisma.Decimal.ROUND_HALF_UP,
                ),
            };

            if (assignment.chargeType === 'PER_MILE') {
                // Only set to null if the value is undefined, null, or string representations of null
                data.billedDistanceMiles = safeDecimal(assignment.billedDistanceMiles);
            } else if (assignment.chargeType === 'PER_HOUR') {
                data.billedDurationHours = safeDecimal(assignment.billedDurationHours);
            } else if (assignment.chargeType === 'PERCENTAGE_OF_LOAD') {
                data.billedLoadRate = safeDecimal(assignment.billedLoadRate);
            }

            // Always update emptyMiles if provided
            if (assignment.emptyMiles !== undefined) {
                data.emptyMiles = safeDecimal(assignment.emptyMiles);
            }

            return prisma.driverAssignment.update({
                where: { id: assignment.id },
                data,
            });
        });

        // Execute all assignment updates in a single transaction
        const updatedAssignments = await prisma.$transaction(updates);

        // Calculate the total for the assignments using reduce with proper rounding
        const assignmentTotal = updatedAssignments.reduce((acc, a) => {
            // Check charge type and calculate the total accordingly
            if (!a.chargeValue) return acc;
            if (a.chargeType === 'FIXED_PAY') {
                return acc.add(a.chargeValue);
            }
            if (a.chargeType === 'PERCENTAGE_OF_LOAD') {
                const loadRate = a.billedLoadRate || new Prisma.Decimal(0);
                const percentage = a.chargeValue.div(100);
                const amount = loadRate.mul(percentage).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
                return acc.add(amount);
            }
            if (a.chargeType === 'PER_MILE') {
                // Calculate total miles including empty miles
                const baseMiles = a.billedDistanceMiles || new Prisma.Decimal(0);
                const emptyMiles = a.emptyMiles || new Prisma.Decimal(0);
                const totalMiles = baseMiles.add(emptyMiles);
                const amount = totalMiles.mul(a.chargeValue).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
                return acc.add(amount);
            }
            if (a.chargeType === 'PER_HOUR') {
                const amount = a.billedDurationHours
                    .mul(a.chargeValue)
                    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
                return acc.add(amount);
            }
            // Default case if charge type is not recognized
            return acc;
        }, new Prisma.Decimal(0));

        await prisma.driverInvoiceLineItem.deleteMany({
            where: { invoiceId: id, carrierId },
        });

        // Create line items if provided with proper decimal rounding
        const lineItemCreates = lineItems.map((item: any) =>
            prisma.driverInvoiceLineItem.create({
                data: {
                    invoiceId: invoice.id,
                    driverId,
                    carrierId,
                    amount: new Prisma.Decimal(item.amount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
                    description: item.description,
                    chargeId: item.chargeId || null,
                },
            }),
        );

        const createdLineItems = await prisma.$transaction(lineItemCreates);

        const lineItemsTotal = createdLineItems.reduce((acc, item) => acc.add(item.amount), new Prisma.Decimal(0));

        // Handle driver expenses connection and calculate total
        let expensesTotal = new Prisma.Decimal(0);
        if (expenses && expenses.length > 0) {
            const expenseIds = expenses.map((e: any) => e.id);

            // First, disconnect all previous expenses from this invoice
            await prisma.expense.updateMany({
                where: {
                    driverInvoiceId: invoice.id,
                },
                data: {
                    driverInvoiceId: null,
                },
            });

            // Connect new expenses to the driver invoice
            await prisma.expense.updateMany({
                where: {
                    id: { in: expenseIds },
                    driverId,
                    carrierId,
                    approvalStatus: 'APPROVED',
                    paidBy: 'DRIVER',
                },
                data: {
                    driverInvoiceId: invoice.id,
                },
            });

            // Calculate expenses total with proper financial rounding
            expensesTotal = expenses.reduce((acc: Prisma.Decimal, expense: any) => {
                const expenseAmount = new Prisma.Decimal(expense.amount).toDecimalPlaces(
                    2,
                    Prisma.Decimal.ROUND_HALF_UP,
                );
                return acc.add(expenseAmount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
            }, new Prisma.Decimal(0));
        } else {
            // If no expenses provided, disconnect all previous expenses
            await prisma.expense.updateMany({
                where: {
                    driverInvoiceId: invoice.id,
                },
                data: {
                    driverInvoiceId: null,
                },
            });
        }

        // Calculate total including expenses with proper rounding
        const totalAmount = assignmentTotal
            .add(lineItemsTotal)
            .add(expensesTotal)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        await prisma.driverInvoice.update({
            where: { id: invoice.id },
            data: { totalAmount },
        });

        // If invoiceNum is provided, update the invoice number
        return NextResponse.json({
            code: 200,
            data: { invoiceNum: invoiceNum || invoice.invoiceNum },
        });
    } catch (error) {
        console.error('Error updating driver invoice:', error);
        return NextResponse.json(
            { code: 500, errors: [{ message: error.message || 'Server error' }] },
            { status: 500 },
        );
    }
}

async function deleteDriverInvoice(req: NextAuthRequest, { params }: { params: { id: string } }) {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;

    try {
        // Extract the invoiceId from the request body
        const invoiceId = params.id;

        if (!invoiceId) {
            return NextResponse.json({ code: 400, errors: [{ message: 'Invoice ID is required' }] }, { status: 400 });
        }

        const carrierId = session.user.defaultCarrierId;

        // Retrieve the invoice along with its related assignments
        const invoice = await prisma.driverInvoice.findUnique({
            where: { id: invoiceId },
            include: { assignments: { select: { id: true } } },
        });

        if (!invoice || invoice.carrierId !== carrierId) {
            return NextResponse.json({ code: 404, errors: [{ message: 'Invoice not found' }] }, { status: 404 });
        }

        // Extract assignment IDs from the invoice
        const assignmentIds = invoice.assignments.map((assignment) => assignment.id);

        // Build transaction operations to:
        // 1. Delete all related payments for the invoice.
        // 2. Delete all invoice line items.
        // 3. Disconnect expenses from the invoice.
        // 4. Clear billing fields in associated assignments.
        // 5. Disconnect assignments from the invoice.
        // 6. Delete the invoice record.
        await prisma.$transaction([
            // Delete the payments associated with this invoice
            prisma.driverInvoicePayment.deleteMany({
                where: { invoiceId },
            }),
            // Delete the invoice line items
            prisma.driverInvoiceLineItem.deleteMany({
                where: { invoiceId, carrierId },
            }),
            // Disconnect expenses from the invoice
            prisma.expense.updateMany({
                where: { driverInvoiceId: invoiceId },
                data: { driverInvoiceId: null },
            }),
            // Clear billing fields on related assignments
            prisma.driverAssignment.updateMany({
                where: { id: { in: assignmentIds }, carrierId },
                data: {
                    billedLoadRate: null,
                    billedDistanceMiles: null,
                    billedDurationHours: null,
                    emptyMiles: null, // Clear empty miles as if they were never set
                },
            }),
            // Disconnect any assignments from the invoice
            prisma.driverInvoice.update({
                where: { id: invoiceId },
                data: {
                    assignments: {
                        set: [],
                    },
                },
            }),
            // Delete the invoice itself
            prisma.driverInvoice.delete({
                where: { id: invoiceId },
            }),
        ]);

        return NextResponse.json({ code: 200, data: { message: 'Invoice deleted successfully' } });
    } catch (error) {
        console.error('Error deleting driver invoice:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Server error' }] }, { status: 500 });
    }
}
