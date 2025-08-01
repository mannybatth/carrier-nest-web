import { NextRequest } from 'next/server';
import { auth } from '../../../../auth';
import prisma, { executeSSEQuery } from '../../../../lib/prisma';

// Vercel-optimized configuration for SSE - Long-lived connections while tab is active
const VERCEL_CONFIG = {
    MAX_DURATION: 28, // 28 seconds max (2s before Vercel timeout)
    HEARTBEAT_INTERVAL: 8, // 8 seconds heartbeat
    DB_QUERY_TIMEOUT: 1.5, // 1.5 second DB timeout (balanced)
    NOTIFICATION_CHECK_INTERVAL: 6, // 6 seconds check interval (more frequent)
    IMMEDIATE_RESPONSE_TIMEOUT: 100, // Send response within 100ms
    MAX_NOTIFICATIONS_PER_BATCH: 3, // Up to 3 notifications per batch
    CONNECTION_CLEANUP_GRACE: 2, // 2 seconds grace period before cleanup
    MAX_DB_FAILURES: 3, // Max consecutive DB failures before disabling queries
    EARLY_CLOSE_WARNING: 23, // Send close warning at 23 seconds
    AUTO_RECONNECT_DELAY: 1000, // 1 second delay before auto-reconnect
};

// Force dynamic rendering for SSE
export const dynamic = 'force-dynamic';

const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Accel-Buffering': 'no', // Disable proxy buffering for Vercel
};

