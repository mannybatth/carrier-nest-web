import { Customer } from '@prisma/client';
import { auth } from 'auth';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import { SearchResult } from 'interfaces/models';
import prisma from 'lib/prisma';
import { customerSearch } from 'lib/search';

async function fullTextSearch(query: string): Promise<Customer[]> {
    return prisma.customer.findMany({
        where: {
            name: {
                search: query,
            },
        },
    });
}

async function search(query: string, req: NextAuthRequest): Promise<SearchResult<{ id: string; name: string }>[]> {
    const session = req.auth;
    return customerSearch(query, session.user.defaultCarrierId);
}

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const q = req.nextUrl.searchParams.get('q') as string;
    const fullText = req.nextUrl.searchParams.get('fullText') === 'true';
    const customers = fullText ? await fullTextSearch(q) : await search(q, req);

    return NextResponse.json({
        code: 200,
        data: { customers },
    });
});
