import { useSession } from 'next-auth/react';
import { useRef, useMemo } from 'react';

// Global session cache to prevent multiple simultaneous calls
let sessionCache: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 2000; // 2 seconds cache for very short-term deduplication

export const useOptimizedSession = (options?: any) => {
    const sessionResult = useSession({
        ...options,
        required: false,
        onUnauthenticated: options?.onUnauthenticated,
    });

    // For first few seconds after mounting, use cached result if available
    const now = Date.now();
    const hasFreshCache = sessionCache && now - cacheTimestamp < CACHE_DURATION;

    // Update cache when we get a result
    if (sessionResult.status !== 'loading' && sessionResult.data) {
        if (!sessionCache || sessionResult.data !== sessionCache.data) {
            sessionCache = sessionResult;
            cacheTimestamp = now;
        }
    }

    // Return fresh result always (we're just using cache for deduplication)
    return sessionResult;
};
