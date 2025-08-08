import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { JSONResponse } from 'interfaces/models';
import { calcPaginationMetadata } from 'lib/pagination';
import { generateInvitationToken, createInvitationExpiry, createInvitationUrl } from 'lib/team-invitation';
import { sendTeamOnboardingEmail } from 'lib/verification-request';
import { appUrl } from 'lib/constants';

const buildOrderBy = (sortBy: string, sortDir: string) => {
    if (sortBy && sortDir) {
        return { [sortBy]: sortDir as 'asc' | 'desc' };
    }
    return { name: 'asc' as const };
};

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const carrierId = req.auth.user.defaultCarrierId;
        const sortBy = req.nextUrl.searchParams.get('sortBy') || 'name';
        const sortDir = req.nextUrl.searchParams.get('sortDir') || 'asc';
        const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');
        const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

        if (!carrierId) {
            return NextResponse.json({ message: 'No carrier found' }, { status: 400 });
        }

        const [total, teamMembers] = await prisma.$transaction([
            prisma.user.count({
                where: {
                    carriers: {
                        some: {
                            id: carrierId,
                        },
                    },
                    isActive: true, // Only count active users
                },
            }),
            prisma.user.findMany({
                where: {
                    carriers: {
                        some: {
                            id: carrierId,
                        },
                    },
                    isActive: true, // Only show active users
                },
                select: {
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                    name: true,
                    email: true,
                    emailVerified: true,
                    image: true,
                    isSiteAdmin: true,
                    role: true,
                    defaultCarrierId: true,
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
                orderBy: buildOrderBy(sortBy, sortDir),
                take: limit,
                skip: offset,
            }),
        ]);

        const metadata = calcPaginationMetadata({ total, limit, offset });

        return NextResponse.json({
            code: 200,
            data: {
                teamMembers,
                metadata,
            },
        });
    } catch (error) {
        console.error('Error fetching team members:', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Internal server error' }],
            },
            { status: 500 },
        );
    }
});

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const carrierId = req.auth.user.defaultCarrierId;
        const { email, name, role, sendInvite } = await req.json();

        if (!carrierId) {
            return NextResponse.json({ message: 'No carrier found' }, { status: 400 });
        }

        if (!email || !name) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [{ message: 'Email and name are required' }],
                },
                { status: 400 },
            );
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [{ message: 'Invalid email format' }],
                },
                { status: 400 },
            );
        }

        // Get current user info for invitation
        const currentUser = await prisma.user.findUnique({
            where: { id: req.auth.user.id },
            include: {
                defaultCarrier: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!currentUser) {
            return NextResponse.json({ message: 'Current user not found' }, { status: 400 });
        }

        // Convert email to lowercase for case-insensitive comparison
        const normalizedEmail = email.toLowerCase();

        // Use a single transaction to check existing user and invitation simultaneously
        const [existingUser, existingInvitation] = await prisma.$transaction([
            prisma.user.findUnique({
                where: { email: normalizedEmail },
                include: {
                    carriers: true,
                    accounts: {
                        select: {
                            id: true,
                            provider: true,
                            providerAccountId: true,
                        },
                    },
                },
            }),
            prisma.teamInvitation.findFirst({
                where: {
                    email: normalizedEmail,
                    carrierId,
                    used: false,
                    expires: {
                        gt: new Date(), // Still valid
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),
        ]);

        if (existingUser) {
            // Check if user is already part of this carrier
            const isAlreadyMember = existingUser.carriers.some((carrier) => carrier.id === carrierId);

            if (isAlreadyMember) {
                return NextResponse.json(
                    {
                        code: 409,
                        errors: [
                            {
                                message: 'User is already a team member',
                                details: {
                                    hasThirdPartyAuth: existingUser.accounts.length > 0,
                                    providers: existingUser.accounts.map((acc) => acc.provider),
                                },
                            },
                        ],
                    },
                    { status: 409 },
                );
            }

            // Check if user is already associated with any other carrier
            if (existingUser.carriers.length > 0) {
                const otherCarrierNames = existingUser.carriers.map((carrier) => carrier.name);
                return NextResponse.json(
                    {
                        code: 409,
                        errors: [
                            {
                                message:
                                    'This email address is already taken. The user is already associated with another carrier.',
                                details: {
                                    hasThirdPartyAuth: existingUser.accounts.length > 0,
                                    providers: existingUser.accounts.map((acc) => acc.provider),
                                    associatedCarriers: otherCarrierNames,
                                },
                            },
                        ],
                    },
                    { status: 409 },
                );
            }

            // Check for rate limiting on existing invitation - only if sending email
            if (existingInvitation && sendInvite !== false) {
                const timeSinceLastEmail = new Date().getTime() - existingInvitation.lastEmailSent.getTime();
                const cooldownPeriod = 5 * 60 * 1000; // 5 minutes

                if (timeSinceLastEmail < cooldownPeriod) {
                    const remainingTime = Math.ceil((cooldownPeriod - timeSinceLastEmail) / 1000 / 60);
                    return NextResponse.json(
                        {
                            code: 429,
                            errors: [
                                {
                                    message: `Please wait ${remainingTime} minute(s) before sending another invitation email`,
                                    lastEmailSent: existingInvitation.lastEmailSent,
                                    emailCount: existingInvitation.emailCount,
                                },
                            ],
                        },
                        { status: 429 },
                    );
                }
            }

            // Use transaction to update invitation and handle email sending
            const updatedInvitation = await prisma.$transaction(async (tx) => {
                if (existingInvitation) {
                    if (sendInvite !== false) {
                        // Update existing invitation with new email timestamp
                        return await tx.teamInvitation.update({
                            where: { id: existingInvitation.id },
                            data: {
                                lastEmailSent: new Date(),
                                emailCount: existingInvitation.emailCount + 1,
                                emailSentAt: new Date(),
                                // Update other fields in case they changed
                                role,
                                inviterName: currentUser.name,
                                inviterEmail: currentUser.email,
                                carrierName: currentUser.defaultCarrier?.name,
                            },
                        });
                    } else {
                        // If not sending email, just update the invitation record without rate limiting
                        return await tx.teamInvitation.update({
                            where: { id: existingInvitation.id },
                            data: {
                                // Update invitation details but don't increment email count or update timestamp
                                role,
                                inviterName: currentUser.name,
                                inviterEmail: currentUser.email,
                                carrierName: currentUser.defaultCarrier?.name,
                            },
                        });
                    }
                } else {
                    // Create new invitation for existing user
                    const invitationToken = generateInvitationToken();
                    const expires = createInvitationExpiry();

                    return await tx.teamInvitation.create({
                        data: {
                            email: normalizedEmail,
                            token: invitationToken,
                            carrierId,
                            carrierName: currentUser.defaultCarrier?.name,
                            inviterName: currentUser.name,
                            inviterEmail: currentUser.email,
                            role,
                            expires,
                            lastEmailSent: new Date(),
                            emailSentAt: sendInvite !== false ? new Date() : null,
                            emailCount: sendInvite !== false ? 1 : 0,
                        },
                    });
                }
            });

            // Send invitation email if requested and not rate limited
            if (
                sendInvite !== false &&
                (!existingInvitation || Date.now() - existingInvitation.lastEmailSent.getTime() >= 5 * 60 * 1000)
            ) {
                const token = updatedInvitation.token;
                const invitationUrl = createInvitationUrl(token, appUrl);

                try {
                    await sendTeamOnboardingEmail({
                        identifier: normalizedEmail,
                        url: invitationUrl,
                        provider: {
                            server: {
                                host: process.env.EMAIL_SERVER_HOST,
                                port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
                                auth: {
                                    user: process.env.EMAIL_SERVER_USER,
                                    pass: process.env.EMAIL_SERVER_PASSWORD,
                                },
                            },
                            from: process.env.EMAIL_FROM,
                        },
                        carrierName: currentUser.defaultCarrier?.name,
                        inviterName: currentUser.name,
                    });
                } catch (emailError) {
                    console.error('Failed to send invitation email:', emailError);
                    // Don't fail the invitation creation if email fails
                }
            }

            // Return the existing user with team member status and third-party auth info
            return NextResponse.json({
                code: 200,
                data: {
                    teamMember: {
                        ...existingUser,
                        hasThirdPartyAuth: existingUser.accounts.length > 0,
                        authProviders: existingUser.accounts.map((acc) => acc.provider),
                    },
                    invitationSent:
                        sendInvite !== false &&
                        (!existingInvitation ||
                            Date.now() - existingInvitation.lastEmailSent.getTime() >= 5 * 60 * 1000),
                    lastEmailSent: updatedInvitation.lastEmailSent,
                    emailCount: updatedInvitation.emailCount,
                },
            });
        } else {
            // Check if there's already a pending invitation for this email to prevent duplicates
            if (existingInvitation && sendInvite !== false) {
                const timeSinceLastEmail = new Date().getTime() - existingInvitation.lastEmailSent.getTime();
                const cooldownPeriod = 5 * 60 * 1000; // 5 minutes

                if (timeSinceLastEmail < cooldownPeriod) {
                    const remainingTime = Math.ceil((cooldownPeriod - timeSinceLastEmail) / 1000 / 60);
                    return NextResponse.json(
                        {
                            code: 429,
                            errors: [
                                {
                                    message: `Invitation already sent. Please wait ${remainingTime} minute(s) before sending another invitation email`,
                                    lastEmailSent: existingInvitation.lastEmailSent,
                                    emailCount: existingInvitation.emailCount,
                                },
                            ],
                        },
                        { status: 429 },
                    );
                }
            }

            // Use a single transaction to handle all database operations for new users
            const result = await prisma.$transaction(async (tx) => {
                let invitation;

                if (existingInvitation) {
                    if (sendInvite !== false) {
                        // Update existing invitation
                        invitation = await tx.teamInvitation.update({
                            where: { id: existingInvitation.id },
                            data: {
                                lastEmailSent: new Date(),
                                emailCount: existingInvitation.emailCount + 1,
                                emailSentAt: new Date(),
                                // Update other fields in case they changed
                                role,
                                inviterName: currentUser.name,
                                inviterEmail: currentUser.email,
                                carrierName: currentUser.defaultCarrier?.name,
                            },
                        });
                    } else {
                        // If not sending email but invitation exists, just update the invitation record
                        invitation = await tx.teamInvitation.update({
                            where: { id: existingInvitation.id },
                            data: {
                                // Update invitation details but don't increment email count or update timestamp
                                role,
                                inviterName: currentUser.name,
                                inviterEmail: currentUser.email,
                                carrierName: currentUser.defaultCarrier?.name,
                            },
                        });
                    }

                    return {
                        invitation,
                        newUser: null,
                        pendingInvitation: true,
                    };
                } else {
                    // For new users, create both invitation and user record in the same transaction
                    const invitationToken = generateInvitationToken();
                    const expires = createInvitationExpiry();

                    // Create invitation record
                    invitation = await tx.teamInvitation.create({
                        data: {
                            email: normalizedEmail,
                            token: invitationToken,
                            carrierId,
                            carrierName: currentUser.defaultCarrier?.name,
                            inviterName: currentUser.name,
                            inviterEmail: currentUser.email,
                            role,
                            expires,
                            lastEmailSent: new Date(),
                            emailSentAt: sendInvite !== false ? new Date() : null,
                            emailCount: sendInvite !== false ? 1 : 0,
                        },
                    });

                    // Create placeholder user record
                    const newUser = await tx.user.create({
                        data: {
                            name,
                            email: normalizedEmail,
                            ...(role && { role }),
                            defaultCarrierId: carrierId,
                            carriers: {
                                connect: { id: carrierId },
                            },
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

                    return {
                        invitation,
                        newUser,
                        pendingInvitation: false,
                    };
                }
            });

            // Send invitation email if requested and outside transaction to avoid blocking
            if (sendInvite !== false && result.invitation) {
                const invitationUrl = createInvitationUrl(result.invitation.token, appUrl);

                // Send email asynchronously to avoid blocking the response
                setImmediate(async () => {
                    try {
                        await sendTeamOnboardingEmail({
                            identifier: normalizedEmail,
                            url: invitationUrl,
                            provider: {
                                server: {
                                    host: process.env.EMAIL_SERVER_HOST,
                                    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
                                    auth: {
                                        user: process.env.EMAIL_SERVER_USER,
                                        pass: process.env.EMAIL_SERVER_PASSWORD,
                                    },
                                },
                                from: process.env.EMAIL_FROM,
                            },
                            carrierName: currentUser.defaultCarrier?.name,
                            inviterName: currentUser.name,
                        });
                    } catch (emailError) {
                        console.error('Failed to send invitation email:', emailError);
                        // Email failure doesn't affect the API response since it's async
                    }
                });
            }

            if (result.pendingInvitation) {
                return NextResponse.json({
                    code: 200,
                    data: {
                        teamMember: null,
                        pendingInvitation: true,
                        invitationSent: sendInvite !== false,
                        lastEmailSent: result.invitation.lastEmailSent,
                        emailCount: result.invitation.emailCount,
                    },
                });
            } else {
                return NextResponse.json({
                    code: 201,
                    data: {
                        teamMember: {
                            ...result.newUser,
                            hasThirdPartyAuth: false,
                            authProviders: [],
                        },
                        invitationSent: sendInvite !== false,
                        lastEmailSent: result.invitation.lastEmailSent,
                        emailCount: result.invitation.emailCount,
                    },
                });
            }
        }
    } catch (error) {
        console.error('Error creating team member:', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Internal server error' }],
            },
            { status: 500 },
        );
    }
});
