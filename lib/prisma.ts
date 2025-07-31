// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

// Check if POSTGRES_PRISMA_URL is available (the actual env var used)
if (!process.env.POSTGRES_PRISMA_URL) {
    throw new Error('POSTGRES_PRISMA_URL environment variable is not set');
}

const prismaConfig = {
    // log: ['query', 'error'], // Uncomment for debugging
    datasources: {
        db: {
            url: process.env.POSTGRES_PRISMA_URL,
        },
    },
};

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient(prismaConfig);
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient(prismaConfig);
    }
    prisma = global.prisma;
}

// Helper function to safely disconnect Prisma
export const disconnectPrisma = async () => {
    try {
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error disconnecting Prisma:', error);
    }
};

// Helper function to check Prisma connection health
export const checkPrismaConnection = async (): Promise<boolean> => {
    try {
        // Use a timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Connection check timeout')), 5000);
        });

        const queryPromise = prisma.$queryRaw`SELECT 1`;

        await Promise.race([queryPromise, timeoutPromise]);
        return true;
    } catch (error) {
        console.error('Prisma connection check failed:', error);
        return false;
    }
};

// Helper function to reconnect Prisma if needed
export const ensurePrismaConnection = async (): Promise<boolean> => {
    try {
        const isConnected = await checkPrismaConnection();
        if (!isConnected) {
            // Force disconnect first to clear any stale connections
            try {
                await prisma.$disconnect();
            } catch (disconnectError) {
                console.warn('Error during forced disconnect:', disconnectError);
            }

            // Wait a bit before reconnecting
            await new Promise((resolve) => setTimeout(resolve, 1000));

            await prisma.$connect();
            return await checkPrismaConnection();
        }
        return true;
    } catch (error) {
        console.error('Failed to ensure Prisma connection:', error);
        return false;
    }
};

export default prisma;
