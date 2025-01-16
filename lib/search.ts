import { SearchResult } from 'interfaces/models';
import prisma from 'lib/prisma';

export async function loadSearch(
    query: string,
    carrierId: string,
): Promise<SearchResult<{ id: string; refNum: string }>[]> {
    const [_, loads]: [unknown, SearchResult<{ id: string; refNum: string }>[]] = await prisma.$transaction([
        prisma.$queryRaw`SET pg_trgm.similarity_threshold = 0.2`,
        prisma.$queryRaw`SELECT id, "refNum", similarity("refNum", ${query}) as sim FROM "Load" WHERE "refNum" % ${query} AND "carrierId" = ${carrierId} ORDER BY sim desc LIMIT 5`,
    ]);
    return loads.filter((c) => c.sim > 0);
}

export async function customerSearch(
    query: string,
    carrierId: string,
): Promise<SearchResult<{ id: string; name: string }>[]> {
    const [_, customers]: [unknown, SearchResult<{ id: string; name: string }>[]] = await prisma.$transaction([
        prisma.$queryRaw`SET pg_trgm.similarity_threshold = 0.2`,
        prisma.$queryRaw`SELECT id, name, similarity(name, ${query}) as sim FROM "Customer" WHERE name % ${query} AND "carrierId" = ${carrierId} ORDER BY sim DESC LIMIT 5`,
    ]);
    return customers.filter((c) => c.sim > 0).sort((a, b) => b.sim - a.sim);
}

export async function driverSearch(
    query: string,
    carrierId: string,
): Promise<SearchResult<{ id: string; name: string }>[]> {
    const [_, drivers]: [unknown, SearchResult<{ id: string; name: string }>[]] = await prisma.$transaction([
        prisma.$queryRaw`SET pg_trgm.similarity_threshold = 0.2`,
        prisma.$queryRaw`SELECT id, name, similarity(name, ${query}) as sim FROM "Driver" WHERE name % ${query} AND "carrierId" = ${carrierId} ORDER BY sim desc LIMIT 5`,
    ]);
    return drivers.filter((c) => c.sim > 0);
}