export async function GET(request: NextRequest) {
    const connectionStart = Date.now();

    try {
        // Fast authentication check
        const session = await auth();
        if (!session?.user?.id) {
            return new Response('Unauthorized', {
                status: 401,
                headers: { 'Content-Type': 'text/plain' },
            });
        }

        const userId = session.user.id;
        const carrierId = session.user.defaultCarrierId;

        if (!carrierId) {
            return new Response('Carrier ID required', {
                status: 400,
                headers: { 'Content-Type': 'text/plain' },
            });
        }

        // Check if user has any enabled notification preferences (with fast timeout)
        try {
            const preferences = await executeSSEQuery(
                () =>
                    prisma.notificationPreference.findMany({
                        where: {
                            userId: userId,
                            carrierId: carrierId,
                        },
                        select: {
                            enabled: true,
                            emailEnabled: true,
                            smsEnabled: true,
                            pushEnabled: true,
                        },
                    }),
                1000, // 1 second timeout
            );

            if (preferences) {
                const hasAnyEnabled = preferences.some(
                    (pref) => pref.enabled || pref.emailEnabled || pref.smsEnabled || pref.pushEnabled,
                );

                if (!hasAnyEnabled) {
                    return new Response('No notification preferences enabled', {
                        status: 204, // No content
                        headers: { 'Content-Type': 'text/plain' },
                    });
                }
            } else {
                console.warn('[SSE] Could not check preferences (timeout), proceeding anyway');
            }
        } catch (error) {
            console.warn('[SSE] Error checking preferences, proceeding anyway:', error);
            // Continue with connection if preferences check fails or times out
        }

        // Create ReadableStream with immediate response
        const stream = new ReadableStream({
            start(controller) {
                let isActive = true;
                let heartbeatInterval: NodeJS.Timeout | null = null;
                let notificationInterval: NodeJS.Timeout | null = null;
                let cleanupTimeout: NodeJS.Timeout | null = null;
                let messageCount = 0;
                let dbFailureCount = 0; // Track consecutive DB failures
                let dbQueriesDisabled = false; // Circuit breaker for DB queries

                // Fast message sender with error handling
                const sendMessage = (data: any) => {
                    if (!isActive || messageCount > 200) return false; // Rate limiting
                    try {
                        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
                        messageCount++;
                        return true;
                    } catch (error) {
                        console.warn('[SSE] Send error:', error);
                        cleanup();
                        return false;
                    }
                };

                // Optimized cleanup function
                const cleanup = () => {
                    if (!isActive) return;
                    isActive = false;

                    if (heartbeatInterval) clearInterval(heartbeatInterval);
                    if (notificationInterval) clearInterval(notificationInterval);
                    if (cleanupTimeout) clearTimeout(cleanupTimeout);

                    try {
                        controller.close();
                    } catch (error) {
                        // Ignore close errors
                    }
                };

                // Enhanced heartbeat with connection status
                const sendHeartbeat = () => {
                    sendMessage({
                        type: 'heartbeat',
                        timestamp: new Date().toISOString(),
                        connectionDuration: Date.now() - connectionStart,
                        dbStatus: dbQueriesDisabled ? 'disabled' : 'active',
                        messageCount: messageCount,
                    });
                };

                // Optimized notification check with circuit breaker
                const checkNotifications = async () => {
                    if (!isActive || dbQueriesDisabled) return;

                    try {
                        // Use the specialized SSE query function with automatic timeout
                        const notifications = await executeSSEQuery(
                            () =>
                                prisma.notification.findMany({
                                    where: {
                                        carrierId: carrierId,
                                        createdAt: {
                                            gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes (increased from 30 seconds)
                                        },
                                        isRead: false,
                                        // Add explicit userId filter for better query performance
                                        OR: [
                                            { userId: userId },
                                            { userId: null }, // Include carrier-wide notifications
                                        ],
                                    },
                                    orderBy: { createdAt: 'desc' },
                                    take: VERCEL_CONFIG.MAX_NOTIFICATIONS_PER_BATCH,
                                    select: {
                                        id: true,
                                        type: true,
                                        title: true,
                                        message: true,
                                        data: true,
                                        isRead: true,
                                        createdAt: true,
                                        carrierId: true,
                                        userId: true,
                                    },
                                }),
                            VERCEL_CONFIG.DB_QUERY_TIMEOUT * 1000,
                        );

                        if (notifications === null) {
                            // Query failed/timed out
                            throw new Error('Query timeout or failure');
                        }

                        // Reset failure count on successful query
                        dbFailureCount = 0;

                        if (notifications.length > 0) {
                            for (const notification of notifications) {
                                if (
                                    !sendMessage({
                                        type: 'notification',
                                        notification,
                                    })
                                )
                                    break;
                            }
                        }
                    } catch (error) {
                        dbFailureCount++;
                        console.warn(`[SSE] Query error (${dbFailureCount}/${VERCEL_CONFIG.MAX_DB_FAILURES}):`, error);

                        // Implement circuit breaker - disable DB queries after too many failures
                        if (dbFailureCount >= VERCEL_CONFIG.MAX_DB_FAILURES) {
                            console.warn('[SSE] Too many DB failures, disabling further queries for this connection');
                            dbQueriesDisabled = true;

                            // Send error message to client
                            sendMessage({
                                type: 'error',
                                message: 'Database connection issues detected, switching to heartbeat-only mode',
                            });
                        }
                    }
                };

                // Send immediate connection confirmation
                setTimeout(() => {
                    sendMessage({
                        type: 'connected',
                        timestamp: new Date().toISOString(),
                        connectionTime: Date.now() - connectionStart,
                    });
                }, 10); // 10ms delay to ensure stream is ready

                // Setup intervals with Vercel-optimized timings
                heartbeatInterval = setInterval(sendHeartbeat, VERCEL_CONFIG.HEARTBEAT_INTERVAL * 1000);
                notificationInterval = setInterval(
                    checkNotifications,
                    VERCEL_CONFIG.NOTIFICATION_CHECK_INTERVAL * 1000,
                );

                // Early warning system at 15 seconds
                const earlyWarningTimeout = setTimeout(() => {
                    sendMessage({
                        type: 'early_warning',
                        message: 'Connection will close soon, switching to polling recommended',
                        remainingTime: VERCEL_CONFIG.MAX_DURATION - VERCEL_CONFIG.EARLY_CLOSE_WARNING,
                    });
                }, VERCEL_CONFIG.EARLY_CLOSE_WARNING * 1000);

                // Auto-cleanup before Vercel timeout (more aggressive)
                cleanupTimeout = setTimeout(() => {
                    sendMessage({
                        type: 'timeout_warning',
                        message: 'Connection will close due to function timeout, will auto-reconnect',
                        shouldReconnect: true,
                        reconnectDelay: VERCEL_CONFIG.AUTO_RECONNECT_DELAY,
                    });
                    setTimeout(() => {
                        cleanup();
                        // Clear early warning timeout if cleanup happens first
                        clearTimeout(earlyWarningTimeout);
                    }, VERCEL_CONFIG.CONNECTION_CLEANUP_GRACE * 1000);
                }, (VERCEL_CONFIG.MAX_DURATION - VERCEL_CONFIG.CONNECTION_CLEANUP_GRACE) * 1000);

                // Handle client disconnect
                request.signal?.addEventListener('abort', cleanup);

                // Initial notification check (delayed to not block connection)
                setTimeout(checkNotifications, 1000);
            },

            cancel() {
                // Cleanup handled in start function
            },
        });

        return new Response(stream, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('[SSE] Setup error:', error);
        return new Response('Internal Server Error', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
    return new Response(null, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
        },
    });
}
