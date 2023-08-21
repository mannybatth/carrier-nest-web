import { Storage } from '@google-cloud/storage';
import { Driver, LoadActivityAction, LoadDocument } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../../../../interfaces/models';
import prisma from '../../../../../lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _delete() {
        const session = await getServerSession(req, res, authOptions);
        const driverId = req.query.driverId as string;
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
                ...(driver && { drivers: { some: { id: driver.id } } }),
            },
        });

        if (!load) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Load not found' }],
            });
        }

        const documentId = String(req.query.did);
        const isPod = req.query.isPod === 'true';
        const isRatecon = req.query.isRatecon === 'true';

        const document = await prisma.loadDocument.findFirst({
            where: {
                id: documentId,
                ...(!(isPod || isRatecon) && { loadId: load.id }),
                ...(isPod && { loadIdForPodDoc: load.id }),
                ...(isRatecon && { loadIdForRatecon: load.id }),
                ...(driver && { driverId: driver.id }),
            },
        });

        if (!document) {
            return res.status(404).send({
                code: 404,
                errors: [{ message: 'Document not found' }],
            });
        }

        deleteDocumentFromGCS(document);

        await prisma.loadDocument.delete({
            where: {
                id: documentId,
            },
        });

        await prisma.loadActivity.create({
            data: {
                load: {
                    connect: {
                        id: load.id,
                    },
                },
                carrierId: load.carrierId,
                action: isPod ? LoadActivityAction.REMOVE_POD : LoadActivityAction.REMOVE_DOCUMENT,
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
                actionDocumentFileName: document.fileName,
            },
        });

        return res.status(200).send({
            code: 200,
            data: { result: 'Document deleted' },
        });
    }
}

export const deleteDocumentFromGCS = async (document: LoadDocument): Promise<void> => {
    const storage = new Storage({
        projectId: process.env.GCP_PROJECT_ID,
        credentials: {
            client_email: process.env.GCP_CLIENT_EMAIL,
            private_key: process.env.GCP_PRIVATE_KEY,
        },
    });

    const bucket = storage.bucket(process.env.GCP_LOAD_DOCS_BUCKET_NAME);

    const file = bucket.file(document.fileKey);

    await file.delete();
};
