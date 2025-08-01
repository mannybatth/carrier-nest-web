import prisma from '../prisma';
import { UserRole, getRolePermissions } from '../../interfaces/models';
import { createClient } from 'redis';

// Environment-based cache storage
let fallbackCache: Map<string, CachedUserData> | null = null;
let redis: any = null;

// Cache data interface
interface CachedUserData {
    users: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        isEligible: boolean;
    }>;
    timestamp: number;
    carrierId: string;
}

// Initialize Redis connection
const initializeRedis = async () => {
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
        try {
            redis = await createClient({ url: process.env.REDIS_URL }).connect();
        } catch (error) {
            redis = null;
            fallbackCache = new Map<string, CachedUserData>();
        }
    } else {
        // Use Map for development/testing
        fallbackCache = new Map<string, CachedUserData>();
    }
};

// Initialize storage on module load
initializeRedis();

class NotificationTargetingCache {
    private static readonly TTL_SECONDS = 5 * 60; // 5 minutes in seconds
    private static readonly KEY_PREFIX = 'notification_targeting:';

    static async get(carrierId: string): Promise<CachedUserData | null> {
        const key = `${this.KEY_PREFIX}${carrierId}`;

        if (redis) {
            try {
                const cached = await redis.get(key);
                if (!cached) return null;

                const data: CachedUserData = JSON.parse(cached);
                const isExpired = Date.now() - data.timestamp > this.TTL_SECONDS * 1000;

                if (isExpired) {
                    await redis.del(key);
                    return null;
                }

                return data;
            } catch (error) {
                return this.getFallback(carrierId);
            }
        } else {
            return this.getFallback(carrierId);
        }
    }

    static async set(carrierId: string, data: CachedUserData): Promise<void> {
        const key = `${this.KEY_PREFIX}${carrierId}`;
        const cacheData = {
            ...data,
            timestamp: Date.now(),
        };

        if (redis) {
            try {
                await redis.setEx(key, this.TTL_SECONDS, JSON.stringify(cacheData));
            } catch (error) {
                this.setFallback(carrierId, cacheData);
            }
        } else {
            this.setFallback(carrierId, cacheData);
        }
    }

    static async invalidate(carrierId: string): Promise<void> {
        const key = `${this.KEY_PREFIX}${carrierId}`;

        if (redis) {
            try {
                await redis.del(key);
            } catch (error) {
                this.invalidateFallback(carrierId);
            }
        } else {
            this.invalidateFallback(carrierId);
        }
    }

    static async clear(): Promise<void> {
        if (redis) {
            try {
                const keys = await redis.keys(`${this.KEY_PREFIX}*`);
                if (keys.length > 0) {
                    await redis.del(keys);
                }
            } catch (error) {
                this.clearFallback();
            }
        } else {
            this.clearFallback();
        }
    }

    // Fallback methods for when Redis is not available
    private static getFallback(carrierId: string): CachedUserData | null {
        if (!fallbackCache) {
            fallbackCache = new Map<string, CachedUserData>();
        }

        const cached = fallbackCache.get(carrierId);
        if (!cached) return null;

        const isExpired = Date.now() - cached.timestamp > this.TTL_SECONDS * 1000;
        if (isExpired) {
            fallbackCache.delete(carrierId);
            return null;
        }

        return cached;
    }

    private static setFallback(carrierId: string, data: CachedUserData): void {
        if (!fallbackCache) {
            fallbackCache = new Map<string, CachedUserData>();
        }
        fallbackCache.set(carrierId, data);
    }

    private static invalidateFallback(carrierId: string): void {
        if (!fallbackCache) return;
        fallbackCache.delete(carrierId);
    }

    private static clearFallback(): void {
        if (!fallbackCache) return;
        fallbackCache.clear();
    }
}

