import { NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';

export async function GET() {
    const session = await auth();

    if (!session?.user?.defaultCarrierId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const categories = await prisma.expenseCategory.findMany({
            where: {
                isActive: true,
            },
            orderBy: [{ group: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
        });

        // Group categories by their group
        const groupedCategories = categories.reduce((acc, category) => {
            if (!acc[category.group]) {
                acc[category.group] = [];
            }
            acc[category.group].push(category);
            return acc;
        }, {} as Record<string, typeof categories>);

        const response = NextResponse.json({
            categories,
            grouped: groupedCategories,
        });

        // Set cache headers since categories don't change frequently
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600'); // 5 min cache, 10 min stale
        response.headers.set('CDN-Cache-Control', 'public, s-maxage=1800'); // 30 min CDN cache

        return response;
    } catch (error) {
        console.error('Error fetching expense categories:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
