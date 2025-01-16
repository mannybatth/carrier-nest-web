import { auth } from 'auth';
import prisma from 'lib/prisma';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

export const GET = auth(async (req: NextAuthRequest) => {
    if (req.auth) {
        const carrierCode = req.nextUrl.searchParams.get('carrierCode');
        let isUnique = true;

        const carrier = await prisma.carrier.findUnique({
            where: {
                carrierCode: String(carrierCode),
            },
        });

        if (carrier) {
            isUnique = false;
        }

        return NextResponse.json({
            code: 200,
            data: {
                isUnique,
            },
        });
    }

    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
});
