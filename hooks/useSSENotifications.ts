import { useEffect, useRef, useState } from 'react';

interface SSEConnectionState {
    connected: boolean;
    connecting: boolean;
    error: string | null;
    retryCount: number;
}

export const useSSENotifications = (onNotification: (notification: any) => void) => {
    const [connectionState, setConnectionState] = useState<SSEConnectionState>({
        connected: false,
        connecting: false,
        error: null,
        retryCount: 0,
    });

    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const connectionAttemptsRef = useRef<number>(0);
    const lastHeartbeatRef = useRef<number>(Date.now());
    const isManuallyClosedRef = useRef<boolean>(false);
    const retryDelayRef = useRef<number>(1000); // Start with 1 second

    // Calculate exponential backoff with jitter
    const getRetryDelay = (): number => {
        const baseDelay = Math.min(retryDelayRef.current, 30000); // Max 30 seconds
        const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
        return baseDelay + jitter;
    };

    // Reset heartbeat timeout
    const resetHeartbeatTimeout = () => {
        if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
        }

        lastHeartbeatRef.current = Date.now();
        heartbeatTimeoutRef.current = setTimeout(() => {
            console.warn('[SSE] Heartbeat timeout - connection may be stale');
            if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
                disconnect();
                scheduleReconnect();
            }
        }, 90000); // 90 second timeout
    };

    // Clean disconnect
    const disconnect = () => {
        isManuallyClosedRef.current = true;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = null;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        setConnectionState((prev) => ({
            ...prev,
            connected: false,
            connecting: false,
        }));
    };

    // Schedule reconnection with exponential backoff
    const scheduleReconnect = () => {
        if (isManuallyClosedRef.current) return;

        const delay = getRetryDelay();

        reconnectTimeoutRef.current = setTimeout(() => {
            if (!isManuallyClosedRef.current) {
                connect();
            }
        }, delay);

        // Exponential backoff
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, 30000);
    };

    // Connect to SSE
    const connect = () => {
        if (isManuallyClosedRef.current) return;
        if (eventSourceRef.current?.readyState === EventSource.OPEN) return;

        // Check network status
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            scheduleReconnect();
            return;
        }

        connectionAttemptsRef.current += 1;

        setConnectionState((prev) => ({
            ...prev,
            connecting: true,
            error: null,
        }));

        try {
            // Close existing connection
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const eventSource = new EventSource('/api/notifications/stream');
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                connectionAttemptsRef.current = 0;
                retryDelayRef.current = 1000; // Reset backoff

                setConnectionState({
                    connected: true,
                    connecting: false,
                    error: null,
                    retryCount: 0,
                });

                resetHeartbeatTimeout();
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'heartbeat') {
                        resetHeartbeatTimeout();
                        return;
                    }

                    if (data.type === 'connected') {
                        resetHeartbeatTimeout();
                        return;
                    }

                    if (data.type === 'error') {
                        console.warn('[SSE] Server error received:', data.message);
                        resetHeartbeatTimeout(); // Don't disconnect for server errors
                        return;
                    }

                    if (data.type === 'shutdown') {
                        if (!isManuallyClosedRef.current) {
                            scheduleReconnect();
                        }
                        return;
                    }

                    if (data.type === 'notification' && data.notification) {
                        onNotification(data.notification);
                        resetHeartbeatTimeout();
                    }
                } catch (error) {
                    console.error('[SSE] Error parsing message:', error, 'Raw data:', event.data);
                    // Don't disconnect for parsing errors
                    resetHeartbeatTimeout();
                }
            };

            eventSource.onerror = (error) => {
                console.error('[SSE] Connection error:', error);

                const errorMessage = `Connection failed (attempt ${connectionAttemptsRef.current}) - readyState: ${eventSource.readyState}`;
                setConnectionState((prev) => ({
                    ...prev,
                    connected: false,
                    connecting: false,
                    error: errorMessage,
                    retryCount: connectionAttemptsRef.current,
                }));

                // Only schedule reconnect if the connection is closed and not manually closed
                if (eventSource.readyState === EventSource.CLOSED && !isManuallyClosedRef.current) {
                    scheduleReconnect();
                } else if (eventSource.readyState === EventSource.CONNECTING) {
                    // If still connecting, wait a bit before retrying
                    setTimeout(() => {
                        if (eventSource.readyState === EventSource.CLOSED && !isManuallyClosedRef.current) {
                            scheduleReconnect();
                        }
                    }, 3000);
                }
            };
        } catch (error) {
            console.error('[SSE] Failed to create EventSource:', error);
            setConnectionState((prev) => ({
                ...prev,
                connected: false,
                connecting: false,
                error: 'Failed to create connection',
                retryCount: connectionAttemptsRef.current,
            }));
            scheduleReconnect();
        }
    };

    // Handle network status changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOnline = () => {
            if (!connectionState.connected && !connectionState.connecting) {
                connect();
            }
        };

        const handleOffline = () => {
            disconnect();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [connectionState.connected, connectionState.connecting]);

    // Handle page visibility changes
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Keep connection but let server handle reduced frequency
            } else {
                if (!connectionState.connected && !connectionState.connecting && !isManuallyClosedRef.current) {
                    connect();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [connectionState.connected, connectionState.connecting]);

    // Initial connection
    useEffect(() => {
        isManuallyClosedRef.current = false;
        connect();

        return () => {
            disconnect();
        };
    }, []);

    return {
        connected: connectionState.connected,
        connecting: connectionState.connecting,
        error: connectionState.error,
        retryCount: connectionState.retryCount,
        reconnect: () => {
            disconnect();
            setTimeout(connect, 1000);
        },
        disconnect: () => {
            isManuallyClosedRef.current = true;
            disconnect();
        },
    };
};
