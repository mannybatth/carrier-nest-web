import { NextRequest } from 'next/server';
import { auth } from '../../../../auth';
import prisma, { ensurePrismaConnection } from '../../../../lib/prisma';

// Vercel-optimized configuration for SSE
const VERCEL_CONFIG = {
    MAX_DURATION: 25, // 25 seconds max (5s before Vercel timeout)
    HEARTBEAT_INTERVAL: 8, // 8 seconds heartbeat
    DB_QUERY_TIMEOUT: 3, // 3 seconds DB timeout
    NOTIFICATION_CHECK_INTERVAL: 5, // 5 seconds check interval
    IMMEDIATE_RESPONSE_TIMEOUT: 100, // Send response within 100ms
    MAX_NOTIFICATIONS_PER_BATCH: 3, // Limit batch size
    CONNECTION_CLEANUP_GRACE: 2, // 2 seconds grace period before cleanup
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

        // Check if user has any enabled notification preferences
        try {
            const preferences = await prisma.notificationPreference.findMany({
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
            });

            const hasAnyEnabled = preferences.some(
                (pref) => pref.enabled || pref.emailEnabled || pref.smsEnabled || pref.pushEnabled,
            );

            if (!hasAnyEnabled) {
                console.log(`[SSE] User ${userId} has no enabled notifications - closing connection`);
                return new Response('No notification preferences enabled', {
                    status: 204, // No content
                    headers: { 'Content-Type': 'text/plain' },
                });
            }

            console.log(`[SSE] User ${userId} has enabled notifications - proceeding with connection`);
        } catch (error) {
            console.warn('[SSE] Error checking preferences, proceeding anyway:', error);
            // Continue with connection if preferences check fails
        }

        // Create ReadableStream with immediate response
        const stream = new ReadableStream({
            start(controller) {
                let isActive = true;
                let heartbeatInterval: NodeJS.Timeout | null = null;
                let notificationInterval: NodeJS.Timeout | null = null;
                let cleanupTimeout: NodeJS.Timeout | null = null;
                let messageCount = 0;

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

                // Lightweight heartbeat
                const sendHeartbeat = () => {
                    sendMessage({
                        type: 'heartbeat',
                        timestamp: new Date().toISOString(),
                    });
                };

                // Optimized notification check with short timeout
                const checkNotifications = async () => {
                    if (!isActive) return;

                    try {
                        // Quick database query with timeout
                        const queryPromise = prisma.notification.findMany({
                            where: {
                                carrierId: carrierId,
                                createdAt: {
                                    gte: new Date(Date.now() - 60 * 1000), // Last 1 minute only
                                },
                                isRead: false,
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
                        });

                        const timeoutPromise = new Promise<never>((_, reject) => {
                            setTimeout(() => reject(new Error('Query timeout')), VERCEL_CONFIG.DB_QUERY_TIMEOUT * 1000);
                        });

                        const notifications = await Promise.race([queryPromise, timeoutPromise]);

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
                        console.warn('[SSE] Query error:', error);
                        // Continue operation even with DB errors
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

                // Auto-cleanup before Vercel timeout
                cleanupTimeout = setTimeout(() => {
                    sendMessage({
                        type: 'timeout_warning',
                        message: 'Connection will close due to function timeout',
                    });
                    setTimeout(cleanup, VERCEL_CONFIG.CONNECTION_CLEANUP_GRACE * 1000);
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
