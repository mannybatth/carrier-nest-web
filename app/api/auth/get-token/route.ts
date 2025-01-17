import { auth } from 'auth';
import { getToken } from 'next-auth/jwt';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

export const GET = auth(async (req: NextAuthRequest) => {
    try {
        const token = await getToken({ req, secret: process.env.AUTH_SECRET });
        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }
        return NextResponse.json({ token });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
});
