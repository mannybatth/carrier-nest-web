// hooks/useOptimizedLoad.ts
import { useState, useEffect, useCallback } from 'react';
import { ExpandedLoad } from '../interfaces/models';
import { getLoadByIdOptimized } from '../lib/rest/load-optimized';

export const useOptimizedLoad = (loadId: string) => {
    const [load, setLoad] = useState<ExpandedLoad | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Step 1: Load essential data first (lightweight mode)
    const loadEssentialData = useCallback(async () => {
        if (!loadId) return;

        try {
            setLoading(true);
            const lightLoad = await getLoadByIdOptimized(loadId, undefined, {
                lightweight: true,
            });
            setLoad(lightLoad);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load essential data');
        } finally {
            setLoading(false);
        }
    }, [loadId]);

    // Step 2: Load full data in background
    const loadFullData = useCallback(async () => {
        if (!loadId) return;

        try {
            const fullLoad = await getLoadByIdOptimized(loadId, undefined, {
                expandCarrier: true,
                fields: [
                    'id',
                    'loadNum',
                    'status',
                    'rate',
                    'refNum',
                    'createdAt',
                    'routeDistanceMiles',
                    'routeDurationHours',
                ],
            });
            setLoad(fullLoad);
        } catch (err) {
            console.error('Failed to load full data:', err);
        }
    }, [loadId]);

    // Step 3: Load documents on demand
    const loadDocuments = useCallback(async () => {
        if (!loadId) return;

        try {
            const loadWithDocuments = await getLoadByIdOptimized(loadId, undefined, {
                expandCarrier: true,
                includeActivity: false, // Don't load activity with documents
            });
            setLoad((prev) => ({ ...prev, ...loadWithDocuments }));
        } catch (err) {
            console.error('Failed to load documents:', err);
        }
    }, [loadId]);

    useEffect(() => {
        loadEssentialData();

        // Load full data after essential data is loaded
        const timer = setTimeout(() => {
            loadFullData();
        }, 100);

        return () => clearTimeout(timer);
    }, [loadEssentialData, loadFullData]);

    return {
        load,
        loading,
        error,
        loadDocuments,
        refetch: loadFullData,
    };
};
