import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import prisma from 'lib/prisma';
import { createClient } from 'redis';

// Environment-based rate limiting storage
let rateLimitStore: Map<string, { count: number; resetTime: number }> | null = null;
let redis: any = null;

// Initialize Redis connection
const initializeRedis = async () => {
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
        try {
            redis = await createClient({ url: process.env.REDIS_URL }).connect();
            //console.log('Redis connected successfully');
        } catch (error) {
            console.warn('Failed to initialize Redis, falling back to Map storage:', error);
            redis = null;
            rateLimitStore = new Map<string, { count: number; resetTime: number }>();
        }
    } else {
        // Use Map for development/testing
        rateLimitStore = new Map<string, { count: number; resetTime: number }>();
    }
};

// Initialize storage on module load
initializeRedis();

// Rate limit: 5 requests per hour per IP
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

export function getClientIP(req: NextRequest): string {
    // Try different headers for IP address
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const clientIP = req.headers.get('x-client-ip');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    if (realIP) {
        return realIP;
    }
    if (clientIP) {
        return clientIP;
    }

    // Fallback to a default if no IP is found
    return 'unknown';
}

export async function checkRateLimit(clientIP: string): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const key = `driver_invoice_${clientIP}`;

    if (redis) {
        // Use Redis
        try {
            const current = await redis.get(key);
            const parsedCurrent = current ? JSON.parse(current as string) : null;

            if (!parsedCurrent || now > parsedCurrent.resetTime) {
                // First request or window expired
                const newEntry = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
                await redis.setEx(key, Math.ceil(RATE_LIMIT_WINDOW / 1000), JSON.stringify(newEntry));
                return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
            }

            if (parsedCurrent.count >= RATE_LIMIT_MAX) {
                return { allowed: false, remaining: 0 };
            }

            // Increment count
            const updatedEntry = { ...parsedCurrent, count: parsedCurrent.count + 1 };
            const ttl = Math.ceil((parsedCurrent.resetTime - now) / 1000);
            await redis.setEx(key, Math.max(ttl, 1), JSON.stringify(updatedEntry));

            return { allowed: true, remaining: RATE_LIMIT_MAX - updatedEntry.count };
        } catch (error) {
            console.error('Redis operation failed, falling back to memory storage:', error);
            // Fall back to Map storage if Redis fails
            return checkRateLimitWithMap(clientIP);
        }
    } else {
        // Use Map storage
        return checkRateLimitWithMap(clientIP);
    }
}

function checkRateLimitWithMap(clientIP: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const key = `driver_invoice_${clientIP}`;

    if (!rateLimitStore) {
        rateLimitStore = new Map<string, { count: number; resetTime: number }>();
    }

    // Clean up expired entries
    const keysToDelete: string[] = [];
    rateLimitStore.forEach((value, k) => {
        if (now > value.resetTime) {
            keysToDelete.push(k);
        }
    });
    keysToDelete.forEach((k) => rateLimitStore!.delete(k));

    const current = rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
        // First request or window expired
        rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
    }

    if (current.count >= RATE_LIMIT_MAX) {
        return { allowed: false, remaining: 0 };
    }

    // Increment count
    current.count++;
    rateLimitStore.set(key, current);

    return { allowed: true, remaining: RATE_LIMIT_MAX - current.count };
}

export async function incrementRateLimit(clientIP: string): Promise<void> {
    const now = Date.now();
    const key = `driver_invoice_${clientIP}`;

    if (redis) {
        // Use Redis
        try {
            const current = await redis.get(key);
            const parsedCurrent = current ? JSON.parse(current as string) : null;

            if (!parsedCurrent || now > parsedCurrent.resetTime) {
                const newEntry = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
                await redis.setEx(key, Math.ceil(RATE_LIMIT_WINDOW / 1000), JSON.stringify(newEntry));
            } else {
                const updatedEntry = { ...parsedCurrent, count: parsedCurrent.count + 1 };
                const ttl = Math.ceil((parsedCurrent.resetTime - now) / 1000);
                await redis.setEx(key, Math.max(ttl, 1), JSON.stringify(updatedEntry));
            }
        } catch (error) {
            console.error('Redis operation failed, falling back to memory storage:', error);
            incrementRateLimitWithMap(clientIP);
        }
    } else {
        // Use Map storage
        incrementRateLimitWithMap(clientIP);
    }
}

function incrementRateLimitWithMap(clientIP: string): void {
    const now = Date.now();
    const key = `driver_invoice_${clientIP}`;

    if (!rateLimitStore) {
        rateLimitStore = new Map<string, { count: number; resetTime: number }>();
    }

    const current = rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
        rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else {
        current.count++;
        rateLimitStore.set(key, current);
    }
}

export function getRateLimitHeaders(remaining: number): Record<string, string> {
    return {
        'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString(),
    };
}

export function createRateLimitResponse(remaining = 0): NextResponse {
    return NextResponse.json(
        {
            code: 429,
            errors: [{ message: 'Rate limit exceeded. Try again later.' }],
        },
        {
            status: 429,
            headers: getRateLimitHeaders(remaining),
        },
    );
}

export async function validateDriverPhone(
    invoiceId: string,
    driverPhone: string,
    clientIP: string,
    rateLimit: { allowed: boolean; remaining: number },
): Promise<{ success: boolean; invoice?: any; response?: NextResponse }> {
    try {
        const invoice = await prisma.driverInvoice.findUnique({
            where: { id: invoiceId },
            include: {
                driver: {
                    select: {
                        id: true,
                        phone: true,
                    },
                },
            },
        });

        if (!invoice) {
            await incrementRateLimit(clientIP);
            return {
                success: false,
                response: NextResponse.json(
                    { code: 404, errors: [{ message: 'Invoice not found' }] },
                    {
                        status: 404,
                        headers: getRateLimitHeaders(Math.max(0, rateLimit.remaining - 1)),
                    },
                ),
            };
        }

        // Normalize phone numbers for comparison (remove all non-digits)
        const normalizePhone = (phone: string): string => {
            return phone.replace(/\D/g, '');
        };

        const invoiceDriverPhone = normalizePhone(invoice.driver.phone || '');
        const providedDriverPhone = normalizePhone(driverPhone);

        if (invoiceDriverPhone !== providedDriverPhone) {
            await incrementRateLimit(clientIP);
            return {
                success: false,
                response: NextResponse.json(
                    { code: 403, errors: [{ message: 'Driver phone does not match invoice' }] },
                    {
                        status: 403,
                        headers: getRateLimitHeaders(Math.max(0, rateLimit.remaining - 1)),
                    },
                ),
            };
        }

        return { success: true, invoice };
    } catch (error) {
        console.error('Error validating driver phone:', error);
        await incrementRateLimit(clientIP);
        return {
            success: false,
            response: NextResponse.json(
                { code: 500, errors: [{ message: 'Failed to validate phone number' }] },
                {
                    status: 500,
                    headers: getRateLimitHeaders(Math.max(0, rateLimit.remaining - 1)),
                },
            ),
        };
    }
}

export async function parsePhoneAuthRequest(req: NextRequest): Promise<{
    driverPhone?: string;
    error?: NextResponse;
}> {
    try {
        const body = await req.json();
        return { driverPhone: body.driverPhone };
    } catch (error) {
        return {
            error: NextResponse.json({ code: 400, errors: [{ message: 'Invalid request body' }] }, { status: 400 }),
        };
    }
}
