import { Prisma } from '@prisma/client';
import { auth } from 'auth';
import { ExpandedCarrier, JSONResponse } from 'interfaces/models';
import prisma from 'lib/prisma';
import type { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

export const GET = auth(async (req: NextAuthRequest) => {
    if (req.auth) {
        const response = await getCarrier(req);
        return NextResponse.json(response, { status: response.code });
    }
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
});

export const PUT = auth(async (req: NextAuthRequest) => {
    if (req.auth) {
        const carrier = await getCarrier(req);

        if (!carrier.data?.carrier) {
            return NextResponse.json(
                {
                    code: 404,
                    errors: [{ message: 'Carrier not found' }],
                },
                { status: 404 },
            );
        }

        const carrierData = (await req.json()) as Prisma.CarrierUpdateInput;

        const updatedCarrier = await prisma.carrier.update({
            where: {
                id: String(req.nextUrl.searchParams.get('id')),
            },
            data: {
                name: carrierData.name,
                email: carrierData.email,
                phone: carrierData.phone,
                dotNum: carrierData.dotNum,
                mcNum: carrierData.mcNum,
                street: carrierData.street,
                city: carrierData.city,
                state: carrierData.state,
                zip: carrierData.zip,
                country: carrierData.country,
                carrierCode: carrierData.carrierCode,
            },
            include: {
                subscription: true,
            },
        });

        return NextResponse.json(
            {
                code: 200,
                data: {
                    carrier: updatedCarrier,
                },
            },
            { status: 200 },
        );
    }
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
});

async function getCarrier(req: NextAuthRequest): Promise<JSONResponse<{ carrier: ExpandedCarrier }>> {
    const session = req.auth;
    const userCarrierId = session?.user?.defaultCarrierId;

    if (!userCarrierId) {
        return {
            code: 404,
            errors: [{ message: 'Carrier not found' }],
        };
    }

    const carrierIdToFind = String(req.nextUrl.searchParams.get('id'));

    if (carrierIdToFind !== userCarrierId) {
        return {
            code: 403,
            errors: [{ message: 'Unauthorized' }],
        };
    }

    const carrier = await prisma.carrier.findFirst({
        where: {
            id: carrierIdToFind,
        },
        include: {
            subscription: true,
        },
    });

    if (!carrier) {
        return {
            code: 404,
            errors: [{ message: 'Carrier not found' }],
        };
    }

    return {
        code: 200,
        data: {
            carrier,
        },
    };
}
