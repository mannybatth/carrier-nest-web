import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { NextAuthRequest } from 'next-auth/lib';
import prisma from '../../../../lib/prisma';
import { deleteDocumentFromGCS } from '../../../../lib/delete-doc-from-gcs';
import { stripe } from '../../../../lib/stripe';
import nodemailer from 'nodemailer';

// Account deletion confirmation email function
async function sendAccountDeletionConfirmationEmail({
    carrierName,
    carrierEmail,
    deletionStats,
}: {
    carrierName: string;
    carrierEmail: string;
    deletionStats: {
        deletedUsers: number;
        disconnectedUsers: number;
        documentsDeleted: number;
        subscriptionTerminated: boolean;
        subscriptionPlan?: string;
    };
}) {
    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        secure: parseInt(process.env.EMAIL_SERVER_PORT || '587') === 465,
        auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
        },
    });

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
    });

    const subject = `Account Deletion Confirmation - ${carrierName}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Deletion Confirmation</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f8fafc;
            }
            .container {
                max-width: 600px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }
            .header-icon {
                width: 64px;
                height: 64px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 24px;
            }
            .header h1 {
                font-size: 28px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            .header p {
                font-size: 16px;
                opacity: 0.9;
            }
            .content {
                padding: 40px 30px;
            }
            .status-card {
                background: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 30px;
            }
            .status-title {
                font-size: 18px;
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
            }
            .status-icon {
                width: 20px;
                height: 20px;
                margin-right: 8px;
                color: #10b981;
            }
            .detail-grid {
                display: grid;
                gap: 16px;
                margin-bottom: 30px;
            }
            .detail-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                background: #f8fafc;
                border-radius: 8px;
                border-left: 4px solid #3b82f6;
            }
            .detail-label {
                font-weight: 500;
                color: #475569;
            }
            .detail-value {
                font-weight: 600;
                color: #1e293b;
            }
            .subscription-notice {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 24px;
            }
            .subscription-notice h3 {
                color: #92400e;
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            .subscription-notice p {
                color: #92400e;
                font-size: 14px;
            }
            .security-info {
                background: #f0f9ff;
                border: 1px solid #0ea5e9;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 24px;
            }
            .security-info h3 {
                color: #0c4a6e;
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
            }
            .security-info ul {
                list-style: none;
                color: #0c4a6e;
            }
            .security-info li {
                padding: 4px 0;
                position: relative;
                padding-left: 20px;
            }
            .security-info li:before {
                content: "✓";
                position: absolute;
                left: 0;
                color: #10b981;
                font-weight: bold;
            }
            .footer {
                background: #f8fafc;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            .footer p {
                color: #64748b;
                font-size: 14px;
                margin-bottom: 8px;
            }
            .company-name {
                color: #3b82f6;
                font-weight: 600;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-icon">🗑️</div>
                <h1>Account Deletion Confirmed</h1>
                <p>Your CarrierNest account has been permanently deleted</p>
            </div>

            <div class="content">
                <div class="status-card">
                    <div class="status-title">
                        <span class="status-icon">✅</span>
                        Deletion Complete
                    </div>
                    <p>Your account deletion request has been processed successfully on <strong>${currentDate}</strong>.</p>
                </div>

                ${
                    deletionStats.subscriptionTerminated
                        ? `
                <div class="subscription-notice">
                    <h3>🔔 Subscription Cancelled</h3>
                    <p>Your <strong>${deletionStats.subscriptionPlan}</strong> subscription has been cancelled and will not renew. No further charges will be applied.</p>
                </div>
                `
                        : ''
                }

                <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 20px; color: #1e293b;">Deletion Summary</h2>

                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Company Name</span>
                        <span class="detail-value">${carrierName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Contact Email</span>
                        <span class="detail-value">${carrierEmail}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Documents Removed</span>
                        <span class="detail-value">${deletionStats.documentsDeleted} files</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">User Accounts Deleted</span>
                        <span class="detail-value">${deletionStats.deletedUsers} accounts</span>
                    </div>
                    ${
                        deletionStats.disconnectedUsers > 0
                            ? `
                    <div class="detail-item">
                        <span class="detail-label">Users Moved to Other Carriers</span>
                        <span class="detail-value">${deletionStats.disconnectedUsers} users</span>
                    </div>
                    `
                            : ''
                    }
                    <div class="detail-item">
                        <span class="detail-label">Deletion Date</span>
                        <span class="detail-value">${currentDate}</span>
                    </div>
                </div>

                <div class="security-info">
                    <h3>🔒 What Was Deleted</h3>
                    <ul>
                        <li>All company and business data</li>
                        <li>Load and shipment records</li>
                        <li>Driver information and assignments</li>
                        <li>Financial records and invoices</li>
                        <li>Document storage (PDFs, images, etc.)</li>
                        <li>User accounts and authentication data</li>
                        ${deletionStats.subscriptionTerminated ? '<li>Subscription and billing information</li>' : ''}
                    </ul>
                </div>

                <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center;">
                    <p style="color: #4b5563; font-size: 14px; margin-bottom: 12px;">
                        <strong>Need to get back on CarrierNest?</strong>
                    </p>
                    <p style="color: #6b7280; font-size: 13px;">
                        You can create a new account anytime at <a href="https://carriernest.com" style="color: #3b82f6; text-decoration: none;">carriernest.com</a>
                    </p>
                </div>
            </div>

            <div class="footer">
                <p>This is an automated confirmation from <span class="company-name">CarrierNest</span></p>
                <p>If you have questions, contact us at support@carriernest.com</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const textContent = `
