import { Location, Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { Session } from 'next-auth';
import { JSONResponse } from 'interfaces/models';

export const GET = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const locationId = context.params.id;
    const response = await getLocation({ session, locationId });
    return NextResponse.json(response, { status: response.code });
});

export const PUT = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const locationId = context.params.id;
    const location = await prisma.location.findFirst({
        where: {
            id: locationId,
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!location) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Location not found' }] }, { status: 404 });
    }

    const locationData = (await req.json()) as Prisma.LocationUpdateInput;

    const updatedLocation = await prisma.location.update({
        where: { id: locationId },
        data: locationData,
    });

    return NextResponse.json({ code: 200, data: { updatedLocation } }, { status: 200 });
});

export const DELETE = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const locationId = context.params.id;
    const location = await prisma.location.findFirst({
        where: {
            id: locationId,
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!location) {
        return NextResponse.json({ code: 404, errors: [{ message: 'Location not found' }] }, { status: 404 });
    }

    await prisma.location.delete({ where: { id: locationId } });

    return NextResponse.json({ code: 200, data: { result: 'Location deleted' } }, { status: 200 });
});

const getLocation = async ({
    session,
    locationId,
}: {
    session: Session;
    locationId: string;
}): Promise<JSONResponse<{ location: Location }>> => {
    if (!locationId) {
        return { code: 400, errors: [{ message: 'Location id is required' }] };
    }

    const location = await prisma.location.findFirst({
        where: {
            id: locationId,
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!location) {
        return { code: 404, errors: [{ message: 'Location not found' }] };
    }

    return { code: 200, data: { location } };
};
