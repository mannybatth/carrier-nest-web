import { Prisma, Location } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { SearchResult } from 'interfaces/models';

async function locationSearch(query: string, carrierId: string): Promise<SearchResult<{ id: string; name: string }>[]> {
    const [_, locations]: [unknown, SearchResult<{ id: string; name: string }>[]] = await prisma.$transaction([
        prisma.$queryRaw`SET pg_trgm.similarity_threshold = 0.2`,
        prisma.$queryRaw`SELECT id, name, similarity(name, ${query}) as sim FROM "Location" WHERE name % ${query} AND "carrierId" = ${carrierId} ORDER BY sim desc LIMIT 5`,
    ]);
    return locations.filter((c) => c.sim > 0);
}

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const query = req.nextUrl.searchParams.get('q') as string;
    const fullText = req.nextUrl.searchParams.get('fullText') === 'true';

    try {
        const locations = fullText ? await fullTextSearch(query) : await search(query, req.auth.user.defaultCarrierId);
        return NextResponse.json({ code: 200, data: { locations } });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});

function fullTextSearch(query: string): Prisma.PrismaPromise<Location[]> {
    return prisma.location.findMany({
        where: {
            name: {
                search: query,
            },
        },
    });
}

async function search(query: string, carrierId: string): Promise<SearchResult<{ id: string; name: string }>[]> {
    return locationSearch(query, carrierId);
}