Account Deletion Confirmation - ${carrierName}

Your CarrierNest account has been permanently deleted on ${currentDate}.

DELETION SUMMARY:
- Company: ${carrierName}
- Email: ${carrierEmail}
- Documents Removed: ${deletionStats.documentsDeleted} files
- User Accounts Deleted: ${deletionStats.deletedUsers} accounts
${
    deletionStats.disconnectedUsers > 0
        ? `- Users Moved to Other Carriers: ${deletionStats.disconnectedUsers} users`
        : ''
}
${deletionStats.subscriptionTerminated ? `- Subscription Status: ${deletionStats.subscriptionPlan} plan cancelled` : ''}

WHAT WAS DELETED:
✓ All company and business data
✓ Load and shipment records
✓ Driver information and assignments
✓ Financial records and invoices
✓ Document storage (PDFs, images, etc.)
✓ User accounts and authentication data
${deletionStats.subscriptionTerminated ? '✓ Subscription and billing information' : ''}

Need to get back on CarrierNest? You can create a new account anytime at carriernest.com

This is an automated confirmation from CarrierNest.
If you have questions, contact us at support@carriernest.com
    `;

    await transport.sendMail({
        to: carrierEmail,
        from: process.env.EMAIL_FROM,
        subject,
        text: textContent,
        html: htmlContent,
    });
}

async function deleteCarrierData(carrierId: string) {
    // IMPORTANT: Google Cloud Storage deletion MUST happen OUTSIDE the transaction
    // because GCS operations should not fail the database transaction
    console.log(`Starting account deletion for carrier: ${carrierId}`);

    // Get carrier information BEFORE deletion for email confirmation
    const carrierInfo = await prisma.carrier.findUnique({
        where: { id: carrierId },
        select: {
            name: true,
            email: true,
            subscription: {
                select: {
                    plan: true,
                    stripeSubscriptionId: true,
                    stripeCustomerId: true,
                    status: true,
                },
            },
        },
    });

    if (!carrierInfo) {
        throw new Error('Carrier not found');
    }

    // Step 0: Terminate Stripe subscription if it exists
    let subscriptionTerminated = false;
    if (carrierInfo.subscription?.stripeSubscriptionId && carrierInfo.subscription.plan === 'PRO') {
        try {
            console.log(`Terminating Stripe subscription: ${carrierInfo.subscription.stripeSubscriptionId}`);
            await stripe.subscriptions.cancel(carrierInfo.subscription.stripeSubscriptionId);
            subscriptionTerminated = true;
            console.log('Stripe subscription terminated successfully');
        } catch (error) {
            console.error('Failed to terminate Stripe subscription:', error);
            // Continue with deletion process even if Stripe cancellation fails
        }
    }

    // Step 1: Get all documents for GCS deletion BEFORE starting transaction
    console.log('Retrieving documents for Google Cloud Storage deletion...');
    const documentsToDelete = await prisma.loadDocument.findMany({
        where: {
            OR: [
                { carrierId: carrierId },
                { load: { carrierId: carrierId } },
                { loadForPodDoc: { carrierId: carrierId } },
                { loadForRateCon: { carrierId: carrierId } },
            ],
        },
        select: { id: true, fileKey: true, fileName: true },
    });

    console.log(`Found ${documentsToDelete.length} documents to delete from Google Cloud Storage`);

    // Step 2: Delete documents from Google Cloud Storage FIRST (outside transaction)
    if (documentsToDelete.length > 0) {
        console.log('Deleting documents from Google Cloud Storage...');
        const gcsDeletePromises = documentsToDelete.map(async (doc) => {
            try {
                await deleteDocumentFromGCS(doc as any);
                console.log(`Successfully deleted document: ${doc.fileName}`);
            } catch (error) {
                // Log the error but don't fail the entire process for GCS deletion issues
                console.error(`Failed to delete document ${doc.fileName} from GCS:`, error);
            }
        });

        await Promise.allSettled(gcsDeletePromises);
        console.log('Completed Google Cloud Storage document deletion');
    }

    // Step 3: Execute database deletion in transaction
    const deletionResult = await prisma.$transaction(
        async (tx) => {
            console.log('Starting database deletion transaction...');

            // Get all load IDs for batch operations
            const loads = await tx.load.findMany({
                where: { carrierId },
                select: { id: true },
            });

            const loadIds = loads.map((load) => load.id);
            console.log(`Found ${loadIds.length} loads to process`);

            // Step 4: Delete assignment payments (has foreign key to driver assignments)
            console.log('Deleting assignment payments...');
            await tx.assignmentPayment.deleteMany({
                where: {
                    driverAssignment: {
                        load: { carrierId },
                    },
                },
            });

            // Step 5: Delete driver assignments (references loads, drivers, route legs)
            console.log('Deleting driver assignments...');
            await tx.driverAssignment.deleteMany({
                where: {
                    load: { carrierId },
                },
            });

            // Step 6: Delete driver invoice payments (references driver invoices)
            console.log('Deleting driver invoice payments...');
            await tx.driverInvoicePayment.deleteMany({
                where: {
                    invoice: { carrierId },
                },
            });

            // Step 7: Delete driver invoice line items (references driver invoices, drivers, line item charges)
            console.log('Deleting driver invoice line items...');
            await tx.driverInvoiceLineItem.deleteMany({
                where: { carrierId },
            });

            // Step 8: Delete driver invoices (references drivers)
            console.log('Deleting driver invoices...');
            await tx.driverInvoice.deleteMany({
                where: { carrierId },
            });

            // Step 9: Delete driver payments (references drivers)
            console.log('Deleting driver payments...');
            await tx.driverPayment.deleteMany({
                where: { carrierId },
            });

            // Step 10: Delete load activities (references loads, documents, users, drivers)
            console.log('Deleting load activities...');
            await tx.loadActivity.deleteMany({
                where: { carrierId },
            });

            // Step 11: Delete load documents (now safe since GCS is already cleaned)
            console.log('Deleting load documents from database...');
            await tx.loadDocument.deleteMany({
                where: {
                    OR: [
                        { carrierId: carrierId },
                        { load: { carrierId: carrierId } },
                        { loadForPodDoc: { carrierId: carrierId } },
                        { loadForRateCon: { carrierId: carrierId } },
                    ],
                },
            });

            // Step 12: Delete invoice payments (references invoices)
            console.log('Deleting invoice payments...');
            await tx.invoicePayment.deleteMany({
                where: {
                    invoice: { carrierId },
                },
            });

            // Step 13: Delete invoice items (references invoices)
            console.log('Deleting invoice items...');
            await tx.invoiceItem.deleteMany({
                where: {
                    invoice: { carrierId },
                },
            });

            // Step 14: Delete invoices (references loads - load will cascade delete)
            console.log('Deleting invoices...');
            await tx.invoice.deleteMany({
                where: { carrierId },
            });

            // Step 15: Delete route leg locations (references route legs, load stops, locations)
            console.log('Deleting route leg locations...');
            await tx.routeLegLocation.deleteMany({
                where: {
                    routeLeg: {
                        route: {
                            load: { carrierId },
                        },
                    },
                },
            });

            // Step 16: Delete route legs (references routes)
            console.log('Deleting route legs...');
            await tx.routeLeg.deleteMany({
                where: {
                    route: {
                        load: { carrierId },
                    },
                },
            });

            // Step 17: Delete routes (references loads)
            console.log('Deleting routes...');
            await tx.route.deleteMany({
                where: {
                    load: { carrierId },
                },
            });

            // Step 18: Delete loads BEFORE load stops (loads reference load stops via receiverId/shipperId)
            console.log('Deleting loads...');
            await tx.load.deleteMany({
                where: { carrierId },
            });

            // Step 19: Delete load stops that belonged to the carrier (now safe since loads are deleted)
            console.log('Deleting load stops...');
            await tx.loadStop.deleteMany({
                where: {
                    user: {
                        carriers: {
                            some: { id: carrierId },
                        },
                    },
                },
            });

            // Step 20: Delete devices (references drivers)
            console.log('Deleting driver devices...');
            await tx.device.deleteMany({
                where: {
                    driver: { carrierId },
                },
            });

            // Step 21: Delete drivers (should be safe now)
            console.log('Deleting drivers...');
            await tx.driver.deleteMany({
                where: { carrierId },
            });

            // Step 22: Delete other carrier-related entities (no dependencies)
            console.log('Deleting other carrier-related entities...');
            await Promise.all([
                tx.lineItemCharge.deleteMany({
                    where: { carrierId },
                }),
                tx.location.deleteMany({
                    where: { carrierId },
                }),
                tx.equipment.deleteMany({
                    where: { carrierId },
                }),
                tx.customer.deleteMany({
                    where: { carrierId },
                }),
                tx.teamInvitation.deleteMany({
                    where: { carrierId },
                }),
                tx.accountDeletionCode.deleteMany({
                    where: { carrierId },
                }),
                tx.subscription.deleteMany({
                    where: { carrierId },
                }),
            ]);

            // Step 23: Update users to remove carrier relationships and delete orphaned users
            console.log('Processing user relationships...');

            // First, get detailed user information including their carrier associations
            const usersWithCarrierDetails = await tx.user.findMany({
                where: {
                    carriers: {
                        some: { id: carrierId },
                    },
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    defaultCarrierId: true,
                    carriers: {
                        select: { id: true, name: true },
                    },
                },
            });

            console.log(`Found ${usersWithCarrierDetails.length} users associated with carrier`);

            const usersToDelete = [];
            const usersToDisconnect = [];

            // Categorize users based on their carrier associations
            for (const user of usersWithCarrierDetails) {
                const remainingCarriersCount = user.carriers.length - 1; // Subtract the one we're removing

                if (remainingCarriersCount === 0) {
                    // User will have no carriers left - mark for deletion
                    usersToDelete.push(user);
                } else {
                    // User has other carriers - just disconnect
                    usersToDisconnect.push(user);
                }
            }

            console.log(`Users to delete completely: ${usersToDelete.length}`);
            console.log(`Users to disconnect only: ${usersToDisconnect.length}`);

            // Step 24: Process users to disconnect (update default carrier if needed)
            if (usersToDisconnect.length > 0) {
                console.log('Disconnecting users who have other carriers...');
                await Promise.all(
                    usersToDisconnect.map((user) => {
                        const newDefaultCarrier = user.carriers.find((c) => c.id !== carrierId);
                        return tx.user.update({
                            where: { id: user.id },
                            data: {
                                carriers: {
                                    disconnect: { id: carrierId },
                                },
                                // Update default carrier if this was their default
                                ...(user.defaultCarrierId === carrierId && newDefaultCarrier
                                    ? { defaultCarrierId: newDefaultCarrier.id }
                                    : user.defaultCarrierId === carrierId
                                    ? { defaultCarrierId: null }
                                    : {}),
                            },
                        });
                    }),
                );
            }

            // Step 25: Delete users who have no other carrier associations
            if (usersToDelete.length > 0) {
                console.log(`Deleting ${usersToDelete.length} users who have no other carriers...`);

                for (const user of usersToDelete) {
                    console.log(`Deleting user: ${user.name} (${user.email})`);

                    // Delete user's team invitations
                    await tx.teamInvitation.deleteMany({
                        where: { email: user.email },
                    });

                    // Delete user's sessions
                    await tx.session.deleteMany({
                        where: { userId: user.id },
                    });

                    // Delete user's OAuth accounts
                    await tx.account.deleteMany({
                        where: { userId: user.id },
                    });

                    // Delete the user record (cascade delete handles other relations like invoices, loads, etc.)
                    await tx.user.delete({
                        where: { id: user.id },
                    });
                }
            }

            // Step 26: Finally, delete the carrier
            console.log('Deleting carrier...');
            await tx.carrier.delete({
                where: { id: carrierId },
            });

            console.log(`Account deletion completed successfully for carrier: ${carrierId}`);
            if (usersToDelete.length > 0) {
                console.log(
                    `Also deleted ${usersToDelete.length} user accounts that had no other carrier associations`,
                );
            }

            // Return deletion statistics for email confirmation
            return {
                deletedUsers: usersToDelete.length,
                disconnectedUsers: usersToDisconnect.length,
                documentsDeleted: documentsToDelete.length,
                subscriptionTerminated,
            };
        },
        {
            timeout: 60000, // Increased to 60 seconds for complex deletions
        },
    );

    // Step 4: Send account deletion confirmation email
    try {
        await sendAccountDeletionConfirmationEmail({
            carrierName: carrierInfo.name,
            carrierEmail: carrierInfo.email,
            deletionStats: {
                deletedUsers: deletionResult.deletedUsers,
                disconnectedUsers: deletionResult.disconnectedUsers,
                documentsDeleted: deletionResult.documentsDeleted,
                subscriptionTerminated: deletionResult.subscriptionTerminated,
                subscriptionPlan: carrierInfo.subscription?.plan,
            },
        });
        console.log('Account deletion confirmation email sent successfully');
    } catch (emailError) {
        console.error('Failed to send account deletion confirmation email:', emailError);
        // Don't throw error as the main deletion was successful
    }

    return deletionResult;
}

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { code } = body;

        if (!code || typeof code !== 'string' || code.length !== 6) {
            return NextResponse.json({ error: 'Invalid verification code format' }, { status: 400 });
        }

        const user = req.auth.user;

        // Get user's default carrier
        const userWithCarrier = await prisma.user.findUnique({
            where: { id: user.id },
            select: { defaultCarrierId: true },
        });

        if (!userWithCarrier?.defaultCarrierId) {
            return NextResponse.json({ error: 'No default carrier found' }, { status: 400 });
        }

        const carrierId = userWithCarrier.defaultCarrierId;

        // Find the verification code
        const verificationCode = await prisma.accountDeletionCode.findUnique({
            where: { carrierId },
        });

        if (!verificationCode) {
            return NextResponse.json(
                { error: 'No verification code found. Please request a new one.' },
                { status: 404 },
            );
        }

        // Check if code has expired
        if (new Date() > verificationCode.expires) {
            // Clean up expired code
            await prisma.accountDeletionCode.delete({
                where: { carrierId },
            });
            return NextResponse.json(
                { error: 'Verification code has expired. Please request a new one.' },
                { status: 400 },
            );
        }

        // Verify the code
        if (verificationCode.code !== code) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // Get carrier info before deletion
        const carrier = await prisma.carrier.findUnique({
            where: { id: carrierId },
            select: { name: true, email: true },
        });

        if (!carrier) {
            return NextResponse.json({ error: 'Carrier not found' }, { status: 404 });
        }

        // Execute the account deletion
        await deleteCarrierData(carrierId);

        return NextResponse.json({
            success: true,
            message: 'Account has been successfully deleted',
            carrierName: carrier.name,
        });
    } catch (error) {
        console.error('Error deleting account:', error);
        return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }
});
