import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { calcPaginationMetadata } from 'lib/pagination';

export const GET = auth(async (req: NextAuthRequest, context: { params: { id: string } }) => {
    if (!req.auth) {
        return NextResponse.json({ code: 401, errors: [{ message: 'Not authenticated' }] }, { status: 401 });
    }

    const loadId = context.params.id;
    const limit = req.nextUrl.searchParams.get('limit') !== null ? Number(req.nextUrl.searchParams.get('limit')) : 10;
    const offset = req.nextUrl.searchParams.get('offset') !== null ? Number(req.nextUrl.searchParams.get('offset')) : 0;

    try {
        const total = await prisma.loadActivity.count({
            where: {
                loadId: loadId,
                carrierId: req.auth.user.defaultCarrierId,
            },
        });

        const metadata = calcPaginationMetadata({ total, limit, offset });

        const activity = await prisma.loadActivity.findMany({
            where: {
                loadId: loadId,
                carrierId: req.auth.user.defaultCarrierId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            skip: offset,
            include: {
                actorUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                actorDriver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                actionDocument: {
                    select: {
                        id: true,
                        fileKey: true,
                        fileUrl: true,
                        fileName: true,
                        fileType: true,
                    },
                },
                actionDriver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json({
            code: 200,
            data: {
                metadata,
                activity,
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ code: 500, errors: [{ message: 'Internal server error' }] }, { status: 500 });
    }
});
