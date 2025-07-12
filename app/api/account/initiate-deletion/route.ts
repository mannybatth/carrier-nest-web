import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { NextAuthRequest } from 'next-auth/lib';
import prisma from '../../../../lib/prisma';
import nodemailer from 'nodemailer';

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = req.auth.user;

        // Get user's default carrier
        const userWithCarrier = await prisma.user.findUnique({
            where: { id: user.id },
            select: { defaultCarrierId: true, email: true },
        });

        if (!userWithCarrier?.defaultCarrierId) {
            return NextResponse.json({ error: 'No default carrier found' }, { status: 400 });
        }

        const carrierId = userWithCarrier.defaultCarrierId;

        // Check if there's already an unexpired verification code
        const existingCode = await prisma.accountDeletionCode.findUnique({
            where: { carrierId },
        });

        if (existingCode) {
            // Check if the existing code is still valid
            if (new Date() < existingCode.expires) {
                // Return existing code info without sending new email
                return NextResponse.json({
                    success: true,
                    message: 'Verification code already sent. Please check your email.',
                    expiresAt: existingCode.expires.toISOString(),
                    isExisting: true,
                });
            } else {
                // Clean up expired code
                await prisma.accountDeletionCode.delete({
                    where: { carrierId },
                });
            }
        }

        // Generate 6-digit verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Set expiry to 15 minutes from now
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        // Create new verification code
        await prisma.accountDeletionCode.create({
            data: {
                carrierId,
                code,
                expires,
            },
        });

        // Get carrier information for email
        const carrier = await prisma.carrier.findUnique({
            where: { id: carrierId },
            select: { name: true, email: true },
        });

        if (!carrier) {
            return NextResponse.json({ error: 'Carrier not found' }, { status: 404 });
        }

        // Send verification email using the same config as NextAuth
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_SERVER_HOST,
            port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
            },
        });

        const emailSubject = 'Account Deletion Verification';
        const emailText = `
Account Deletion Verification

Your verification code: ${code}

This code expires in 15 minutes.

Company: ${carrier.name}
Email: ${userWithCarrier.email}

If you did not request account deletion, please ignore this email and contact support.

CarrierNest Security Team
        `.trim();

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deletion Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; line-height: 1.5;">
    <div style="max-width: 480px; margin: 40px auto; padding: 0 20px;">

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
            <div style="width: 64px; height: 64px; margin: 0 auto 24px; background-color: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            </div>
            <h1 style="color: #111827; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em;">
                Account Deletion Verification
            </h1>
            <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px; font-weight: 400;">
                Verification required to continue
            </p>
        </div>

        <!-- Verification Code Section -->
        <div style="text-align: center; margin: 40px 0; padding: 32px 24px; background-color: #f9fafb; border-radius: 16px; border: 1px solid #e5e7eb;">
            <p style="color: #374151; margin: 0 0 16px 0; font-size: 15px; font-weight: 500;">
                Your verification code
            </p>
            <div style="background-color: #ffffff; color: #111827; padding: 20px; border-radius: 12px; font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: 32px; font-weight: 600; letter-spacing: 8px; margin: 0 auto; display: inline-block; border: 1px solid #d1d5db;">
                ${code}
            </div>
            <p style="color: #6b7280; margin: 16px 0 0 0; font-size: 14px;">
                Expires in 15 minutes
            </p>
        </div>

        <!-- Account Details -->
        <div style="margin: 32px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                Account Details
            </h3>
            <div style="space-y: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: #6b7280; font-size: 14px;">Company:</span>
                    <span style="color: #111827; font-size: 14px; font-weight: 500;">${carrier.name}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #6b7280; font-size: 14px;">Email:</span>
                    <span style="color: #111827; font-size: 14px; font-weight: 500;">${userWithCarrier.email}</span>
                </div>
            </div>
        </div>

        <!-- Security Notice -->
        <div style="margin: 32px 0; padding: 16px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
            <div style="display: flex; align-items: flex-start;">
                <div style="flex-shrink: 0; margin-right: 12px; margin-top: 2px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <div>
                    <h4 style="color: #92400e; margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">
                        Important Security Notice
                    </h4>
                    <p style="color: #78350f; margin: 0; font-size: 13px; line-height: 1.4;">
                        This action will permanently delete your account and all data. If you did not request this, please ignore this email and contact support immediately.
                    </p>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 13px;">
                This email was sent by <strong style="color: #374151;">CarrierNest</strong>
            </p>
            <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">
                CarrierNest Security Team • © 2024 CarrierNest. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
        `.trim();

        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: userWithCarrier.email,
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
        });

        return NextResponse.json({
            success: true,
            message: 'Verification code sent to your email',
            expiresAt: expires.toISOString(),
            isExisting: false,
        });
    } catch (error) {
        console.error('Error initiating account deletion:', error);

        // Provide more specific error messages for debugging
        if (error.message?.includes('nodemailer')) {
            return NextResponse.json({ error: 'Email service configuration error' }, { status: 500 });
        }

        if (error.message?.includes('prisma') || error.message?.includes('database')) {
            return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
        }

        return NextResponse.json({ error: 'Failed to initiate account deletion' }, { status: 500 });
    }
});
