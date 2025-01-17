import { Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const carriers = await prisma.carrier.findMany({
            where: {
                users: {
                    some: {
                        id: req.auth.user.id,
                    },
                },
            },
            include: {
                subscription: true,
            },
        });

        return NextResponse.json({ data: { carriers } });
    } catch (error) {
        console.log('carrier get error', error);
        return NextResponse.json({ errors: [{ message: error.message || JSON.stringify(error) }] }, { status: 400 });
    }
});

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const carrierData = (await req.json()) as Prisma.CarrierCreateInput;

        const carrier = await prisma.carrier.create({
            data: {
                ...carrierData,
                subscription: {
                    create: {
                        plan: 'BASIC',
                        status: 'active',
                    },
                },
                users: {
                    connect: {
                        id: req.auth.user.id,
                    },
                },
            },
            include: {
                subscription: true,
            },
        });

        await prisma.user.update({
            where: {
                id: req.auth.user.id,
            },
            data: {
                defaultCarrierId: carrier.id,
                carriers: {
                    connect: {
                        id: carrier.id,
                    },
                },
            },
        });

        return NextResponse.json({ data: { carrier } });
    } catch (error) {
        console.log('carrier post error', error);
        return NextResponse.json({ errors: [{ message: error.message || JSON.stringify(error) }] }, { status: 400 });
    }
});
