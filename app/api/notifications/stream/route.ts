import { NextRequest } from 'next/server';
import { auth } from '../../../../auth';
import prisma, { ensurePrismaConnection, disconnectPrisma } from '../../../../lib/prisma';
import { Notification, NotificationPreference, Driver } from '@prisma/client';
import { sseConnectionTracker } from '../../../../lib/sse-connection-tracker';

// Force dynamic rendering for SSE
export const dynamic = 'force-dynamic';

const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Accel-Buffering': 'no', // Disable proxy buffering
};

// Graceful shutdown handler
const gracefulShutdown = () => {
    sseConnectionTracker.closeAllConnections();
};

// Setup graceful shutdown handlers
if (typeof process !== 'undefined') {
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
}

export async function GET(request: NextRequest) {
    try {
        // Verify authentication
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

        // Create ReadableStream for SSE
        const stream = new ReadableStream({
            start(controller) {
                // Add to connection tracker with user agent info
                const userAgent = request.headers.get('user-agent') || 'Unknown';
                const connectionId = sseConnectionTracker.addConnection(controller, userId, carrierId, userAgent);

                let heartbeatInterval: NodeJS.Timeout;
                let notificationCheckInterval: NodeJS.Timeout;
                let connectionRefreshInterval: NodeJS.Timeout;
                let isActive = true;

                // Send initial connection confirmation
                const sendMessage = (data: any) => {
                    if (!isActive) return;
                    try {
                        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
                    } catch (error) {
                        console.warn('[SSE] Error sending message:', error);
                        cleanup();
                    }
                };

                // Heartbeat function
                const sendHeartbeat = () => {
                    sseConnectionTracker.updateHeartbeat(connectionId);
                    sendMessage({
                        type: 'heartbeat',
                        timestamp: new Date().toISOString(),
                    });
                };

                // Check for new notifications with connection retry logic
                const checkNotifications = async () => {
                    if (!isActive) return;

                    let retryCount = 0;
                    const maxRetries = 3;
                    const baseDelay = 1000; // 1 second base delay

                    const attemptQuery = async (): Promise<void> => {
                        try {
                            // Ensure connection is healthy before querying
                            const connectionHealthy = await ensurePrismaConnection();
                            if (!connectionHealthy) {
                                throw new Error('Database connection could not be established');
                            }

                            // Get recent notifications (last 2 minutes to account for any delays)
                            const recentThreshold = new Date(Date.now() - 2 * 60 * 1000);

                            // Use a timeout for the query to prevent hanging
                            const queryTimeout = new Promise<never>((_, reject) => {
                                setTimeout(() => reject(new Error('Query timeout')), 10000);
                            });

                            const queryPromise = prisma.notification.findMany({
                                where: {
                                    carrierId: carrierId,
                                    createdAt: {
                                        gte: recentThreshold,
                                    },
                                    // Only send unread notifications via SSE
                                    isRead: false,
                                },
                                orderBy: { createdAt: 'desc' },
                                take: 5, // Limit batch size for performance
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

                            const notifications = await Promise.race([queryPromise, queryTimeout]);

                            // Reset retry count on successful query
                            retryCount = 0;

                            // Send notifications if any found
                            if (notifications.length > 0) {
                                for (const notification of notifications) {
                                    sendMessage({
                                        type: 'notification',
                                        notification,
                                    });
                                }
                            }
                        } catch (error: any) {
                            console.error(
                                `[SSE] Error checking notifications (attempt ${retryCount + 1}/${maxRetries}):`,
                                error,
                            );

                            // Check if it's a connection error that we should retry
                            const isConnectionError =
                                error.code === 'P1017' ||
                                error.message?.includes('connection') ||
                                error.message?.includes('closed') ||
                                error.message?.includes('server has closed') ||
                                error.message?.includes('connection pool') ||
                                error.message?.includes('timeout') ||
                                error.message?.includes('Query timeout') ||
                                error.message?.includes('Connection check timeout');

                            if (isConnectionError && retryCount < maxRetries) {
                                retryCount++;

                                // Exponential backoff with jitter
                                const delay = baseDelay * Math.pow(2, retryCount - 1) + Math.random() * 1000;

                                // Wait before retry
                                await new Promise((resolve) => setTimeout(resolve, delay));

                                // Force disconnect to reset connection state
                                try {
                                    await disconnectPrisma();
                                } catch (disconnectError) {
                                    console.warn('[SSE] Error during disconnect:', disconnectError);
                                }

                                return attemptQuery();
                            } else if (isConnectionError) {
                                console.error(
                                    '[SSE] Max retries reached, disabling notification checks for this connection',
                                );

                                // Send error message to client
                                sendMessage({
                                    type: 'error',
                                    message: 'Database connection lost',
                                    error: 'Connection will be restored automatically',
                                });

                                // Stop the notification interval to prevent further errors
                                if (notificationCheckInterval) {
                                    clearInterval(notificationCheckInterval);
                                    notificationCheckInterval = null;
                                }
                                return;
                            } else {
                                // Non-connection error, send to client for debugging
                                sendMessage({
                                    type: 'error',
                                    message: 'Error fetching notifications',
                                    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error',
                                });
                            }
                        }
                    };

                    await attemptQuery();
                };

                // Cleanup function with improved error handling
                const cleanup = async () => {
                    if (!isActive) return; // Already cleaned up
                    isActive = false;

                    // Clear intervals
                    if (heartbeatInterval) {
                        clearInterval(heartbeatInterval);
                        heartbeatInterval = null;
                    }
                    if (notificationCheckInterval) {
                        clearInterval(notificationCheckInterval);
                        notificationCheckInterval = null;
                    }
                    if (connectionRefreshInterval) {
                        clearInterval(connectionRefreshInterval);
                        connectionRefreshInterval = null;
                    }

                    // Remove from connection tracker
                    sseConnectionTracker.removeConnection(connectionId, controller);

                    // Close the controller safely
                    try {
                        if (controller.desiredSize !== null) {
                            controller.close();
                        }
                    } catch (error) {
                        console.warn('[SSE] Error closing controller:', error);
                    }

                    // Disconnect Prisma connection for this stream to prevent connection leaks
                    try {
                        await disconnectPrisma();
                    } catch (disconnectError) {
                        console.warn('[SSE] Error disconnecting Prisma:', disconnectError);
                    }
                };

                // Start heartbeat (every 45 seconds)
                heartbeatInterval = setInterval(sendHeartbeat, 45000);

                // Add connection refresh interval (every 5 minutes)
                connectionRefreshInterval = setInterval(async () => {
                    if (!isActive) return;

                    try {
                        await ensurePrismaConnection();
                    } catch (error) {
                        console.warn('[SSE] Error during periodic connection refresh:', error);
                    }
                }, 5 * 60 * 1000); // 5 minutes

                // Start notification checking (every 10 seconds)
                notificationCheckInterval = setInterval(checkNotifications, 10000);

                // Auto-cleanup after 10 minutes of inactivity
                const autoCleanupTimeout = setTimeout(() => {
                    cleanup();
                }, 10 * 60 * 1000);

                // Handle connection close
                request.signal?.addEventListener('abort', () => {
                    clearTimeout(autoCleanupTimeout);
                    cleanup();
                });

                // Initial notification check
                checkNotifications();
            },

            cancel() {
                // Cleanup is handled in the start function
            },
        });

        // Return SSE response with proper headers
        return new Response(stream, {
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Cache-Control',
            },
        });
    } catch (error) {
        console.error('[SSE] Error in GET handler:', error);
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
