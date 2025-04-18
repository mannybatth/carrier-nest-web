import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const nextInvoiceNum = await getNextInvoiceNum(req.auth.user.defaultCarrierId);
        return NextResponse.json({
            success: true,
            data: {
                nextInvoiceNum,
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
});

async function getNextInvoiceNum(carrierId: string): Promise<number> {
    const lastInvoice = await prisma.driverInvoice.findFirst({
        where: {
            carrierId,
        },
        orderBy: {
            invoiceNum: 'desc',
        },
    });

    if (!lastInvoice) {
        return 1000;
    }

    return lastInvoice.invoiceNum + 1;
}
