import { Load, Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { SearchResult } from 'interfaces/models';
import { loadSearch } from 'lib/search';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const query = req.nextUrl.searchParams.get('q') as string;
    const fullText = req.nextUrl.searchParams.get('fullText') === 'true';
    const loads = fullText ? await fullTextSearch(query) : await search(query, req.auth.user.defaultCarrierId);

    return NextResponse.json({
        code: 200,
        data: { loads },
    });
});

function fullTextSearch(query: string): Prisma.PrismaPromise<Load[]> {
    return prisma.load.findMany({
        where: {
            refNum: {
                search: query,
            },
        },
    });
}

async function search(query: string, carrierId: string): Promise<SearchResult<{ id: string; refNum: string }>[]> {
    return loadSearch(query, carrierId);
}
