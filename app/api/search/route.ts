import { auth } from 'auth';
import { customerSearch, driverSearch, loadSearch } from 'lib/search';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const q = req.nextUrl.searchParams.get('q') as string;
    const session = req.auth;

    try {
        const loads = await loadSearch(q, session.user.defaultCarrierId);
        const customers = await customerSearch(q, session.user.defaultCarrierId);
        const drivers = await driverSearch(q, session.user.defaultCarrierId);

        return NextResponse.json({
            code: 200,
            data: {
                loads,
                customers,
                drivers,
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
