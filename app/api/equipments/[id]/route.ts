import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { Session } from 'next-auth';
import { ExpandedEquipment, JSONResponse } from 'interfaces/models';

export const GET = auth(async (req: NextAuthRequest) => {
    const id = req.nextUrl.searchParams.get('id');
    const session = req.auth;

    const response = await getEquipment({ session, id });
    return NextResponse.json(response, { status: response.code });
});

export const PUT = auth(async (req: NextAuthRequest) => {
    const id = req.nextUrl.searchParams.get('id');
    const session = req.auth;

    const equipment = await prisma.equipment.findFirst({
        where: {
            id: String(id),
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!equipment) {
        return NextResponse.json(
            {
                code: 404,
                errors: [{ message: 'Equipment not found' }],
            },
            { status: 404 },
        );
    }

    const equipmentData = (await req.json()) as ExpandedEquipment;

    const updatedEquipment = await prisma.equipment.update({
        where: {
            id: String(id),
        },
        data: {
            equipmentNumber: equipmentData.equipmentNumber,
            type: equipmentData.type,
            make: equipmentData.make,
            model: equipmentData.model,
            year: equipmentData.year,
            vin: equipmentData.vin,
            licensePlate: equipmentData.licensePlate,
            status: equipmentData.status,
            drivers: {
                set: equipmentData.drivers.map((driver) => ({ id: driver.id })),
            },
        },
    });

    return NextResponse.json(
        {
            code: 200,
            data: { updatedEquipment },
        },
        { status: 200 },
    );
});

export const DELETE = auth(async (req: NextAuthRequest) => {
    const id = req.nextUrl.searchParams.get('id');
    const session = req.auth;

    const equipment = await prisma.equipment.findFirst({
        where: {
            id: String(id),
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!equipment) {
        return NextResponse.json(
            {
                code: 404,
                errors: [{ message: 'Equipment not found' }],
            },
            { status: 404 },
        );
    }

    await prisma.equipment.delete({
        where: {
            id: String(id),
        },
    });

    return NextResponse.json(
        {
            code: 200,
            data: { result: 'Equipment deleted' },
        },
        { status: 200 },
    );
});

const getEquipment = async ({
    session,
    id,
}: {
    session: Session;
    id: string | null;
}): Promise<JSONResponse<{ equipment: ExpandedEquipment }>> => {
    if (!id) {
        return {
            code: 400,
            errors: [{ message: 'ID is required' }],
        };
    }

    const equipment = await prisma.equipment.findFirst({
        where: {
            id: String(id),
            carrierId: session.user.defaultCarrierId,
        },
        include: { drivers: true },
    });

    if (!equipment) {
        return {
            code: 404,
            errors: [{ message: 'Equipment not found' }],
        };
    }

    return {
        code: 200,
        data: { equipment },
    };
};