export class NotificationTargetingService {
    /**
     * Get all users in a carrier who should receive assignment notifications
     * Optimized with Redis caching and minimal database calls
     */
    static async getNotificationTargets(params: {
        carrierId: string;
        assignmentId?: string;
        driverId?: string;
        bypassCache?: boolean;
    }) {
        const { carrierId, bypassCache = false } = params;

        // Check cache first (unless bypassed)
        if (!bypassCache) {
            const cached = await NotificationTargetingCache.get(carrierId);
            if (cached) {
                return cached.users.filter((user) => user.isEligible);
            }
        }

        // Cache miss - fetch from database

        try {
            // Single optimized database query with all necessary data
            const users = await prisma.user.findMany({
                where: {
                    defaultCarrierId: carrierId,
                    // Only get users with valid roles
                    role: {
                        in: Object.values(UserRole),
                    },
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
                // Optimize query performance
                orderBy: {
                    role: 'asc', // Admins first, then dispatchers, etc.
                },
            });

            // Process eligibility in memory (much faster than multiple DB calls)
            const processedUsers = users.map((user) => {
                const userRole = user.role as UserRole;
                const permissions = getRolePermissions(userRole);

                // Determine eligibility based on role and permissions
                const isEligible =
                    userRole === UserRole.ADMIN ||
                    userRole === UserRole.DISPATCHER ||
                    (permissions &&
                        (permissions.viewAssignments ||
                            permissions.manageAssignments ||
                            permissions.updateAssignmentProgress)) ||
                    false;

                return {
                    id: user.id,
                    name: user.name || '',
                    email: user.email || '',
                    role: user.role,
                    isEligible,
                };
            });

            // Cache the results for future use
            await NotificationTargetingCache.set(carrierId, {
                users: processedUsers,
                timestamp: Date.now(),
                carrierId,
            });

            // Return only eligible users
            return processedUsers.filter((user) => user.isEligible);
        } catch (error) {
            console.error(`Error fetching notification targets for carrier ${carrierId}:`, error);
            // Fallback: return empty array rather than throwing
            return [];
        }
    }

    /**
     * Get company users related to a specific driver (optimized)
     * Uses cached results when possible
     */
    static async getDriverRelatedUsers(params: { carrierId: string; driverId: string; bypassCache?: boolean }) {
        const { carrierId, driverId, bypassCache = false } = params;

        // For now, return all eligible users in the carrier
        // Future enhancement: filter by driver-specific relationships
        return this.getNotificationTargets({
            carrierId,
            driverId,
            bypassCache,
        });
    }

    /**
     * Batch check if multiple users should receive notifications
     * Much more efficient than individual checks
     */
    static async batchCheckUserEligibility(params: {
        userIds: string[];
        carrierId: string;
        assignmentId: string;
        driverId: string;
    }): Promise<Map<string, boolean>> {
        const { userIds, carrierId } = params;
        const results = new Map<string, boolean>();

        if (userIds.length === 0) {
            return results;
        }

        try {
            // Get all eligible users for this carrier (uses cache)
            const eligibleUsers = await this.getNotificationTargets({ carrierId });
            const eligibleUserIds = new Set(eligibleUsers.map((user) => user.id));

            // Check each requested user ID
            for (const userId of userIds) {
                results.set(userId, eligibleUserIds.has(userId));
            }

            return results;
        } catch (error) {
            console.error('Error in batch user eligibility check:', error);
            // Fallback: mark all as ineligible
            for (const userId of userIds) {
                results.set(userId, false);
            }
            return results;
        }
    }

    /**
     * Check if a user should receive notifications for a specific assignment (optimized)
     * Uses cached data and avoids unnecessary database calls
     */
    static async shouldUserReceiveAssignmentNotification(params: {
        userId: string;
        carrierId: string;
        assignmentId: string;
        driverId: string;
    }): Promise<boolean> {
        const { userId, carrierId } = params;

        try {
            // Use batch check for efficiency (even for single user)
            const results = await this.batchCheckUserEligibility({
                userIds: [userId],
                carrierId,
                assignmentId: params.assignmentId,
                driverId: params.driverId,
            });

            return results.get(userId) || false;
        } catch (error) {
            console.error(`Error checking user eligibility for user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Utility methods for cache management
     */
    static async invalidateCarrierCache(carrierId: string): Promise<void> {
        await NotificationTargetingCache.invalidate(carrierId);
    }

    static async clearAllCache(): Promise<void> {
        await NotificationTargetingCache.clear();
    }

    /**
     * Get cache statistics for monitoring
     */
    static async getCacheStats(): Promise<{
        storage: 'redis' | 'memory';
        redisConnected: boolean;
        fallbackCacheSize?: number;
    }> {
        const isRedisConnected = redis !== null;

        if (isRedisConnected) {
            return {
                storage: 'redis',
                redisConnected: true,
            };
        } else {
            return {
                storage: 'memory',
                redisConnected: false,
                fallbackCacheSize: fallbackCache?.size || 0,
            };
        }
    }

    /**
     * Preload notification targets for multiple carriers (batch optimization)
     * Useful for warming cache during high-traffic periods
     */
    static async preloadCarrierTargets(carrierIds: string[]): Promise<void> {
        const promises = carrierIds.map((carrierId) =>
            this.getNotificationTargets({ carrierId }).catch((error) => {
                console.error(`Failed to preload targets for carrier ${carrierId}:`, error);
            }),
        );

        await Promise.allSettled(promises);
    }

    /**
     * Test Redis connection and cache functionality
     */
    static async testCacheConnection(): Promise<{
        redis: boolean;
        fallback: boolean;
        testPassed: boolean;
    }> {
        const testKey = 'test-carrier-id';
        const testData: CachedUserData = {
            users: [
                {
                    id: 'test-user',
                    name: 'Test User',
                    email: 'test@example.com',
                    role: 'ADMIN',
                    isEligible: true,
                },
            ],
            timestamp: Date.now(),
            carrierId: testKey,
        };

        try {
            // Test set operation
            await NotificationTargetingCache.set(testKey, testData);

            // Test get operation
            const retrieved = await NotificationTargetingCache.get(testKey);

            // Test cleanup
            await NotificationTargetingCache.invalidate(testKey);

            const testPassed = retrieved !== null && retrieved.carrierId === testKey;

            return {
                redis: redis !== null,
                fallback: fallbackCache !== null,
                testPassed,
            };
        } catch (error) {
            console.error('Cache connection test failed:', error);
            return {
                redis: redis !== null,
                fallback: fallbackCache !== null,
                testPassed: false,
            };
        }
    }
}
