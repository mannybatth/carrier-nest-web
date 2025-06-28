import { NextResponse } from 'next/server';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import prisma from 'lib/prisma';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const carrierId = req.auth.user.defaultCarrierId;
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');

        if (!carrierId) {
            return NextResponse.json({ message: 'No carrier found' }, { status: 400 });
        }

        if (!email) {
            return NextResponse.json({ message: 'Email parameter is required' }, { status: 400 });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
        }

        // Optimize: Use a single transaction to fetch both user and invitation data simultaneously
        const [existingUser, existingInvitation] = await prisma.$transaction([
            prisma.user.findUnique({
                where: { email },
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
                            providerAccountId: true,
                        },
                    },
                },
            }),
            prisma.teamInvitation.findFirst({
                where: {
                    email,
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
                    lastEmailSent: true,
                    emailCount: true,
                    expires: true,
                    role: true,
                    inviterName: true,
                },
            }),
        ]);

        // Determine user status
        let status = 'new'; // new, existing, member, invited, taken
        let details: any = {};

        if (existingUser) {
            // Check if user is already part of this specific carrier
            const isCurrentCarrierMember = existingUser.carriers.some((carrier) => carrier.id === carrierId);

            if (isCurrentCarrierMember) {
                status = 'member';
                details = {
                    isTeamMember: true,
                    hasThirdPartyAuth: existingUser.accounts.length > 0,
                    authProviders: existingUser.accounts.map((acc) => acc.provider),
                    canSignInWith: existingUser.accounts.map((acc) => acc.provider),
                    message: 'This user is already a member of your team',
                };
            } else if (existingUser.carriers.length > 0) {
                // User is associated with other carriers - email is taken
                status = 'taken';
                const otherCarrierNames = existingUser.carriers.map((carrier) => carrier.name);
                details = {
                    isTeamMember: false,
                    hasThirdPartyAuth: existingUser.accounts.length > 0,
                    authProviders: existingUser.accounts.map((acc) => acc.provider),
                    associatedCarriers: otherCarrierNames,
                    message:
                        'This email address is already taken. The user is already associated with another carrier.',
                };
            } else {
                status = 'existing';
                details = {
                    isTeamMember: false,
                    hasThirdPartyAuth: existingUser.accounts.length > 0,
                    authProviders: existingUser.accounts.map((acc) => acc.provider),
                    canSignInWith: existingUser.accounts.map((acc) => acc.provider),
                };
            }
        }

        if (existingInvitation) {
            if (status === 'new') {
                status = 'invited';
            }

            // Calculate if we can send another email (5-minute cooldown)
            const timeSinceLastEmail = new Date().getTime() - existingInvitation.lastEmailSent.getTime();
            const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
            const canSendEmail = timeSinceLastEmail >= cooldownPeriod;
            const remainingCooldown = canSendEmail ? 0 : Math.ceil((cooldownPeriod - timeSinceLastEmail) / 1000 / 60);

            details = {
                ...details,
                invitation: {
                    lastEmailSent: existingInvitation.lastEmailSent,
                    emailCount: existingInvitation.emailCount,
                    canSendEmail,
                    remainingCooldown,
                    expires: existingInvitation.expires,
                    role: existingInvitation.role,
                    inviterName: existingInvitation.inviterName,
                },
            };
        }

        return NextResponse.json({
            email,
            status,
            details,
        });
    } catch (error) {
        console.error('Error checking email status:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
});
