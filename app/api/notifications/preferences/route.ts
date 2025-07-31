import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { NextAuthRequest } from 'next-auth/lib';
import prisma from '../../../../lib/prisma';

export const GET = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const carrierId = searchParams.get('carrierId') || session.user.defaultCarrierId;

        if (!carrierId) {
            return NextResponse.json({ error: 'Carrier ID required' }, { status: 400 });
        }

        // Get notification preferences for the user and carrier
        const preferences = await prisma.notificationPreference.findMany({
            where: {
                userId: session.user.id,
                carrierId: carrierId,
            },
            orderBy: { type: 'asc' },
        });

        // If no preferences exist, create default ones for all notification types
        if (preferences.length === 0) {
            const notificationTypes = [
                'ASSIGNMENT_STARTED',
                'ASSIGNMENT_COMPLETED',
                'ASSIGNMENT_UPDATED',
                'DOCUMENT_UPLOADED',
                'DOCUMENT_DELETED',
                'INVOICE_SUBMITTED',
                'INVOICE_APPROVED',
                'INVOICE_DISPUTED',
                'INVOICE_ATTENTION_REQUIRED',
                'INVOICE_OVERDUE',
                'PAYMENT_PROCESSED',
                'PAYMENT_STATUS_CHANGE',
                'LOCATION_UPDATE',
                'STATUS_CHANGE',
                'DEADLINE_APPROACHING',
            ];

            const defaultPreferences = notificationTypes.map((type) => ({
                userId: session.user.id,
                carrierId: carrierId,
                type: type as any,
                enabled: false,
                emailEnabled: false,
                smsEnabled: false,
                pushEnabled: false,
            }));

            await prisma.notificationPreference.createMany({
                data: defaultPreferences,
            });

            // Fetch the newly created preferences
            const newPreferences = await prisma.notificationPreference.findMany({
                where: {
                    userId: session.user.id,
                    carrierId: carrierId,
                },
                orderBy: { type: 'asc' },
            });

            return NextResponse.json(newPreferences);
        }

        return NextResponse.json(preferences);
    } catch (error) {
        console.error('Error fetching notification preferences:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});

export const PUT = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { preferences, carrierId } = await req.json();
        const actualCarrierId = carrierId || session.user.defaultCarrierId;

        if (!actualCarrierId) {
            console.error('PUT /api/notifications/preferences - No carrier ID provided');
            return NextResponse.json({ error: 'Carrier ID required' }, { status: 400 });
        }

        if (!Array.isArray(preferences)) {
            console.error('PUT /api/notifications/preferences - Preferences is not an array:', typeof preferences);
            return NextResponse.json({ error: 'Preferences must be an array' }, { status: 400 });
        }

        // Update preferences
        const updatePromises = preferences.map((pref) => {
            return prisma.notificationPreference.upsert({
                where: {
                    userId_carrierId_type: {
                        userId: session.user.id,
                        carrierId: actualCarrierId,
                        type: pref.type,
                    },
                },
                update: {
                    enabled: pref.enabled,
                    emailEnabled: pref.emailEnabled,
                    smsEnabled: pref.smsEnabled || false,
                    pushEnabled: pref.pushEnabled || false,
                },
                create: {
                    userId: session.user.id,
                    carrierId: actualCarrierId,
                    type: pref.type,
                    enabled: pref.enabled,
                    emailEnabled: pref.emailEnabled,
                    smsEnabled: pref.smsEnabled || false,
                    pushEnabled: pref.pushEnabled || false,
                },
            });
        });

        await Promise.all(updatePromises);

        // Fetch updated preferences
        const updatedPreferences = await prisma.notificationPreference.findMany({
            where: {
                userId: session.user.id,
                carrierId: actualCarrierId,
            },
            orderBy: { type: 'asc' },
        });

        return NextResponse.json(updatedPreferences);
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
