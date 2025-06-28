import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

// Helper function to determine if a user is the original admin/owner of a carrier
async function isUserOriginalAdmin(userId: string, carrierId: string): Promise<boolean> {
    try {
        // Get all users connected to this carrier, ordered by creation date
        const carrierUsers = await prisma.user.findMany({
            where: {
                carriers: {
                    some: { id: carrierId },
                },
            },
            select: {
                id: true,
                createdAt: true,
                role: true,
                isSiteAdmin: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        if (carrierUsers.length === 0) return false;

        // Find admins among carrier users
        const adminUsers = carrierUsers.filter((user) => user.role === 'admin' || user.isSiteAdmin);

        // If the user is an admin, check if they're the first admin or the earliest user
        const userIsAdmin = adminUsers.some((admin) => admin.id === userId);
        if (!userIsAdmin) return false;

        // If there's only one admin, they're the original admin
        if (adminUsers.length === 1) return true;

        // Find the earliest admin
        const earliestAdmin = adminUsers.reduce((earliest, current) =>
            current.createdAt < earliest.createdAt ? current : earliest,
        );

        // Or if no specific admin role, the first user connected to carrier is original admin
        const firstUser = carrierUsers[0];

        return userId === earliestAdmin.id || (adminUsers.length === 0 && userId === firstUser.id);
    } catch (error) {
        console.error('Error checking original admin status:', error);
        return false;
    }
}

export const DELETE = auth(async (req: NextAuthRequest, { params }: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const memberId = params.id;
        const carrierId = req.auth.user.defaultCarrierId;

        if (!carrierId) {
            return NextResponse.json({ message: 'No carrier found' }, { status: 400 });
        }

        // Optimize: Use a single transaction to fetch user data and check carrier membership
        const [userToRemove, carrierInfo] = await prisma.$transaction([
            prisma.user.findUnique({
                where: { id: memberId },
                include: {
                    carriers: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    accounts: {
                        select: {
                            id: true,
                            provider: true,
                        },
                    },
                },
            }),
            prisma.carrier.findUnique({
                where: { id: carrierId },
                select: {
                    id: true,
                    name: true,
                },
            }),
        ]);

        if (!userToRemove || !userToRemove.carriers.some((carrier) => carrier.id === carrierId)) {
            return NextResponse.json(
                {
                    code: 404,
                    errors: [{ message: 'Team member not found' }],
                },
                { status: 404 },
            );
        }

        // Don't allow users to remove themselves
        if (userToRemove.id === req.auth.user.id) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [{ message: 'You cannot remove yourself from the team' }],
                },
                { status: 400 },
            );
        }

        // Admin protection: Check if user is the original admin/owner
        const isOriginalAdmin = await isUserOriginalAdmin(memberId, carrierId);
        if (isOriginalAdmin) {
            return NextResponse.json(
                {
                    code: 403,
                    errors: [
                        {
                            message:
                                'Cannot remove the original admin. Transfer ownership first or ensure there is another admin.',
                        },
                    ],
                },
                { status: 403 },
            );
        }

        // Admin protection: Ensure at least one admin remains
        const currentAdmins = await prisma.user.count({
            where: {
                carriers: {
                    some: { id: carrierId },
                },
                OR: [{ role: 'admin' }, { isSiteAdmin: true }],
            },
        });

        const userIsAdmin = userToRemove.role === 'admin' || userToRemove.isSiteAdmin;
        if (userIsAdmin && currentAdmins <= 1) {
            return NextResponse.json(
                {
                    code: 403,
                    errors: [{ message: 'Cannot remove the last admin. Promote another user to admin first.' }],
                },
                { status: 403 },
            );
        }

        // Optimize: Use a single transaction to handle all removal operations
        const result = await prisma.$transaction(async (tx) => {
            // Remove the user from this carrier
            await tx.user.update({
                where: { id: memberId },
                data: {
                    carriers: {
                        disconnect: { id: carrierId },
                    },
                    // If this was their default carrier and they have other carriers,
                    // set a new default carrier
                    ...(userToRemove.defaultCarrierId === carrierId && userToRemove.carriers.length > 1
                        ? {
                              defaultCarrierId: userToRemove.carriers.find((c) => c.id !== carrierId)?.id || null,
                          }
                        : userToRemove.defaultCarrierId === carrierId
                        ? { defaultCarrierId: null }
                        : {}),
                },
            });

            // Check if user has any remaining carrier associations after removal
            const remainingCarriersCount = userToRemove.carriers.length - 1; // Subtract the one we just removed

            // If user has no remaining carriers, delete the user entirely along with all related data
            if (remainingCarriersCount === 0) {
                // Delete all related data in a single transaction
                await tx.teamInvitation.deleteMany({
                    where: { email: userToRemove.email },
                });

                await tx.session.deleteMany({
                    where: { userId: memberId },
                });

                await tx.account.deleteMany({
                    where: { userId: memberId },
                });

                // Delete the user record itself (cascade delete handles other relations)
                await tx.user.delete({
                    where: { id: memberId },
                });

                return { completelyRemoved: true };
            }

            return { completelyRemoved: false };
        });

        return NextResponse.json({
            code: 200,
            data: {
                message: result.completelyRemoved
                    ? 'Team member completely removed from system'
                    : 'Team member removed successfully',
            },
        });
    } catch (error) {
        console.error('Error removing team member:', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Internal server error' }],
            },
            { status: 500 },
        );
    }
});

