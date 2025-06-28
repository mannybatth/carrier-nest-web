import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { sendTeamOnboardingEmail } from 'lib/verification-request';
import { generateInvitationToken, createInvitationExpiry, createInvitationUrl } from 'lib/team-invitation';
import { appUrl } from 'lib/constants';

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

        // Optimize: Use a single transaction to fetch all required data simultaneously
        const [currentUser, userToVerify] = await prisma.$transaction([
            prisma.user.findUnique({
                where: { id: req.auth.user.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    defaultCarrier: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
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
                        },
                    },
                },
            }),
        ]);

        if (!currentUser) {
            return NextResponse.json({ message: 'Current user not found' }, { status: 400 });
        }

        if (!userToVerify) {
            return NextResponse.json(
                {
                    code: 404,
                    errors: [{ message: 'User not found' }],
                },
                { status: 404 },
            );
        }

        // Check if user belongs to this carrier
        const isCarrierMember = userToVerify.carriers.some((carrier) => carrier.id === carrierId);
        if (!isCarrierMember) {
            return NextResponse.json(
                {
                    code: 403,
                    errors: [{ message: 'User is not a member of this carrier' }],
                },
                { status: 403 },
            );
        }

        // Check if user already has an account
        if (userToVerify.accounts && userToVerify.accounts.length > 0) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [{ message: 'User already has a verified account' }],
                },
                { status: 400 },
            );
        }

        // Optimize: Use a single transaction to handle invitation creation/update
        const invitation = await prisma.$transaction(async (tx) => {
            // Generate new invitation token
            const invitationToken = generateInvitationToken();
            const expires = createInvitationExpiry();

            // Check for existing invitation and delete it first
            const existingInvitation = await tx.teamInvitation.findFirst({
                where: {
                    email,
                    carrierId,
                },
                select: { id: true },
            });

            if (existingInvitation) {
                await tx.teamInvitation.delete({
                    where: { id: existingInvitation.id },
                });
            }

            // Create new invitation record
            return await tx.teamInvitation.create({
                data: {
                    email,
                    token: invitationToken,
                    carrierId,
                    carrierName: currentUser.defaultCarrier?.name,
                    inviterName: currentUser.name,
                    inviterEmail: currentUser.email,
                    role: userToVerify.role,
                    expires,
                },
                select: {
                    token: true,
                },
            });
        });

        // Send team onboarding email with invitation link
        const invitationUrl = createInvitationUrl(invitation.token, appUrl);

        console.log('Sending team onboarding email:', {
            to: email,
            from: process.env.EMAIL_FROM,
            carrierName: currentUser.defaultCarrier?.name,
            inviterName: currentUser.name,
            invitationUrl,
        });

        await sendTeamOnboardingEmail({
            identifier: email,
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

        console.log('Team onboarding email sent successfully to:', email);

        return NextResponse.json({
            code: 200,
            message: 'Verification email sent successfully',
        });
    } catch (error) {
        console.error('Error sending verification email:', error);
        return NextResponse.json(
            {
                code: 500,
                errors: [{ message: 'Failed to send verification email' }],
            },
            { status: 500 },
        );
    }
});
