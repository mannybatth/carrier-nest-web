import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const carrierId = req.auth.user.defaultCarrierId;
        const { email } = await req.json();

        if (!carrierId) {
            return NextResponse.json({ message: 'No carrier found' }, { status: 400 });
        }

        if (!email) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [{ message: 'Email is required' }],
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

        // Convert email to lowercase for case-insensitive comparison
        const normalizedEmail = email.toLowerCase();

        // Optimize: Use a single transaction to fetch both user and invitation data simultaneously
        const [existingUser, existingInvitation] = await prisma.$transaction([
            prisma.user.findUnique({
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
                select: {
                    id: true,
                    lastEmailSent: true,
                    emailCount: true,
                    expires: true,
                    createdAt: true,
                },
            }),
        ]);

        if (!existingUser) {
            // User doesn't exist - check for pending invitation
            if (existingInvitation) {
                const timeSinceLastEmail = new Date().getTime() - existingInvitation.lastEmailSent.getTime();
                const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
                const canSendEmail = timeSinceLastEmail >= cooldownPeriod;
                const remainingCooldown = canSendEmail
                    ? 0
                    : Math.ceil((cooldownPeriod - timeSinceLastEmail) / 1000 / 60);

                return NextResponse.json({
                    code: 200,
                    data: {
                        exists: false,
                        canAdd: true,
                        hasPendingInvitation: true,
                        message: 'Email is available, but has a pending invitation',
                        invitation: {
                            lastEmailSent: existingInvitation.lastEmailSent,
                            emailCount: existingInvitation.emailCount,
                            canSendEmail,
                            remainingCooldown,
                            expires: existingInvitation.expires,
                        },
                    },
                });
            }

            return NextResponse.json({
                code: 200,
                data: {
                    exists: false,
                    canAdd: true,
                    hasPendingInvitation: false,
                    message: 'Email is available',
                },
            });
        }

        // Check if user is already part of this carrier
        const isCurrentCarrierMember = existingUser.carriers.some((carrier) => carrier.id === carrierId);

        if (isCurrentCarrierMember) {
            // User is already a team member
            return NextResponse.json({
                code: 200,
                data: {
                    exists: true,
                    canAdd: false,
                    isCurrentMember: true,
                    hasThirdPartyAuth: existingUser.accounts.length > 0,
                    authProviders: existingUser.accounts.map((acc) => acc.provider),
                    message: 'This user is already a member of your team',
                },
            });
        }

        // Check if user is already associated with any other carrier
        if (existingUser.carriers.length > 0) {
            const otherCarrierNames = existingUser.carriers.map((carrier) => carrier.name);
            return NextResponse.json({
                code: 200,
                data: {
                    exists: true,
                    canAdd: false,
                    isCurrentMember: false,
                    hasThirdPartyAuth: existingUser.accounts.length > 0,
                    authProviders: existingUser.accounts.map((acc) => acc.provider),
                    associatedCarriers: otherCarrierNames,
                    message:
                        'This email address is already taken. The user is already associated with another carrier.',
                },
            });
        }

        // User exists but belongs to other carriers or hasn't joined yet
        const hasAccount = existingUser.accounts && existingUser.accounts.length > 0;
        const otherCarrierNames = existingUser.carriers.map((carrier) => carrier.name);

        const responseData: any = {
            exists: true,
            canAdd: true,
            isCurrentMember: false,
            hasAccount,
            hasThirdPartyAuth: existingUser.accounts.length > 0,
            authProviders: existingUser.accounts.map((acc) => acc.provider),
            otherCarriers: otherCarrierNames,
            message: hasAccount
                ? `User has an existing account and can sign in with: ${existingUser.accounts
                      .map((acc) => acc.provider)
                      .join(', ')}`
                : `User exists but hasn't completed account setup. Associated with: ${otherCarrierNames.join(', ')}`,
        };

        // Check for existing invitation details
        if (existingInvitation) {
            const timeSinceLastEmail = new Date().getTime() - existingInvitation.lastEmailSent.getTime();
            const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
            const canSendEmail = timeSinceLastEmail >= cooldownPeriod;
            const remainingCooldown = canSendEmail ? 0 : Math.ceil((cooldownPeriod - timeSinceLastEmail) / 1000 / 60);

            responseData.hasPendingInvitation = true;
            responseData.invitation = {
                lastEmailSent: existingInvitation.lastEmailSent,
                emailCount: existingInvitation.emailCount,
                canSendEmail,
                remainingCooldown,
                expires: existingInvitation.expires,
            };
        } else {
            responseData.hasPendingInvitation = false;
        }

        return NextResponse.json({
            code: 200,
            data: responseData,
        });
    } catch (error) {
        console.error('Error checking email:', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Failed to check email availability' }],
            },
            { status: 500 },
        );
    }
});
