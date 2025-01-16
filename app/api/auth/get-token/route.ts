import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

export const GET = auth(async (req: NextAuthRequest) => {
    try {
        const session = req.auth;
        if (!session) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }
        return NextResponse.json({ token: session.user });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
});
