import { Driver, Prisma } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { SearchResult } from 'interfaces/models';
import { driverSearch } from 'lib/search';

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const query = req.nextUrl.searchParams.get('q') as string;
    const fullText = req.nextUrl.searchParams.get('fullText') === 'true';
    const drivers = fullText ? await fullTextSearch(query) : await search(query, req.auth.user.defaultCarrierId);

    return NextResponse.json({
        code: 200,
        data: { drivers },
    });
});

function fullTextSearch(query: string): Prisma.PrismaPromise<Driver[]> {
    return prisma.driver.findMany({
        where: {
            name: {
                search: query,
            },
        },
    });
}

async function search(query: string, carrierId: string): Promise<SearchResult<{ id: string; name: string }>[]> {
    return driverSearch(query, carrierId);
}
