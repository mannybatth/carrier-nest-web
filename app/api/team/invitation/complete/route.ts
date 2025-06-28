import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { isValidTokenFormat, isInvitationExpired } from 'lib/team-invitation';

export async function POST(req: Request) {
    try {
        const { token, name } = await req.json();

        if (!token || !isValidTokenFormat(token)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid token format',
                },
                { status: 400 },
            );
        }

        if (!name || name.trim().length < 2) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Name is required and must be at least 2 characters',
                },
                { status: 400 },
            );
        }

        // Optimize: Use a single transaction to handle the entire invitation completion process
        const result = await prisma.$transaction(async (tx) => {
            // Find the invitation
            const invitation = await tx.teamInvitation.findUnique({
                where: { token },
                include: {
                    carrier: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            if (!invitation) {
                throw new Error('INVITATION_NOT_FOUND');
            }

            // Check if expired first (before checking if used)
            if (isInvitationExpired(invitation.expires)) {
                throw new Error('INVITATION_EXPIRED');
            }

            // Check if already used - but handle gracefully for race conditions
            if (invitation.used) {
                // If invitation was used recently (within last 5 minutes),
                // check if a user was actually created/updated for this invitation
                const recentUsage = invitation.usedAt && Date.now() - invitation.usedAt.getTime() < 5 * 60 * 1000; // 5 minutes

                if (recentUsage) {
                    // Check if user exists with this email - might be a race condition
                    const normalizedEmail = invitation.email.toLowerCase();
                    const existingUser = await tx.user.findUnique({
                        where: { email: normalizedEmail },
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
                    });

                    if (existingUser && existingUser.carriers.some((c) => c.id === invitation.carrierId)) {
                        // User exists and is connected to this carrier - probably a race condition
                        // Return success instead of error
                        return existingUser;
                    }
                }

                throw new Error('INVITATION_ALREADY_USED');
            }

            // Check if user already exists
            const normalizedEmail = invitation.email.toLowerCase();
            const existingUser = await tx.user.findUnique({
                where: { email: normalizedEmail },
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
            });

            let user;

            if (existingUser) {
                // User exists, check their current carrier associations
                const isAlreadyMember = existingUser.carriers.some((carrier) => carrier.id === invitation.carrierId);

                if (isAlreadyMember) {
                    // User is already a member of this carrier - complete onboarding
                    user = await tx.user.update({
                        where: { id: existingUser.id },
                        data: {
                            name: name.trim(), // Always update name during onboarding
                            emailVerified: new Date(), // Mark email as verified since they clicked the email link
                        },
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
                    });
                } else {
                    // Check if user is already associated with any OTHER carriers (multi-carrier prevention)
                    const otherCarriers = existingUser.carriers.filter(
                        (carrier) => carrier.id !== invitation.carrierId,
                    );

                    if (otherCarriers.length > 0) {
                        const otherCarrierNames = otherCarriers.map((carrier) => carrier.name);
                        throw new Error(`EMAIL_TAKEN:${otherCarrierNames.join(', ')}`);
                    }

                    // Add user to carrier
                    user = await tx.user.update({
                        where: { id: existingUser.id },
                        data: {
                            name: name.trim(), // Always update name during onboarding
                            emailVerified: new Date(), // Mark email as verified since they clicked the email link
                            ...(invitation.role ? { role: invitation.role } : {}),
                            carriers: {
                                connect: { id: invitation.carrierId },
                            },
                            // Set as default carrier if they don't have one
                            ...(!existingUser.defaultCarrierId ? { defaultCarrierId: invitation.carrierId } : {}),
                        },
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
                    });
                }
            } else {
                // Create new user
                user = await tx.user.create({
                    data: {
                        name: name.trim(),
                        email: normalizedEmail,
                        emailVerified: new Date(), // Mark email as verified since they clicked the email link
                        role: invitation.role || 'DISPATCHER',
                        defaultCarrierId: invitation.carrierId,
                        carriers: {
                            connect: { id: invitation.carrierId },
                        },
                    },
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
                });
            }

            // Mark invitation as used
            await tx.teamInvitation.update({
                where: { id: invitation.id },
                data: {
                    used: true,
                    usedAt: new Date(),
                },
            });

            return user;
        });

        return NextResponse.json({
            success: true,
            message: 'Onboarding completed successfully',
            user: {
                id: result.id,
                name: result.name,
                email: result.email,
                hasAccount: result.accounts && result.accounts.length > 0,
            },
        });
    } catch (error) {
        console.error('Error completing onboarding:', error);

        // Handle specific transaction errors
        if (error.message === 'INVITATION_NOT_FOUND') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invitation not found',
                },
                { status: 404 },
            );
        }

        if (error.message === 'INVITATION_ALREADY_USED') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invitation has already been used',
                },
                { status: 410 },
            );
        }

        if (error.message === 'INVITATION_EXPIRED') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invitation has expired',
                },
                { status: 410 },
            );
        }

        if (error.message.startsWith('EMAIL_TAKEN:')) {
            const carrierNames = error.message.split(':')[1];
            return NextResponse.json(
                {
                    success: false,
                    error: `This email address is already taken. The user is already associated with another carrier: ${carrierNames}`,
                },
                { status: 409 },
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
            },
            { status: 500 },
        );
    }
}
