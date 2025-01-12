import { Driver } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { ExpandedDriver, JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
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
        const response = await getDriver({ session, query: req.query });
        return res.status(response.code).json(response);
    }

    async function _put() {
        const session = await getServerSession(req, res, authOptions);

        const driver = await prisma.driver.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
            },
        });

        if (!driver) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Driver not found' }],
            });
        }

        const driverData = req.body as ExpandedDriver;

        const updatedDriver = await prisma.driver.update({
            where: {
                id: String(req.query.id),
            },
            data: {
                name: driverData.name,
                email: driverData.email || '',
                phone: driverData.phone || '',
                defaultChargeType: driverData.defaultChargeType || undefined,
                perMileRate: driverData.perMileRate,
                perHourRate: driverData.perHourRate,
                defaultFixedPay: driverData.defaultFixedPay,
                takeHomePercent: driverData.takeHomePercent,
            },
        });

        return res.status(200).json({
            code: 200,
            data: { updatedDriver },
        });
    }

    async function _delete() {
        const session = await getServerSession(req, res, authOptions);

        const driver = await prisma.driver.findFirst({
            where: {
                id: String(req.query.id),
                carrierId: session.user.defaultCarrierId,
            },
        });

        if (!driver) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Driver not found' }],
            });
        }

        // Check to see if driver is assigned an any assignment with following conditions
        // Driver is the only driver assigned to the assignment and the assignment is not completed
        const assignments = await prisma.driverAssignment.findMany({
            where: {
                driverId: driver.id,
                carrierId: session.user.defaultCarrierId,
                routeLeg: {
                    status: { not: 'COMPLETED' },
                },
            },
        });

        if (assignments.length > 0) {
            return res.status(400).send({
                code: 400,
                errors: [
                    { message: 'Driver is assigned to an active route, remove assignment before deleting driver.' },
                ],
            });
        }

        await prisma.driver.delete({
            where: {
                id: String(req.query.id),
            },
        });

        return res.status(200).send({
            code: 200,
            data: { result: 'Driver deleted' },
        });
    }
}

/**
 * Retrieves a driver based on the provided session and query parameters.
 *
 * @param {Object} params - The parameters for the function.
 * @param {Session} params.session - The session object containing user information.
 * @param {ParsedUrlQuery} params.query - The query parameters from the request.
 * @returns {Promise<JSONResponse<{ driver: Driver }>>} A promise that resolves to a JSON response containing the driver data.
 *
 * @example
 * // Example usage:
 * const response = await getDriver({
 *   session: { user: { defaultCarrierId: 'carrier123' } },
 *   query: { id: 'driver456', expand: 'relation1,relation2(limit)' }
 * });
 *
 * // Example expand string:
 * // 'relation1,relation2(limit)'
 * // This will include 'relation1' and 'relation2' with a limit on the number of related records.
 */
const getDriver = async ({
    session,
    query,
}: {
    session: Session;
    query: ParsedUrlQuery;
}): Promise<JSONResponse<{ driver: Driver }>> => {
    const expand = query.expand ? String(query.expand).split(',') : [];
    const include = expand.reduce((acc, relation) => {
        if (relation.includes('(')) {
            const [rel, limit] = relation.split('(');
            acc[rel] = {
                take: parseInt(limit.replace(')', ''), 10),
            };
        } else {
            acc[relation] = true;
        }
        return acc;
    }, {});

    const driver = await prisma.driver.findFirst({
        where: {
            id: String(query.id),
            carrierId: session.user.defaultCarrierId,
        },
        include,
    });
    return {
        code: 200,
        data: { driver },
    };
};
