import { Prisma, LoadStatus } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const carrierId = req.auth.user.defaultCarrierId;
        const numberOfDaysToLoad = Number(req.nextUrl.searchParams.get('timeframe')) || 7;

        const start = new Date();
        start.setDate(start.getDate() - numberOfDaysToLoad);

        const loads = await prisma.load.findMany({
            where: {
                carrierId: carrierId,
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
                carrierId: carrierId,
                paidAt: {
                    gte: start,
                },
            },
            _sum: {
                amount: true,
            },
        });
        const totalPaid = totalAmountPaidStats.find((status) => status.carrierId === carrierId)?._sum.amount;

        const stats = {
            totalLoads: loads.length,
            totalInProgress: totalInProgress,
            totalReadyToInvoice: totalReadyToInvoice,
            totalRevenue: loads.reduce((acc, load) => load.rate.add(acc), new Prisma.Decimal(0))?.toNumber() || 0,
            totalPaid: totalPaid?.toNumber() || 0,
        };

        return NextResponse.json({ code: 200, data: stats });
    } catch (error) {
        console.log('error getting stats', error);
        return NextResponse.json(
            { code: 400, errors: [{ message: error.message || JSON.stringify(error) }] },
            { status: 400 },
        );
    }
});
