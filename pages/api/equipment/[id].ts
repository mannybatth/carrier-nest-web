import type { NextApiRequest, NextApiResponse } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedEquipment, JSONResponse } from '../../../interfaces/models';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Session } from 'next-auth';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'PUT':
            return _put();
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const session = await getServerSession(req, res, authOptions);
        const response = await getEquipment({ session, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _put() {
        const session = await getServerSession(req, res, authOptions);

        const equipment = await prisma.equipment.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
            },
        });

        if (!equipment) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Equipment not found' }],
            });
        }

        const equipmentData = req.body as ExpandedEquipment;

        const updatedEquipment = await prisma.equipment.update({
            where: {
                id: String(req.query.id),
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

        return res.status(200).json({
            code: 200,
            data: { updatedEquipment },
        });
    }

    async function _delete() {
        const session = await getServerSession(req, res, authOptions);

        const equipment = await prisma.equipment.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
            },
        });

        if (!equipment) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Equipment not found' }],
            });
        }

        await prisma.equipment.delete({
            where: {
                id: String(req.query.id),
            },
        });

        return res.status(200).send({
            code: 200,
            data: { result: 'Equipment deleted' },
        });
    }
}

const getEquipment = async ({
    session,
    query,
}: {
    session: Session;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ equipment: ExpandedEquipment }>> => {
    const equipment = await prisma.equipment.findFirst({
        where: {
            id: String(query.id),
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
