import { Device } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { JSONResponse } from '../../../../interfaces/models';
import prisma from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from 'pages/api/auth/[...nextauth]';

async function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<Device>>) {
    switch (req.method) {
        case 'POST':
            return _post(req, res);
        case 'PATCH':
            return _patch(req, res);
        case 'DELETE':
            return _delete(req, res);
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _post(req: NextApiRequest, res: NextApiResponse<JSONResponse<Device>>) {
        const session = await getServerSession(req, res, authOptions);
        const tokenCarrierId = session?.user?.carrierId as string;
        const tokenDriverId = session?.user?.driverId as string;

        if (!tokenCarrierId || !tokenDriverId) {
            return res.status(401).send({
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            });
        }

        // Extract the FCM token and driver ID from the request body
        const { fcmToken } = req.body;
        const driverId = req.query.id as string;

        // Validate the request body
        if (!fcmToken || !driverId) {
            return res.status(400).send({
                code: 400,
                errors: [{ message: 'FCM token and driver ID are required.' }],
            });
        }

        if (tokenDriverId !== driverId) {
            return res.status(403).send({
                code: 403,
                errors: [{ message: 'Driver ID does not match token credentials.' }],
            });
        }

        try {
            const driver = await prisma.driver.findUnique({
                where: { id: driverId },
            });

            if (!driver || driver.carrierId !== tokenCarrierId) {
                return res.status(404).send({
                    code: 404,
                    errors: [{ message: 'Driver not found under carrier' }],
                });
            }

            // Check if a device with the same FCM token already exists
            const existingDevice = await prisma.device.findUnique({
                where: { fcmToken },
            });

            if (existingDevice) {
                // Update driver id for existing device
                const newExistingDevice = await prisma.device.update({
                    where: { fcmToken },
                    data: { driverId },
                });

                return res.status(200).json({
                    code: 200,
                    data: newExistingDevice,
                });
            }

            // Create a new device and link it to the driver
            const device = await prisma.device.create({
                data: {
                    fcmToken,
                    driverId,
                },
            });

            // Respond with the created device
            return res.status(200).json({
                code: 200,
                data: device,
            });
        } catch (error) {
            console.error('Request error', error);
            return res.status(500).send({
                code: 500,
                errors: [{ message: 'Error creating device' }],
            });
        }
    }

    async function _patch(req: NextApiRequest, res: NextApiResponse<JSONResponse<Device>>) {
        const session = await getServerSession(req, res, authOptions);
        const tokenDriverId = session?.user?.driverId;

        if (!tokenDriverId) {
            return res.status(401).send({
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            });
        }

        const { deviceId, newFcmToken } = req.body;
        const driverId = req.query.id as string;

        if (!deviceId || !newFcmToken || !driverId) {
            return res.status(400).send({
                code: 400,
                errors: [{ message: 'Device ID, new FCM token, and driver ID are required.' }],
            });
        }

        // Check if the driver ID from the body matches the driver ID from the token
        if (driverId !== tokenDriverId) {
            return res.status(403).send({
                code: 403,
                errors: [{ message: 'Driver ID does not match token credentials.' }],
            });
        }

        try {
            // Find the device to ensure it belongs to the driver from the token
            const deviceToUpdate = await prisma.device.findUnique({
                where: { id: deviceId },
                include: {
                    driver: true, // Include the driver to check the ID
                },
            });

            if (!deviceToUpdate || deviceToUpdate.driverId !== tokenDriverId) {
                return res.status(404).send({
                    code: 404,
                    errors: [{ message: 'Device not found or not authorized to update this device' }],
                });
            }

            // Update the device with the new FCM token
            const updatedDevice = await prisma.device.update({
                where: { id: deviceId },
                data: { fcmToken: newFcmToken },
            });

            // Respond with the updated device
            return res.status(200).json({
                code: 200,
                data: updatedDevice,
            });
        } catch (error) {
            console.error('Request error', error);
            return res.status(500).send({
                code: 500,
                errors: [{ message: 'Error updating device' }],
            });
        }
    }

    async function _delete(req: NextApiRequest, res: NextApiResponse<JSONResponse<Device>>) {
        const session = await getServerSession(req, res, authOptions);
        const tokenDriverId = session?.user?.driverId;

        // Extract the FCM token from the request body or query
        const { fcmToken } = req.body;
        const driverId = req.query.id as string;

        // Validate the FCM token presence
        if (!fcmToken || !driverId) {
            return res.status(400).send({
                code: 400,
                errors: [{ message: 'FCM token and driver ID are required.' }],
            });
        }

        if (!tokenDriverId) {
            return res.status(401).send({
                code: 401,
                errors: [{ message: 'Unauthorized' }],
            });
        }

        // Check if the driver ID from the body matches the driver ID from the token
        if (driverId !== tokenDriverId) {
            return res.status(403).send({
                code: 403,
                errors: [{ message: 'Driver ID does not match token credentials.' }],
            });
        }

        try {
            const deviceToDelete = await prisma.device.findUnique({
                where: { fcmToken },
            });

            if (!deviceToDelete || deviceToDelete.driverId !== tokenDriverId) {
                return res.status(404).send({
                    code: 404,
                    errors: [{ message: 'Device not found' }],
                });
            }

            // Delete the device
            await prisma.device.delete({
                where: { fcmToken },
            });

            // Respond with success message
            return res.status(200).json({
                code: 200,
            });
        } catch (error) {
            console.error('Request error', error);
            return res.status(500).send({
                code: 500,
                errors: [{ message: 'Error deleting device' }],
            });
        }
    }
}

export default handler;
