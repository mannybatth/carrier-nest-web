import { Prisma, LoadStatus } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../interfaces/models';
import { DashboardStats } from '../../interfaces/stats';
import prisma from '../../lib/prisma';
import { authOptions } from './auth/[...nextauth]';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    // Get stats for last 30 days
    async function _get() {
        try {
            const session = await getServerSession(req, res, authOptions);

            const numberOfDaysToLoad = Number(req.query.timeframe) || 7;

            const start = new Date();
            start.setDate(start.getDate() - numberOfDaysToLoad);

            const loads = await prisma.load.findMany({
                where: {
                    carrierId: session.user.defaultCarrierId,
                    shipper: {
                        date: {
                            gte: start,
                        },
                    },
                },
                orderBy: {
                    shipper: {
                        date: 'asc',
                    },
                },
                include: {
                    customer: true,
                    shipper: true,
                    receiver: true,
                    invoice: true,
                    podDocuments: true,
                },
            });

            const totalInProgress = loads.filter((load) => load.status === LoadStatus.IN_PROGRESS).length;
            const totalReadyToInvoice = loads.filter(
                (load) => load.status === LoadStatus.POD_READY && !load.invoice,
            ).length;

            const totalAmountPaidStats = await prisma.invoicePayment.groupBy({
                by: ['carrierId'],
                where: {
                    carrierId: session.user.defaultCarrierId,
                    paidAt: {
                        gte: start,
                    },
                },
                _sum: {
                    amount: true,
                },
            });
            const totalPaid = totalAmountPaidStats.find((status) => status.carrierId === session.user.defaultCarrierId)
                ?._sum.amount;

            const stats: DashboardStats = {
                totalLoads: loads.length,
                totalInProgress: totalInProgress,
                totalReadyToInvoice: totalReadyToInvoice,
                totalRevenue: loads.reduce((acc, load) => load.rate.add(acc), new Prisma.Decimal(0))?.toNumber() || 0,
                totalPaid: totalPaid?.toNumber() || 0,
            };

            return res.status(200).json({
                code: 200,
                data: stats,
            });
        } catch (error) {
            console.log('error getting stats', error);
            return res.status(400).json({
                code: 400,
                errors: [{ message: error.message || JSON.stringify(error) }],
            });
        }
    }
}
