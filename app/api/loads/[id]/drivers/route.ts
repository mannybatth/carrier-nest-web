import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const GET = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const loadId = context.params.id;
        const session = req.auth;

        const drivers = await prisma.driver.findMany({
            where: {
                assignments: {
                    some: {
                        loadId: loadId,
                    },
                },
                carrierId: session.user.defaultCarrierId,
            },
        });

        return NextResponse.json({
            code: 200,
            data: {
                drivers,
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
