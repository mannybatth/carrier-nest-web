// Cache for expense categories with TTL (Time To Live)
interface CacheItem<T> {
    data: T;
    timestamp: number;
    ttl: number; // milliseconds
}

interface ExpenseCategory {
    id: string;
    name: string;
    group: string;
    displayOrder: number;
    isActive: boolean;
}

interface CategoriesResponse {
    categories: ExpenseCategory[];
    grouped: Record<string, ExpenseCategory[]>;
}

class ExpenseCategoriesCache {
    private cache = new Map<string, CacheItem<CategoriesResponse>>();
    private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

    private isExpired(item: CacheItem<CategoriesResponse>): boolean {
        return Date.now() - item.timestamp > item.ttl;
    }

    set(key: string, data: CategoriesResponse, ttl: number = this.DEFAULT_TTL): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    get(key: string): CategoriesResponse | null {
        const item = this.cache.get(key);
        if (!item) {
            return null;
        }

        if (this.isExpired(item)) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    clear(): void {
        this.cache.clear();
    }

    // Remove expired entries
    cleanup(): void {
        const keys = Array.from(this.cache.keys());
        for (const key of keys) {
            const item = this.cache.get(key);
            if (item && this.isExpired(item)) {
                this.cache.delete(key);
            }
        }
    }

    // Get cache stats for debugging
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}

// Export singleton instance
export const expenseCategoriesCache = new ExpenseCategoriesCache();

// Helper function to fetch categories with caching
export async function getCachedExpenseCategories(carrierId?: string): Promise<CategoriesResponse | null> {
    const cacheKey = carrierId || 'default';

    // Try to get from cache first
    const cached = expenseCategoriesCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        // Fetch from API if not in cache or expired
        const response = await fetch('/api/expense-categories');
        if (!response.ok) {
            throw new Error(`Failed to fetch categories: ${response.status}`);
        }

        const data: CategoriesResponse = await response.json();

        // Cache the result
        expenseCategoriesCache.set(cacheKey, data);

        return data;
    } catch (error) {
        console.error('Error fetching expense categories:', error);
        return null;
    }
}

// Cleanup function that can be called periodically
export function cleanupExpenseCache(): void {
    expenseCategoriesCache.cleanup();
}

// Function to invalidate cache (useful when categories are updated)
export function invalidateExpenseCategories(): void {
    expenseCategoriesCache.clear();
}
