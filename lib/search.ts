import { SearchResult } from 'interfaces/models';
import prisma from 'lib/prisma';

export async function loadSearch(
    query: string,
    carrierId: string,
): Promise<
    SearchResult<{
        id: string;
        refNum: string;
        stopName: string;
        stopCity: string;
        stopState: string;
        stopType: string;
    }>[]
> {
    const [_, loads]: [
        unknown,
        SearchResult<{
            id: string;
            refNum: string;
            stopName: string;
            stopCity: string;
            stopState: string;
            stopType: string;
            sim: number;
        }>[],
    ] = await prisma.$transaction([
        prisma.$queryRaw`SET pg_trgm.similarity_threshold = 0.2`,
        prisma.$queryRaw`
            SELECT DISTINCT ON (l."refNum")
                   l.id,
                   -- Apply conditional empty string if similarity is lower than 0.2 for refNum, stopName, and stopCity
                   CASE
                       WHEN GREATEST(similarity(l."refNum", ${query}), similarity(ls."name", ${query}), similarity(ls."city", ${query})) >= 0.2
                       THEN l."refNum"
                       ELSE l."refNum"
                   END as "refNum",
                   CASE
                       WHEN similarity(ls."name", ${query}) >= 0.2
                       THEN ls."name"
                       ELSE ''
                   END as "stopName",
                   CASE
                       WHEN similarity(ls."city", ${query}) >= 0.2
                       THEN ls."city"
                       ELSE ''
                   END as "stopCity",
                   ls."state" as "stopState", -- Return the state without similarity lookup
                   ls."type" as "stopType", -- Return the LoadStop type without lookup
                   GREATEST(
                       similarity(l."refNum", ${query}),
                       similarity(ls."name", ${query}),
                       similarity(ls."city", ${query})
                   ) as sim
            FROM "Load" l
            LEFT JOIN "LoadStop" ls ON
                ls.id = l."shipperId" OR
                ls.id = l."receiverId" OR
                ls."loadIdAsStop" = l.id
            WHERE (
                l."refNum" % ${query} OR
                ls."name" % ${query} OR
                ls."city" % ${query} OR
                l."refNum" ILIKE ${'%' + query + '%'} OR
                ls."name" ILIKE ${'%' + query + '%'} OR
                ls."city" ILIKE ${'%' + query + '%'} OR
                EXISTS (
                    SELECT 1
                    FROM unnest(string_to_array(${query}, ' ')) as q
                    WHERE ls."name" % q OR ls."city" % q
                )
            )
              AND l."carrierId" = ${carrierId}
            ORDER BY l."refNum", sim DESC
            LIMIT 5
        `,
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
