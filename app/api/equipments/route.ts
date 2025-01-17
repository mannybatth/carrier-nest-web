import { auth } from 'auth';
import prisma from 'lib/prisma';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import { ExpandedEquipment } from '../../../interfaces/models';
import { calcPaginationMetadata } from '../../../lib/pagination';

const buildOrderBy = (sortBy: string, sortDir: string) => {
    if (sortBy && sortDir) {
        if (sortBy.includes('.')) {
            const split = sortBy.split('.');
            return {
                [split[0]]: {
                    [split[1]]: sortDir,
                },
            };
        }
        return { [sortBy]: sortDir };
    }
    return undefined;
};

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const query = req.nextUrl.searchParams;
    const sortBy = query.get('sortBy') as string;
    const sortDir = (query.get('sortDir') as string) || 'asc';
    const limit = query.get('limit') !== null ? Number(query.get('limit')) : undefined;
    const offset = query.get('offset') !== null ? Number(query.get('offset')) : undefined;

    if (limit != null || offset != null) {
        if (limit == null || offset == null) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [{ message: 'Limit and Offset must be set together' }],
                },
                { status: 400 },
            );
        }

        if (isNaN(limit) || isNaN(offset)) {
            return NextResponse.json(
                {
                    code: 400,
                    errors: [{ message: 'Invalid limit or offset' }],
                },
                { status: 400 },
            );
        }
    }

    const total = await prisma.equipment.count({
        where: {
            carrierId: req.auth.user.defaultCarrierId,
        },
    });

    const metadata = calcPaginationMetadata({ total, limit, offset });

    const equipments = await prisma.equipment.findMany({
        where: {
            carrierId: req.auth.user.defaultCarrierId,
        },
        ...(limit ? { take: limit } : { take: 10 }),
        ...(offset ? { skip: offset } : { skip: 0 }),
        orderBy: buildOrderBy(sortBy, sortDir) || {
            createdAt: 'desc',
        },
        include: { drivers: true },
    });

    return NextResponse.json({
        code: 200,
        data: { metadata, equipments },
    });
});

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const equipmentData = (await req.json()) as ExpandedEquipment;

    const newEquipment = await prisma.equipment.create({
        data: {
            equipmentNumber: equipmentData.equipmentNumber,
            type: equipmentData.type,
            make: equipmentData.make,
            model: equipmentData.model,
            year: equipmentData.year,
            vin: equipmentData.vin,
            licensePlate: equipmentData.licensePlate,
            status: equipmentData.status,
            ...(equipmentData.drivers && {
                drivers: {
                    connect: equipmentData.drivers.map((driver) => ({ id: driver.id })),
                },
            }),
            carrierId: req.auth.user.defaultCarrierId,
        },
    });

    return NextResponse.json(
        {
            code: 201,
            data: { newEquipment },
        },
        { status: 201 },
    );
});
