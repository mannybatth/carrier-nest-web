import { Location, Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { Session } from 'next-auth';

export const GET = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    const response = await getLocation({ session, id });
    return NextResponse.json(response, { status: response.code });
});

export const PUT = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    const location = await prisma.location.findFirst({
        where: {
            id: String(id),
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!location) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Location not found' }] }, { status: 404 });
    }

    const locationData = (await req.json()) as Prisma.LocationUpdateInput;

    const updatedLocation = await prisma.location.update({
        where: { id: String(id) },
        data: locationData,
    });

    return NextResponse.json({ code: 200, data: { updatedLocation } }, { status: 200 });
});

export const DELETE = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    const location = await prisma.location.findFirst({
        where: {
            id: String(id),
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!location) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Location not found' }] }, { status: 404 });
    }

    await prisma.location.delete({ where: { id: String(id) } });

    return NextResponse.json({ code: 200, data: { result: 'Location deleted' } }, { status: 200 });
});

const getLocation = async ({
    session,
    id,
}: {
    session: Session;
    id: string | null;
}): Promise<{ code: number; data?: { location: Location }; errors?: { message: string }[] }> => {
    if (!id) {
        return { code: 400, errors: [{ message: 'ID is required' }] };
    }

    const location = await prisma.location.findFirst({
        where: {
            id: String(id),
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!location) {
        return { code: 404, errors: [{ message: 'Location not found' }] };
    }

    return { code: 200, data: { location } };
};
