import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { isValidTokenFormat, isInvitationExpired } from 'lib/team-invitation';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token || !isValidTokenFormat(token)) {
            return NextResponse.json(
                {
                    valid: false,
                    error: 'Invalid token format',
                },
                { status: 400 },
            );
        }

        // Find the invitation
        const invitation = await prisma.teamInvitation.findUnique({
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
            return NextResponse.json(
                {
                    valid: false,
                    error: 'Invitation not found',
                },
                { status: 404 },
            );
        }

        // Check if already used
        if (invitation.used) {
            return NextResponse.json(
                {
                    valid: false,
                    error: 'Invitation has already been used',
                },
                { status: 410 },
            );
        }

        // Check if expired
        if (isInvitationExpired(invitation.expires)) {
            return NextResponse.json(
                {
                    valid: false,
                    error: 'Invitation has expired',
                },
                { status: 410 },
            );
        }

        // Valid invitation
        return NextResponse.json({
            valid: true,
            invitation: {
                email: invitation.email,
                carrierName: invitation.carrierName || invitation.carrier.name,
                inviterName: invitation.inviterName,
                role: invitation.role,
                expires: invitation.expires,
            },
        });
    } catch (error) {
        console.error('Error validating invitation token:', error);
        return NextResponse.json(
            {
                valid: false,
                error: 'Internal server error',
            },
            { status: 500 },
        );
    }
}
