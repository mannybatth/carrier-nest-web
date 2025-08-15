import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from 'redis';

// Environment-based rate limiting storage
let rateLimitStore: Map<string, { count: number; resetTime: number; blockedUntil?: number }> | null = null;
let redis: any = null;

// Initialize Redis connection
const initializeRedis = async () => {
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
        try {
            redis = await createClient({ url: process.env.REDIS_URL }).connect();
        } catch (error) {
            console.warn('Failed to initialize Redis for phone verification, falling back to Map storage:', error);
            redis = null;
            rateLimitStore = new Map<string, { count: number; resetTime: number; blockedUntil?: number }>();
        }
    } else {
        // Use Map for development/testing
        rateLimitStore = new Map<string, { count: number; resetTime: number; blockedUntil?: number }>();
    }
};

// Initialize storage on module load
initializeRedis();

// Rate limit: 5 failed attempts per hour per IP+phone combination
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes block after exceeding limit

// Additional IP-only rate limit to prevent spamming different phone numbers
const IP_RATE_LIMIT_MAX = 10; // Max 10 verification attempts per IP per hour (any phone numbers)
const IP_RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const IP_BLOCK_DURATION = 60 * 60 * 1000; // 1 hour block for IP abuse

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

// Check IP-only rate limit to prevent spamming different phone numbers
async function checkIPOnlyRateLimit(
    clientIP: string,
): Promise<{ allowed: boolean; remaining: number; blockedUntil?: number }> {
    const now = Date.now();
    const ipKey = `ip_verify_${clientIP}`;

    if (redis) {
        try {
            const current = await redis.get(ipKey);
            const parsedCurrent = current ? JSON.parse(current as string) : null;

            // Check if currently blocked
            if (parsedCurrent?.blockedUntil && now < parsedCurrent.blockedUntil) {
                return { allowed: false, remaining: 0, blockedUntil: parsedCurrent.blockedUntil };
            }

            if (!parsedCurrent || now > parsedCurrent.resetTime) {
                // First request or window expired - reset the counter
                const newEntry = { count: 0, resetTime: now + IP_RATE_LIMIT_WINDOW };
                await redis.setEx(ipKey, Math.ceil(IP_RATE_LIMIT_WINDOW / 1000), JSON.stringify(newEntry));
                return { allowed: true, remaining: IP_RATE_LIMIT_MAX };
            }

            if (parsedCurrent.count >= IP_RATE_LIMIT_MAX) {
                // Set block time if not already set
                if (!parsedCurrent.blockedUntil) {
                    parsedCurrent.blockedUntil = now + IP_BLOCK_DURATION;
                    const ttl = Math.ceil(Math.max(parsedCurrent.resetTime - now, IP_BLOCK_DURATION) / 1000);
                    await redis.setEx(ipKey, ttl, JSON.stringify(parsedCurrent));
                }
                return { allowed: false, remaining: 0, blockedUntil: parsedCurrent.blockedUntil };
            }

            return { allowed: true, remaining: IP_RATE_LIMIT_MAX - parsedCurrent.count };
        } catch (error) {
            console.error('Redis operation failed for IP verification, falling back to memory storage:', error);
            return checkIPOnlyRateLimitWithMap(clientIP);
        }
    } else {
        return checkIPOnlyRateLimitWithMap(clientIP);
    }
}

function checkIPOnlyRateLimitWithMap(clientIP: string): { allowed: boolean; remaining: number; blockedUntil?: number } {
    const now = Date.now();
    const ipKey = `ip_verify_${clientIP}`;

    if (!rateLimitStore) {
        rateLimitStore = new Map<string, { count: number; resetTime: number; blockedUntil?: number }>();
    }

    const current = rateLimitStore.get(ipKey);

    // Check if currently blocked
    if (current?.blockedUntil && now < current.blockedUntil) {
        return { allowed: false, remaining: 0, blockedUntil: current.blockedUntil };
    }

    if (!current || now > current.resetTime) {
        // First request or window expired - reset the counter
        rateLimitStore.set(ipKey, { count: 0, resetTime: now + IP_RATE_LIMIT_WINDOW });
        return { allowed: true, remaining: IP_RATE_LIMIT_MAX };
    }

    if (current.count >= IP_RATE_LIMIT_MAX) {
        // Set block time if not already set
        if (!current.blockedUntil) {
            current.blockedUntil = now + IP_BLOCK_DURATION;
            rateLimitStore.set(ipKey, current);
        }
        return { allowed: false, remaining: 0, blockedUntil: current.blockedUntil };
    }

    return { allowed: true, remaining: IP_RATE_LIMIT_MAX - current.count };
}

