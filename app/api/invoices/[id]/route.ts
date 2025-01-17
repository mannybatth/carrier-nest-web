import { Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { Session } from 'next-auth';
import { ExpandedInvoice, JSONResponse } from 'interfaces/models';

export const GET = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const session = req.auth;
    const invoiceId = context.params.id;

    const response = await getInvoice({ session, invoiceId, req });
    return NextResponse.json(response, { status: response.code });
});

export const PUT = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const session = req.auth;
    const invoiceId = context.params.id;
    const invoiceData = await req.json();

    const invoice = await prisma.invoice.findFirst({
        where: {
            id: invoiceId,
            carrierId: session.user.defaultCarrierId,
        },
        include: {
            payments: {
                select: {
                    id: true,
                    amount: true,
                    paidAt: true,
                },
            },
        },
    });

    if (!invoice) {
        return NextResponse.json(
            {
                code: 404,
                errors: [{ message: 'Invoice not found' }],
            },
            { status: 404 },
        );
    }

    const dueDate = new Date(invoiceData.invoicedAt);
    dueDate.setDate(dueDate.getDate() + invoiceData.dueNetDays);

    const paidAmount = invoice.payments.reduce((acc, payment) => acc.add(payment.amount), new Prisma.Decimal(0));
    let remainingAmount = new Prisma.Decimal(invoiceData.totalAmount).sub(paidAmount);

    if (remainingAmount.isNegative()) {
        remainingAmount = new Prisma.Decimal(0);
    }

    const updatedInvoice = await prisma.invoice.update({
        where: {
            id: invoiceId,
        },
        data: {
            invoiceNum: invoiceData.invoiceNum,
            totalAmount: invoiceData.totalAmount || 0,
            remainingAmount: remainingAmount,
            paidAmount: paidAmount,
            invoicedAt: invoiceData.invoicedAt,
            dueDate,
            dueNetDays: invoiceData.dueNetDays || 0,
            carrier: {
                connect: {
                    id: session.user.defaultCarrierId,
                },
            },
            extraItems: {
                deleteMany: {},
                create: invoiceData.extraItems.map((extraItem: { title: string; amount: number }) => ({
                    title: extraItem.title,
                    amount: extraItem.amount,
                })),
            },
        },
    });

    return NextResponse.json(
        {
            code: 200,
            data: { updatedInvoice },
        },
        { status: 200 },
    );
});

export const DELETE = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    const session = req.auth;
    const invoiceId = context.params.id;

    const invoice = await prisma.invoice.findFirst({
        where: {
            id: invoiceId,
            carrierId: session.user.defaultCarrierId,
        },
    });

    if (!invoice) {
        return NextResponse.json(
            {
                code: 404,
                errors: [{ message: 'Invoice not found' }],
            },
            { status: 404 },
        );
    }

    await prisma.invoice.delete({
        where: {
            id: invoiceId,
        },
    });

    return NextResponse.json(
        {
            code: 200,
            data: { result: 'Invoice deleted' },
        },
        { status: 200 },
    );
});

const getInvoice = async ({
    session,
    invoiceId,
    req,
}: {
    session?: Session;
    invoiceId: string;
    req: NextAuthRequest;
}): Promise<JSONResponse<{ invoice: ExpandedInvoice }>> => {
    const expand = req.nextUrl.searchParams.get('expand');
    const expandLoad = expand?.includes('load');
    const expandExtraItems = expand?.includes('extraItems');
    const expandPayments = expand?.includes('payments');

    const invoice = await prisma.invoice.findFirst({
        where: {
            id: invoiceId,
            carrierId: session.user.defaultCarrierId,
        },
        include: {
            ...(expandLoad
                ? {
                      load: {
                          include: {
                              customer: true,
                              shipper: true,
                              receiver: true,
                              stops: true,
                              loadDocuments: true,
                              podDocuments: true,
                              rateconDocument: true,
                          },
                      },
                  }
                : {}),
            ...(expandExtraItems
                ? {
                      extraItems: {
                          select: {
                              id: true,
                              title: true,
                              amount: true,
                          },
                      },
                  }
                : {}),
            ...(expandPayments
                ? {
                      payments: {
                          select: {
                              id: true,
                              amount: true,
                              paidAt: true,
                          },
                      },
                  }
                : {}),
        },
    });

    if (!invoice) {
        return {
            code: 404,
            errors: [{ message: 'Invoice not found' }],
        };
    }

    return {
        code: 200,
        data: { invoice },
    };
};
