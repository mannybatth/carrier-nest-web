import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

// POST endpoint to reactivate a deactivated user
export const POST = auth(async (req: NextAuthRequest, { params }: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const userId = params.id;
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
            return NextResponse.json({ message: 'Only admins can reactivate users' }, { status: 403 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Find the deactivated user
            const userToReactivate = await tx.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    isActive: true,
                    deactivatedAt: true,
                    carriers: {
                        select: { id: true, name: true },
                    },
                },
            });

            if (!userToReactivate) {
                throw new Error('User not found');
            }

            if (userToReactivate.isActive) {
                throw new Error('User is already active');
            }

            // Reactivate the user
            const reactivatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    isActive: true,
                    deactivatedAt: null,
                    deactivatedBy: null,
                    deactivationReason: null,
                    // Add them back to the current carrier
                    carriers: {
                        connect: { id: carrierId },
                    },
                    // Set default carrier if they don't have one
                    defaultCarrierId: userToReactivate.carriers.length === 0 ? carrierId : undefined,
                },
                include: {
                    carriers: {
                        select: { id: true, name: true },
                    },
                },
            });

            return reactivatedUser;
        });

        return NextResponse.json({
            code: 200,
            data: {
                message: 'User reactivated successfully',
                user: result,
            },
        });
    } catch (error) {
        console.error('Error reactivating user:', error);

        if (error.message === 'User not found') {
            return NextResponse.json({ code: 404, errors: [{ message: 'User not found' }] }, { status: 404 });
        }

        if (error.message === 'User is already active') {
            return NextResponse.json({ code: 400, errors: [{ message: 'User is already active' }] }, { status: 400 });
        }

        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});