export async function checkPhoneVerificationRateLimit(
    clientIP: string,
    phoneNumber: string,
): Promise<{ allowed: boolean; remaining: number; blockedUntil?: number; reason?: string }> {
    const now = Date.now();
    const key = `phone_verify_${clientIP}_${phoneNumber}`;
    const ipKey = `ip_verify_${clientIP}`;

    // First check IP-only rate limit to prevent spamming different phone numbers
    const ipCheck = await checkIPOnlyRateLimit(clientIP);
    if (!ipCheck.allowed) {
        return {
            allowed: false,
            remaining: 0,
            blockedUntil: ipCheck.blockedUntil,
            reason: 'IP rate limit exceeded',
        };
    }

    if (redis) {
        // Use Redis
        try {
            const current = await redis.get(key);
            const parsedCurrent = current ? JSON.parse(current as string) : null;

            // Check if currently blocked
            if (parsedCurrent?.blockedUntil && now < parsedCurrent.blockedUntil) {
                return { allowed: false, remaining: 0, blockedUntil: parsedCurrent.blockedUntil };
            }

            if (!parsedCurrent || now > parsedCurrent.resetTime) {
                // First request or window expired - reset the counter
                const newEntry = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
                await redis.setEx(key, Math.ceil(RATE_LIMIT_WINDOW / 1000), JSON.stringify(newEntry));
                return { allowed: true, remaining: RATE_LIMIT_MAX };
            }

            if (parsedCurrent.count >= RATE_LIMIT_MAX) {
                // Set block time if not already set
                if (!parsedCurrent.blockedUntil) {
                    parsedCurrent.blockedUntil = now + BLOCK_DURATION;
                    const ttl = Math.ceil(Math.max(parsedCurrent.resetTime - now, BLOCK_DURATION) / 1000);
                    await redis.setEx(key, ttl, JSON.stringify(parsedCurrent));
                }
                return { allowed: false, remaining: 0, blockedUntil: parsedCurrent.blockedUntil };
            }

            return { allowed: true, remaining: RATE_LIMIT_MAX - parsedCurrent.count };
        } catch (error) {
            console.error('Redis operation failed for phone verification, falling back to memory storage:', error);
            return checkPhoneVerificationRateLimitWithMap(clientIP, phoneNumber);
        }
    } else {
        // Use Map storage
        return checkPhoneVerificationRateLimitWithMap(clientIP, phoneNumber);
    }
}

function checkPhoneVerificationRateLimitWithMap(
    clientIP: string,
    phoneNumber: string,
): { allowed: boolean; remaining: number; blockedUntil?: number; reason?: string } {
    const now = Date.now();
    const key = `phone_verify_${clientIP}_${phoneNumber}`;

    // First check IP-only rate limit
    const ipCheck = checkIPOnlyRateLimitWithMap(clientIP);
    if (!ipCheck.allowed) {
        return {
            allowed: false,
            remaining: 0,
            blockedUntil: ipCheck.blockedUntil,
            reason: 'IP rate limit exceeded',
        };
    }

    if (!rateLimitStore) {
        rateLimitStore = new Map<string, { count: number; resetTime: number; blockedUntil?: number }>();
    }

    // Clean up expired entries
    const keysToDelete: string[] = [];
    rateLimitStore.forEach((value, k) => {
        if (now > value.resetTime && (!value.blockedUntil || now > value.blockedUntil)) {
            keysToDelete.push(k);
        }
    });
    keysToDelete.forEach((k) => rateLimitStore!.delete(k));

    const current = rateLimitStore.get(key);

    // Check if currently blocked
    if (current?.blockedUntil && now < current.blockedUntil) {
        return { allowed: false, remaining: 0, blockedUntil: current.blockedUntil };
    }

    if (!current || now > current.resetTime) {
        // First request or window expired - reset the counter
        rateLimitStore.set(key, { count: 0, resetTime: now + RATE_LIMIT_WINDOW });
        return { allowed: true, remaining: RATE_LIMIT_MAX };
    }

    if (current.count >= RATE_LIMIT_MAX) {
        // Set block time if not already set
        if (!current.blockedUntil) {
            current.blockedUntil = now + BLOCK_DURATION;
            rateLimitStore.set(key, current);
        }
        return { allowed: false, remaining: 0, blockedUntil: current.blockedUntil };
    }

    return { allowed: true, remaining: RATE_LIMIT_MAX - current.count };
}