export const PUT = auth(async (req: NextAuthRequest, { params }: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const memberId = params.id;
        const carrierId = req.auth.user.defaultCarrierId;
        const { name, email, role } = await req.json();

        if (!carrierId) {
            return NextResponse.json({ message: 'No carrier found' }, { status: 400 });
        }

        // Optimize: Use a single transaction to validate and update user data
        try {
            const updatedUser = await prisma.$transaction(async (tx) => {
                // Check if the user exists and is part of this carrier
                const userToUpdate = await tx.user.findFirst({
                    where: {
                        id: memberId,
                        carriers: {
                            some: {
                                id: carrierId,
                            },
                        },
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isSiteAdmin: true,
                    },
                });

                if (!userToUpdate) {
                    throw new Error('Team member not found');
                }

                // Admin protection: Check if trying to change role of original admin
                if (role && role !== userToUpdate.role) {
                    const isOriginalAdmin = await isUserOriginalAdmin(memberId, carrierId);
                    if (isOriginalAdmin) {
                        throw new Error('Cannot change the role of the original admin');
                    }

                    // Admin protection: If demoting an admin, ensure at least one admin remains
                    if ((userToUpdate.role === 'admin' || userToUpdate.isSiteAdmin) && role !== 'admin') {
                        const currentAdmins = await tx.user.count({
                            where: {
                                carriers: {
                                    some: { id: carrierId },
                                },
                                OR: [{ role: 'admin' }, { isSiteAdmin: true }],
                            },
                        });

                        if (currentAdmins <= 1) {
                            throw new Error('Cannot demote the last admin. Promote another user to admin first.');
                        }
                    }
                }

                // Update user information and return updated data with relations
                return await tx.user.update({
                    where: { id: memberId },
                    data: {
                        ...(name && { name }),
                        ...(email && { email }),
                        ...(role && { role }),
                    },
                    include: {
                        defaultCarrier: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                        carriers: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                        accounts: {
                            select: {
                                id: true,
                                provider: true,
                            },
                        },
                    },
                });
            });

            return NextResponse.json({
                code: 200,
                data: { teamMember: updatedUser },
            });
        } catch (transactionError) {
            if (transactionError.message === 'Team member not found') {
                return NextResponse.json(
                    {
                        code: 404,
                        errors: [{ message: 'Team member not found' }],
                    },
                    { status: 404 },
                );
            }
            if (transactionError.message === 'Cannot change the role of the original admin') {
                return NextResponse.json(
                    {
                        code: 403,
                        errors: [{ message: 'Cannot change the role of the original admin' }],
                    },
                    { status: 403 },
                );
            }
            if (transactionError.message === 'Cannot demote the last admin. Promote another user to admin first.') {
                return NextResponse.json(
                    {
                        code: 403,
                        errors: [{ message: 'Cannot demote the last admin. Promote another user to admin first.' }],
                    },
                    { status: 403 },
                );
            }
            throw transactionError;
        }
    } catch (error) {
        console.error('Error updating team member:', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Internal server error' }],
            },
            { status: 500 },
        );
    }
});
