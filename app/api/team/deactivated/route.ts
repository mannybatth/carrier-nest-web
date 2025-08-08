import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

// GET endpoint to list deactivated users (admin only)
export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const carrierId = req.auth.user.defaultCarrierId;

        if (!carrierId) {
            return NextResponse.json({ message: 'No carrier found' }, { status: 400 });
        }

        // Check if current user is admin
        const currentUser = await prisma.user.findUnique({
            where: { id: req.auth.user.id },
            select: { role: true, isSiteAdmin: true },
        });

        if (!currentUser || (currentUser.role !== 'admin' && !currentUser.isSiteAdmin)) {
            return NextResponse.json({ message: 'Only admins can view deactivated users' }, { status: 403 });
        }

        // Find deactivated users that were previously associated with this carrier
        const deactivatedUsers = await prisma.user.findMany({
            where: {
                isActive: false,
                // Find users that were previously connected to this carrier
                // This is tricky since they're disconnected, but we can use deactivation context
                OR: [
                    {
                        // Users who still have carrier connection but are deactivated
                        carriers: {
                            some: { id: carrierId },
                        },
                    },
                    {
                        // Users deactivated by someone from this carrier
                        deactivatedBy: req.auth.user.id,
                    },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                deactivatedAt: true,
                deactivatedBy: true,
                deactivationReason: true,
                carriers: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                deactivatedAt: 'desc',
            },
        });

        return NextResponse.json({
            code: 200,
            data: {
                deactivatedUsers,
                count: deactivatedUsers.length,
            },
        });
    } catch (error) {
        console.error('Error fetching deactivated users:', error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});