export async function incrementPhoneVerificationFailure(clientIP: string, phoneNumber: string): Promise<void> {
    const now = Date.now();
    const key = `phone_verify_${clientIP}_${phoneNumber}`;
    const ipKey = `ip_verify_${clientIP}`;

    if (redis) {
        // Use Redis
        try {
            // Increment phone-specific counter
            const current = await redis.get(key);
            const parsedCurrent = current ? JSON.parse(current as string) : null;

            if (!parsedCurrent || now > parsedCurrent.resetTime) {
                const newEntry = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
                await redis.setEx(key, Math.ceil(RATE_LIMIT_WINDOW / 1000), JSON.stringify(newEntry));
            } else {
                const updatedEntry = { ...parsedCurrent, count: parsedCurrent.count + 1 };

                // If we've hit the limit, set block time
                if (updatedEntry.count >= RATE_LIMIT_MAX) {
                    updatedEntry.blockedUntil = now + BLOCK_DURATION;
                }

                const ttl = Math.ceil(
                    Math.max(parsedCurrent.resetTime - now, updatedEntry.blockedUntil ? BLOCK_DURATION : 0) / 1000,
                );
                await redis.setEx(key, Math.max(ttl, 1), JSON.stringify(updatedEntry));
            }

            // Also increment IP-only counter
            const ipCurrent = await redis.get(ipKey);
            const parsedIPCurrent = ipCurrent ? JSON.parse(ipCurrent as string) : null;

            if (!parsedIPCurrent || now > parsedIPCurrent.resetTime) {
                const newIPEntry = { count: 1, resetTime: now + IP_RATE_LIMIT_WINDOW };
                await redis.setEx(ipKey, Math.ceil(IP_RATE_LIMIT_WINDOW / 1000), JSON.stringify(newIPEntry));
            } else {
                const updatedIPEntry = { ...parsedIPCurrent, count: parsedIPCurrent.count + 1 };

                // If we've hit the IP limit, set block time
                if (updatedIPEntry.count >= IP_RATE_LIMIT_MAX) {
                    updatedIPEntry.blockedUntil = now + IP_BLOCK_DURATION;
                }

                const ttl = Math.ceil(
                    Math.max(parsedIPCurrent.resetTime - now, updatedIPEntry.blockedUntil ? IP_BLOCK_DURATION : 0) /
                        1000,
                );
                await redis.setEx(ipKey, Math.max(ttl, 1), JSON.stringify(updatedIPEntry));
            }
        } catch (error) {
            console.error('Redis operation failed for phone verification, falling back to memory storage:', error);
            incrementPhoneVerificationFailureWithMap(clientIP, phoneNumber);
        }
    } else {
        // Use Map storage
        incrementPhoneVerificationFailureWithMap(clientIP, phoneNumber);
    }
}

