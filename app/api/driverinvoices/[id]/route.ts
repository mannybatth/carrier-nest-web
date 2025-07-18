import { Prisma } from '@prisma/client';
import { auth } from 'auth';
import prisma from 'lib/prisma';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

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
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const session = req.auth;
    const invoiceId = params.id;

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
            },
        });

        return NextResponse.json({ code: 200, data: invoice });
    } catch (error) {
        console.error('Error fetching driver invoice:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Failed to fetch invoice' }] });
    }
}

async function updateDriverInvoice(req: NextAuthRequest, { params }: { params: { id: string } }) {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

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
            const data: Prisma.DriverAssignmentUpdateInput = {
                chargeType: assignment.chargeType,
                chargeValue: new Prisma.Decimal(assignment.chargeValue),
            };

            if (assignment.chargeType === 'PER_MILE') {
                // Only set to null if the value is undefined (not 0 or empty string)
                data.billedDistanceMiles =
                    assignment.billedDistanceMiles === undefined
                        ? null
                        : new Prisma.Decimal(assignment.billedDistanceMiles);
            } else if (assignment.chargeType === 'PER_HOUR') {
                data.billedDurationHours =
                    assignment.billedDurationHours === undefined
                        ? null
                        : new Prisma.Decimal(assignment.billedDurationHours);
            } else if (assignment.chargeType === 'PERCENTAGE_OF_LOAD') {
                data.billedLoadRate =
                    assignment.billedLoadRate === undefined ? null : new Prisma.Decimal(assignment.billedLoadRate);
            }

            // Always update emptyMiles if provided
            if (assignment.emptyMiles !== undefined) {
                data.emptyMiles = assignment.emptyMiles === null ? null : new Prisma.Decimal(assignment.emptyMiles);
            }

            return prisma.driverAssignment.update({
                where: { id: assignment.id },
                data,
            });
        });

        // Execute all assignment updates in a single transaction
        const updatedAssignments = await prisma.$transaction(updates);

        // Calculate the total for the assignments using reduce
        const assignmentTotal = updatedAssignments.reduce((acc, a) => {
            // Check charge type and calculate the total accordingly
            if (!a.chargeValue) return acc;
            if (a.chargeType === 'FIXED_PAY') {
                return acc.add(a.chargeValue);
            }
            if (a.chargeType === 'PERCENTAGE_OF_LOAD') {
                const loadRate = a.billedLoadRate || new Prisma.Decimal(0);
                const percentage = a.chargeValue.div(100);
                return acc.add(loadRate.mul(percentage));
            }
            if (a.chargeType === 'PER_MILE') {
                // Calculate total miles including empty miles
                const baseMiles = a.billedDistanceMiles || new Prisma.Decimal(0);
                const emptyMiles = a.emptyMiles || new Prisma.Decimal(0);
                const totalMiles = baseMiles.add(emptyMiles);
                return acc.add(totalMiles.mul(a.chargeValue));
            }
            if (a.chargeType === 'PER_HOUR') {
                return acc.add(a.billedDurationHours.mul(a.chargeValue));
            }
            // Default case if charge type is not recognized
            return acc;
        }, new Prisma.Decimal(0));

        await prisma.driverInvoiceLineItem.deleteMany({
            where: { invoiceId: id, carrierId },
        });

        // Create line items if provided
        const lineItemCreates = lineItems.map((item: any) =>
            prisma.driverInvoiceLineItem.create({
                data: {
                    invoiceId: invoice.id,
                    driverId,
                    carrierId,
                    amount: new Prisma.Decimal(item.amount),
                    description: item.description,
                    chargeId: item.chargeId || null,
                },
            }),
        );

        const createdLineItems = await prisma.$transaction(lineItemCreates);

        const lineItemsTotal = createdLineItems.reduce((acc, item) => acc.add(item.amount), new Prisma.Decimal(0));

        const totalAmount = assignmentTotal.add(lineItemsTotal);

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
        // 3. Clear billing fields in associated assignments.
        // 4. Disconnect assignments from the invoice.
        // 5. Delete the invoice record.
        await prisma.$transaction([
            // Delete the payments associated with this invoice
            prisma.driverInvoicePayment.deleteMany({
                where: { invoiceId },
            }),
            // Delete the invoice line items
            prisma.driverInvoiceLineItem.deleteMany({
                where: { invoiceId, carrierId },
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
