import { Driver, LoadActivityAction, LoadDocument } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'POST':
            return _post();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _post() {
        const session = await getServerSession(req, res, authOptions);
        const driverId = req.body.driverId as string;
        let driver: Driver = null;

        if (driverId) {
            driver = await prisma.driver.findFirst({
                where: {
                    id: driverId,
                },
            });

            if (!driver) {
                return res.status(404).send({
                    code: 404,
                    errors: [{ message: 'Driver not found' }],
                });
            }
        }

        const load = await prisma.load.findFirst({
            where: {
                id: String(req.query.id),
                ...(!driver && { carrierId: session.user.defaultCarrierId }),
                ...(driver && { driverAssignments: { some: { driverId: driver.id } } }),
            },
        });

        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const docData = req.body.loadDocument as LoadDocument;
        const isPod = req.body.isPod === true;
        const isRatecon = req.body.isRatecon === true;
        const isNormalDoc = !isPod && !isRatecon;

        const loadDocument = await prisma.loadDocument.create({
            data: {
                ...(isNormalDoc && {
                    load: {
                        connect: {
                            id: load.id,
                        },
                    },
                }),
                ...(isPod && {
                    loadForPodDoc: {
                        connect: {
                            id: load.id,
                        },
                    },
                }),
                ...(isRatecon && {
                    loadForRateCon: {
                        connect: {
                            id: load.id,
                        },
                    },
                }),
                ...(driver && {
                    driver: {
                        connect: {
                            id: driver.id,
                        },
                    },
                    carrierId: driver.carrierId,
                }),
                ...(!driver && {
                    user: {
                        connect: {
                            id: session.user.id,
                        },
                    },
                    carrierId: session.user.defaultCarrierId,
                }),
                fileKey: docData.fileKey,
                fileUrl: docData.fileUrl,
                fileName: docData.fileName,
                fileType: docData.fileType,
                fileSize: docData.fileSize,
            },
        });

        const longitude = req.body?.longitude as number;
        const latitude = req.body?.latitude as number;

        await prisma.loadActivity.create({
            data: {
                load: {
                    connect: {
                        id: load.id,
                    },
                },
                carrierId: load.carrierId,
                action: isPod ? LoadActivityAction.UPLOAD_POD : LoadActivityAction.UPLOAD_DOCUMENT,
                ...(!driver
                    ? {
                          actorUser: {
                              connect: {
                                  id: session.user.id,
                              },
                          },
                      }
                    : {}),
                ...(driverId
                    ? {
                          actorDriver: {
                              connect: {
                                  id: driverId,
                              },
                          },
                      }
                    : {}),
                ...(driver ? { actorDriverName: driver?.name } : {}),
                actionDocument: {
                    connect: {
                        id: loadDocument.id,
                    },
                },
                actionDocumentFileName: loadDocument.fileName,
                ...(longitude ? { longitude } : {}),
                ...(latitude ? { latitude } : {}),
            },
        });

        return res.status(200).json({
            code: 200,
            data: { loadDocument },
        });
    }
}