function incrementPhoneVerificationFailureWithMap(clientIP: string, phoneNumber: string): void {
    const now = Date.now();
    const key = `phone_verify_${clientIP}_${phoneNumber}`;
    const ipKey = `ip_verify_${clientIP}`;

    if (!rateLimitStore) {
        rateLimitStore = new Map<string, { count: number; resetTime: number; blockedUntil?: number }>();
    }

    // Increment phone-specific counter
    const current = rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
        rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else {
        current.count++;

        // If we've hit the limit, set block time
        if (current.count >= RATE_LIMIT_MAX) {
            current.blockedUntil = now + BLOCK_DURATION;
        }

        rateLimitStore.set(key, current);
    }

    // Also increment IP-only counter
    const ipCurrent = rateLimitStore.get(ipKey);

    if (!ipCurrent || now > ipCurrent.resetTime) {
        rateLimitStore.set(ipKey, { count: 1, resetTime: now + IP_RATE_LIMIT_WINDOW });
    } else {
        ipCurrent.count++;

        // If we've hit the IP limit, set block time
        if (ipCurrent.count >= IP_RATE_LIMIT_MAX) {
            ipCurrent.blockedUntil = now + IP_BLOCK_DURATION;
        }

        rateLimitStore.set(ipKey, ipCurrent);
    }
}

export async function incrementPhoneVerificationAttempt(clientIP: string, phoneNumber: string): Promise<void> {
    // This function increments the IP counter for any verification attempt (including successful SMS sends)
    // to prevent spamming different phone numbers
    const now = Date.now();
    const ipKey = `ip_verify_${clientIP}`;

    if (redis) {
        try {
            const ipCurrent = await redis.get(ipKey);
            const parsedIPCurrent = ipCurrent ? JSON.parse(ipCurrent as string) : null;

            if (!parsedIPCurrent || now > parsedIPCurrent.resetTime) {
                const newIPEntry = { count: 1, resetTime: now + IP_RATE_LIMIT_WINDOW };
                await redis.setEx(ipKey, Math.ceil(IP_RATE_LIMIT_WINDOW / 1000), JSON.stringify(newIPEntry));
            } else {
                const updatedIPEntry = { ...parsedIPCurrent, count: parsedIPCurrent.count + 1 };

                // If we've hit the IP limit, set block time
                if (updatedIPEntry.count >= IP_RATE_LIMIT_MAX) {
                    updatedIPEntry.blockedUntil = now + IP_BLOCK_DURATION;
                }

                const ttl = Math.ceil(
                    Math.max(parsedIPCurrent.resetTime - now, updatedIPEntry.blockedUntil ? IP_BLOCK_DURATION : 0) /
                        1000,
                );
                await redis.setEx(ipKey, Math.max(ttl, 1), JSON.stringify(updatedIPEntry));
            }
        } catch (error) {
            console.error('Redis operation failed for IP verification tracking:', error);
            incrementPhoneVerificationAttemptWithMap(clientIP);
        }
    } else {
        incrementPhoneVerificationAttemptWithMap(clientIP);
    }
}

function incrementPhoneVerificationAttemptWithMap(clientIP: string): void {
    const now = Date.now();
    const ipKey = `ip_verify_${clientIP}`;

    if (!rateLimitStore) {
        rateLimitStore = new Map<string, { count: number; resetTime: number; blockedUntil?: number }>();
    }

    const ipCurrent = rateLimitStore.get(ipKey);

    if (!ipCurrent || now > ipCurrent.resetTime) {
        rateLimitStore.set(ipKey, { count: 1, resetTime: now + IP_RATE_LIMIT_WINDOW });
    } else {
        ipCurrent.count++;

        // If we've hit the IP limit, set block time
        if (ipCurrent.count >= IP_RATE_LIMIT_MAX) {
            ipCurrent.blockedUntil = now + IP_BLOCK_DURATION;
        }

        rateLimitStore.set(ipKey, ipCurrent);
    }
}

export function getRateLimitHeaders(remaining: number, blockedUntil?: number): Record<string, string> {
    const headers: Record<string, string> = {
        'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString(),
    };

    if (blockedUntil) {
        headers['X-RateLimit-Blocked-Until'] = new Date(blockedUntil).toISOString();
    }

    return headers;
}

export function createPhoneVerificationRateLimitResponse(remaining = 0, blockedUntil?: number): NextResponse {
    const message = blockedUntil
        ? `Too many failed verification attempts. Try again after ${new Date(blockedUntil).toLocaleTimeString()}.`
        : 'Rate limit exceeded. Try again later.';

    return NextResponse.json(
        {
            code: 429,
            errors: [{ message }],
            blockedUntil,
        },
        {
            status: 429,
            headers: getRateLimitHeaders(remaining, blockedUntil),
        },
    );
}
