import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react';
import { NotificationService } from '../lib/services/NotificationServiceClient';
import { useSession } from 'next-auth/react';
import { ToastNotification } from '../components/ToastContainer';

interface GlobalNotificationContextType {
    notifications: any[];
    unreadCount: number;
    loading: boolean;
    connected: boolean;
    usingPollingFallback: boolean;
    hasEnabledNotifications: boolean | null;
    toastNotifications: ToastNotification[];
    markAsRead: (notificationIds: string[]) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refreshNotifications: () => Promise<void>;
    createNotification: (data: any) => Promise<void>;
    dismissToast: (id: string) => void;
    markToastAsRead: (notificationId: string) => void;
    isMainTab: boolean; // Indicates if this tab manages the SSE connection
    checkNotificationPreferences: () => Promise<boolean>; // Allow manual refresh of preferences
}

const GlobalNotificationContext = createContext<GlobalNotificationContextType | undefined>(undefined);

export const useGlobalNotifications = () => {
    const context = useContext(GlobalNotificationContext);
    if (context === undefined) {
        throw new Error('useGlobalNotifications must be used within a GlobalNotificationProvider');
    }
    return context;
};

interface GlobalNotificationProviderProps {
    children: ReactNode;
}

// Vercel-optimized configuration matching server-side SSE settings
const PRODUCTION_CONFIG = {
    HEARTBEAT_INTERVAL: process.env.NODE_ENV === 'production' ? 8000 : 5000, // Match server 8s heartbeat
    LEADER_TIMEOUT: process.env.NODE_ENV === 'production' ? 20000 : 10000, // 20s in prod, 10s in dev
    SSE_RECONNECT_DELAY: process.env.NODE_ENV === 'production' ? 2000 : 1000, // Fast reconnection
    SSE_CONNECTION_TIMEOUT: process.env.NODE_ENV === 'production' ? 30 : 15, // 30s to match Vercel function timeout
    MAX_NOTIFICATIONS: 100, // Limit stored notifications for memory efficiency
    DEBOUNCE_DELAY: process.env.NODE_ENV === 'production' ? 1000 : 500, // Longer debounce in production
    TOAST_CLEANUP_INTERVAL: 30000, // Clean up old toasts every 30s
    INIT_DELAY: process.env.NODE_ENV === 'production' ? 200 : 100, // Faster initialization
    VISIBILITY_CHECK_INTERVAL: 5000, // Check visibility every 5s
    POLLING_INTERVAL: process.env.NODE_ENV === 'production' ? 15000 : 10000, // Fallback polling interval
    MAX_SSE_FAILURES: 2, // Switch to polling after 2 failures (faster fallback)
    CONNECTION_RETRY_LIMIT: 5, // Limit connection retries before fallback
};

// Broadcast channel for communication between tabs
const CHANNEL_NAME = 'carrier-nest-notifications';
const LEADER_KEY = 'carrier-nest-notification-leader';
const STATE_KEY = 'carrier-nest-notification-state';

export const GlobalNotificationProvider: React.FC<GlobalNotificationProviderProps> = ({ children }) => {
    const { data: session } = useSession();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);
    const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);
    const [isMainTab, setIsMainTab] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isPageVisible, setIsPageVisible] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [usingPollingFallback, setUsingPollingFallback] = useState(false);
    const [hasEnabledNotifications, setHasEnabledNotifications] = useState<boolean | null>(null); // null = not checked yet

    const broadcastChannel = useRef<BroadcastChannel | null>(null);
    const eventSource = useRef<EventSource | null>(null);
    const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
    const leaderCheckTimer = useRef<NodeJS.Timeout | null>(null);
    const visibilityCheckTimer = useRef<NodeJS.Timeout | null>(null);
    const initTimer = useRef<NodeJS.Timeout | null>(null);
    const tabId = useRef<string>(Math.random().toString(36).substr(2, 9));
    const processedNotificationIds = useRef(new Set<string>());
    const sessionStartTime = useRef(Date.now());
    const isChannelClosed = useRef<boolean>(false);
    const isLoadingRef = useRef<boolean>(false); // Track loading state to prevent duplicate calls
    const pollingTimer = useRef<NodeJS.Timeout | null>(null);
    const lastPollingCheck = useRef<number>(Date.now());
    const sseFailureCount = useRef<number>(0);
    const connectionRetryCount = useRef<number>(0);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const carrierId = session?.user?.defaultCarrierId;
    const userId = session?.user?.id;

    // Check if user has any enabled notification preferences
    const checkNotificationPreferences = useCallback(async () => {
        if (!userId || !carrierId) {
            setHasEnabledNotifications(false);
            return false;
        }

        try {
            const response = await fetch(`/api/notifications/preferences?carrierId=${carrierId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                const preferences = await response.json();

                // Check if user has ANY enabled notifications (push, email, SMS, or in-app)
                const hasAnyEnabled = preferences.some(
                    (pref: any) => pref.enabled || pref.emailEnabled || pref.smsEnabled || pref.pushEnabled,
                );

                console.log(`[Notifications] User has enabled notifications: ${hasAnyEnabled}`);
                setHasEnabledNotifications(hasAnyEnabled);
                return hasAnyEnabled;
            } else {
                console.warn('[Notifications] Failed to fetch preferences, assuming disabled');
                setHasEnabledNotifications(false);
                return false;
            }
        } catch (error) {
            console.warn('[Notifications] Error checking preferences:', error);
            setHasEnabledNotifications(false);
            return false;
        }
    }, [userId, carrierId]);

    // Check preferences on session change
    useEffect(() => {
        if (userId && carrierId && isInitialized) {
            checkNotificationPreferences();
        }
    }, [userId, carrierId, isInitialized, checkNotificationPreferences]);

    // Production-optimized safe broadcast helper
    const safeBroadcast = useCallback(
        (message: any) => {
            if (!isMounted || isChannelClosed.current || !broadcastChannel.current) {
                return;
            }

            try {
                const messageWithTabId = { ...message, fromTab: tabId.current };
                broadcastChannel.current.postMessage(messageWithTabId);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'InvalidStateError') {
                    isChannelClosed.current = true;
                }
            }
        },
        [isMounted],
    );

    // Page and Window Visibility API - Track when tab/window becomes active/inactive
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleVisibilityChange = () => {
            // Check both tab visibility and window focus
            const isTabVisible = !document.hidden;
            const isWindowFocused = document.hasFocus();
            const isVisible = isTabVisible && isWindowFocused;

            setIsPageVisible(isVisible);

            if (!isVisible) {
                // Tab/window became inactive - disconnect SSE and stop heartbeat
                const reason = !isTabVisible ? 'tab inactivity' : 'window lost focus';

                if (eventSource.current) {
                    eventSource.current.close();
                    eventSource.current = null;
                    setConnected(false);
                    console.log(`[SSE] Connection closed due to ${reason}`);
                }

                if (heartbeatTimer.current) {
                    clearInterval(heartbeatTimer.current);
                    heartbeatTimer.current = null;
                }

                // Clear leadership if we were the leader
                if (isMainTab) {
                    const leaderInfo = localStorage.getItem(LEADER_KEY);
                    if (leaderInfo) {
                        try {
                            const { tabId: leaderId } = JSON.parse(leaderInfo);
                            if (leaderId === tabId.current) {
                                localStorage.removeItem(LEADER_KEY);
                                setIsMainTab(false);
                            }
                        } catch (error) {
                            // Ignore errors during cleanup
                        }
                    }
                }

                // Broadcast that we're going inactive
                safeBroadcast({
                    type: 'TAB_INACTIVE',
                    payload: { tabId: tabId.current },
                });
            } else {
                // Tab/window became active - potentially take leadership

                // Update session start time to current time to prevent old notifications from showing as toasts
                sessionStartTime.current = Date.now();

                // Delay leadership check to avoid conflicts
                setTimeout(() => {
                    if (isPageVisible && isMounted && isInitialized) {
                        electLeader();
                    }
                }, 500);
            }
        };

        // Initial visibility state (check both tab and window)
        const initialTabVisible = !document.hidden;
        const initialWindowFocused = document.hasFocus();
        setIsPageVisible(initialTabVisible && initialWindowFocused);

        // Listen to both visibility change and window focus/blur events
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);
        window.addEventListener('blur', handleVisibilityChange);

        // Periodic visibility check as backup
        visibilityCheckTimer.current = setInterval(() => {
            const currentTabVisible = !document.hidden;
            const currentWindowFocused = document.hasFocus();
            const currentVisibility = currentTabVisible && currentWindowFocused;

            if (currentVisibility !== isPageVisible) {
                handleVisibilityChange();
            }
        }, PRODUCTION_CONFIG.VISIBILITY_CHECK_INTERVAL);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleVisibilityChange);
            window.removeEventListener('blur', handleVisibilityChange);
            if (visibilityCheckTimer.current) {
                clearInterval(visibilityCheckTimer.current);
            }
        };
    }, [isMainTab, isMounted, isInitialized, isPageVisible]);

    // Non-blocking initialization - Delay to ensure critical page loads first
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Defer initialization to not block critical page loading
        initTimer.current = setTimeout(() => {
            setIsMounted(true);
            setIsInitialized(true);
        }, PRODUCTION_CONFIG.INIT_DELAY);

        return () => {
            if (initTimer.current) {
                clearTimeout(initTimer.current);
            }
        };
    }, []);

    // Initialize broadcast channel - Only after initialization delay
    useEffect(() => {
        if (typeof window === 'undefined' || !isInitialized) return;

        isChannelClosed.current = false;
        broadcastChannel.current = new BroadcastChannel(CHANNEL_NAME);

        // Listen for messages from other tabs
        broadcastChannel.current.onmessage = (event) => {
            if (isChannelClosed.current) return;

            const { type, payload, fromTab } = event.data;

            // Skip processing if this message is from the current tab (to prevent self-processing)
            if (fromTab === tabId.current) return;

            switch (type) {
                case 'NOTIFICATION_UPDATE':
                    setNotifications(payload.notifications);
                    setUnreadCount(payload.unreadCount);
                    break;
                case 'CONNECTION_STATUS':
                    setConnected(payload.connected);
                    break;
                case 'NEW_NOTIFICATION':
                    // Handle new notification from other tabs (all tabs should update)
                    setNotifications((prev) => {
                        const exists = prev.some((n) => n.id === payload.notification.id);
                        if (exists) return prev;

                        const updated = [payload.notification, ...prev];
                        // Inline deduplication and sorting
                        const uniqueNotifications = updated.filter(
                            (notification, index, self) => index === self.findIndex((n) => n.id === notification.id),
                        );
                        return uniqueNotifications.sort((a, b) => {
                            const aTime = new Date(a.createdAt).getTime();
                            const bTime = new Date(b.createdAt).getTime();
                            return bTime - aTime;
                        });
                    });
                    if (!payload.notification.isRead) {
                        setUnreadCount((prev) => prev + 1);
                    }
                    break;
                case 'TOAST_NOTIFICATION':
                    // Handle toast notifications from other tabs (only show if notification is recent)
                    const notificationTimestamp = new Date(payload.notification.createdAt).getTime();
                    const currentTabSessionStart = sessionStartTime.current;

                    // Only show toast if the notification was created after this tab's session started
                    if (notificationTimestamp >= currentTabSessionStart) {
                        const getToastType = (type: string): 'info' | 'error' | 'success' | 'warning' => {
                            switch (type?.toLowerCase()) {
                                case 'success':
                                    return 'success';
                                case 'warning':
                                    return 'warning';
                                case 'error':
                                    return 'error';
                                default:
                                    return 'info';
                            }
                        };
                        const toast: ToastNotification = {
                            id: payload.notification.id,
                            notificationId: payload.notification.id,
                            title: payload.notification.title || 'New Notification',
                            message: payload.notification.message || '',
                            type: getToastType(payload.notification.type),
                            priority: payload.notification.priority,
                            duration: 5000,
                        };
                        setToastNotifications((prev) => [toast, ...prev]);
                    }
                    break;
                case 'TAB_INACTIVE':
                    // Another tab became inactive, we might need to take leadership
                    if (isPageVisible && isInitialized && !isMainTab) {
                        setTimeout(() => electLeader(), 1000); // Delay to avoid conflicts
                    }
                    break;
                case 'LEADER_HEARTBEAT':
                    // Another tab is announcing it's the leader
                    if (payload.tabId !== tabId.current) {
                        setIsMainTab(false);
                        updateLeaderTimestamp(payload.tabId);
                    }
                    break;
                case 'LEADER_ELECTION':
                    // Another tab is requesting leadership
                    if (isMainTab && payload.tabId !== tabId.current && isPageVisible) {
                        // Announce we're the current leader (only if we're visible)
                        safeBroadcast({
                            type: 'LEADER_HEARTBEAT',
                            payload: { tabId: tabId.current },
                        });
                    }
                    break;
            }
        };

        // Check if we should become the leader - only if page is visible and window is focused
        const leaderInfo = localStorage.getItem(LEADER_KEY);
        const now = Date.now();
        const isTabVisible = !document.hidden;
        const isWindowFocused = document.hasFocus();
        const canBecomeLeader = isPageVisible && isTabVisible && isWindowFocused;

        if (!leaderInfo && canBecomeLeader) {
            setIsMainTab(true);
            updateLeaderTimestamp(tabId.current);
        } else if (leaderInfo) {
            try {
                const { tabId: leaderId, timestamp } = JSON.parse(leaderInfo);

                if (now - timestamp > PRODUCTION_CONFIG.LEADER_TIMEOUT) {
                    if (canBecomeLeader) {
                        setIsMainTab(true);
                        updateLeaderTimestamp(tabId.current);
                    } else {
                        setIsMainTab(false);
                    }
                } else if (leaderId === tabId.current && canBecomeLeader) {
                    setIsMainTab(true);
                } else {
                    setIsMainTab(false);
                }
            } catch (error) {
                if (canBecomeLeader) {
                    setIsMainTab(true);
                    updateLeaderTimestamp(tabId.current);
                } else {
                    setIsMainTab(false);
                }
            }
        } else {
            setIsMainTab(false);
        }

        return () => {
            setIsMounted(false);
            isChannelClosed.current = true;
            if (broadcastChannel.current) {
                try {
                    broadcastChannel.current.close();
                } catch (error) {
                    // Channel might already be closed
                }
                broadcastChannel.current = null;
            }
        };
    }, [isInitialized, isPageVisible]); // Add isPageVisible dependency

    // Leader election logic - only for visible tabs with focused windows
    const electLeader = useCallback(() => {
        if (typeof window === 'undefined' || !isPageVisible || !isInitialized) {
            return;
        }

        // Double-check that both tab is visible and window is focused
        const isTabVisible = !document.hidden;
        const isWindowFocused = document.hasFocus();
        if (!isTabVisible || !isWindowFocused) {
            return;
        }

        const leaderInfo = localStorage.getItem(LEADER_KEY);
        const now = Date.now();

        if (!leaderInfo) {
            becomeLeader();
        } else {
            try {
                const { tabId: leaderId, timestamp } = JSON.parse(leaderInfo);

                if (now - timestamp > PRODUCTION_CONFIG.LEADER_TIMEOUT) {
                    becomeLeader();
                } else if (leaderId === tabId.current) {
                    setIsMainTab(true);
                    startLeaderHeartbeat();
                } else {
                    setIsMainTab(false);
                }
            } catch (error) {
                becomeLeader();
            }
        }
    }, [isPageVisible, isInitialized]);

    const becomeLeader = useCallback(() => {
        setIsMainTab(true);
        updateLeaderTimestamp(tabId.current);
        startLeaderHeartbeat();
    }, []);

    const updateLeaderTimestamp = useCallback((leaderId: string) => {
        localStorage.setItem(
            LEADER_KEY,
            JSON.stringify({
                tabId: leaderId,
                timestamp: Date.now(),
            }),
        );
    }, []);

    const startLeaderHeartbeat = useCallback(() => {
        if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);

        heartbeatTimer.current = setInterval(() => {
            updateLeaderTimestamp(tabId.current);
            safeBroadcast({
                type: 'LEADER_HEARTBEAT',
                payload: { tabId: tabId.current },
            });
        }, PRODUCTION_CONFIG.HEARTBEAT_INTERVAL);

        // Initial heartbeat
        safeBroadcast({
            type: 'LEADER_HEARTBEAT',
            payload: { tabId: tabId.current },
        });
    }, [safeBroadcast, updateLeaderTimestamp]);

    // Periodic check for leader status - only for visible tabs
    useEffect(() => {
        if (typeof window === 'undefined' || !isInitialized) return;

        leaderCheckTimer.current = setInterval(() => {
            if (!isMainTab && isPageVisible) {
                electLeader();
            }
        }, PRODUCTION_CONFIG.LEADER_TIMEOUT / 2);

        return () => {
            if (leaderCheckTimer.current) {
                clearInterval(leaderCheckTimer.current);
            }
        };
    }, [isMainTab, electLeader, isPageVisible, isInitialized]);

    // Show toast notifications for unshown events when connection is re-established
    const showUnshownToastNotifications = useCallback(() => {
        const currentTime = Date.now();
        const sessionStart = sessionStartTime.current;

        // Find notifications that occurred after session start but haven't been shown as toasts
        const unshownNotifications = notifications.filter((notification) => {
            const notificationCreatedAt = new Date(notification.createdAt).getTime();
            const isAfterSessionStart = notificationCreatedAt >= sessionStart;
            const isNotAlreadyToasted = !toastNotifications.some((toast) => toast.notificationId === notification.id);

            // Only show notifications from the last hour to avoid spam
            const isRecent = currentTime - notificationCreatedAt <= 3600000; // 1 hour

            return isAfterSessionStart && isNotAlreadyToasted && isRecent && !notification.isRead;
        });

        if (unshownNotifications.length > 0) {
            const getToastType = (type: string): 'info' | 'error' | 'success' | 'warning' => {
                switch (type?.toLowerCase()) {
                    case 'success':
                        return 'success';
                    case 'warning':
                        return 'warning';
                    case 'error':
                        return 'error';
                    default:
                        return 'info';
                }
            };

            const newToasts: ToastNotification[] = unshownNotifications.map((notification) => ({
                id: notification.id,
                notificationId: notification.id,
                title: notification.title || 'New Notification',
                message: notification.message || '',
                type: getToastType(notification.type),
                priority: notification.priority,
                duration: 5000,
            }));

            setToastNotifications((prev) => [...newToasts, ...prev]);

            // Broadcast toast notifications to other tabs
            if (!isChannelClosed.current && broadcastChannel.current) {
                newToasts.forEach((toast) => {
                    safeBroadcast({
                        type: 'TOAST_NOTIFICATION',
                        payload: { notification: notifications.find((n) => n.id === toast.notificationId) },
                    });
                });
            }
        }
    }, [notifications, toastNotifications, safeBroadcast]);

    // Production-optimized SSE connection handling - only for visible main tabs with enabled notifications
    useEffect(() => {
        // Early return if notifications are not enabled or not checked yet
        if (hasEnabledNotifications === null) {
            console.log('[SSE] Waiting for notification preferences check...');
            return;
        }

        if (!hasEnabledNotifications) {
            console.log('[SSE] No enabled notifications - skipping SSE connection');
            // Clean up any existing connections
            if (eventSource.current) {
                eventSource.current.close();
                eventSource.current = null;
                setConnected(false);
            }
            if (pollingTimer.current) {
                clearTimeout(pollingTimer.current);
                pollingTimer.current = null;
            }
            setUsingPollingFallback(false);
            return;
        }

        if (!isMainTab || !carrierId || !userId || !isPageVisible || !isInitialized) {
            // If not main tab, missing auth, not visible, or not initialized - close any existing connection
            if (eventSource.current) {
                eventSource.current.close();
                eventSource.current = null;
                setConnected(false);
                console.log(`[SSE] Connection closed - not eligible for SSE connection`);
            }
            return;
        }

        let reconnectAttempts = 0;
        const maxReconnectAttempts = PRODUCTION_CONFIG.CONNECTION_RETRY_LIMIT;

        // Polling fallback for when SSE fails
        const startPollingFallback = () => {
            if (usingPollingFallback || !isPageVisible) return;

            console.log(`[SSE] Starting polling fallback for tab ${tabId.current}`);
            setUsingPollingFallback(true);
            setConnected(false);

            const pollForNotifications = async () => {
                if (!usingPollingFallback || !isPageVisible) return;

                try {
                    const url = new URL('/api/notifications/poll', window.location.origin);
                    url.searchParams.set('carrierId', carrierId);
                    url.searchParams.set('userId', userId);
                    url.searchParams.set('lastCheck', lastPollingCheck.current.toString());

                    const response = await fetch(url.toString(), {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(5000), // 5s timeout
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.notifications?.length > 0) {
                            console.log(`[Polling] Received ${data.notifications.length} notifications`);
                            data.notifications.forEach((notification: any) => {
                                safeBroadcast({
                                    type: 'NEW_NOTIFICATION',
                                    payload: { notification },
                                });
                            });
                        }
                        lastPollingCheck.current = Date.now();
                    }
                } catch (error) {
                    console.warn('[Polling] Error:', error);
                } finally {
                    if (usingPollingFallback && isPageVisible) {
                        pollingTimer.current = setTimeout(pollForNotifications, PRODUCTION_CONFIG.POLLING_INTERVAL);
                    }
                }
            };

            pollForNotifications();
        };

        const stopPollingFallback = () => {
            if (pollingTimer.current) {
                clearTimeout(pollingTimer.current);
                pollingTimer.current = null;
            }
            setUsingPollingFallback(false);
            console.log(`[Polling] Stopped for tab ${tabId.current}`);
        };

        // Vercel-optimized SSE connection with fast timeout handling
        const connectSSE = () => {
            if (usingPollingFallback) {
                console.log(`[SSE] Skipping - using polling fallback`);
                return;
            }

            // Clear existing connection
            if (eventSource.current) {
                eventSource.current.close();
                eventSource.current = null;
            }
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
            }

            const url = new URL('/api/notifications/stream', window.location.origin);
            url.searchParams.set('carrierId', carrierId);
            url.searchParams.set('userId', userId);
            url.searchParams.set('t', Date.now().toString()); // Always add timestamp

            console.log(`[SSE] Connecting (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts + 1})`);

            // Set connection timeout matching Vercel function timeout
            connectionTimeoutRef.current = setTimeout(() => {
                console.warn(`[SSE] Connection timeout after ${PRODUCTION_CONFIG.SSE_CONNECTION_TIMEOUT}s`);
                sseFailureCount.current++;

                if (eventSource.current) {
                    eventSource.current.close();
                    eventSource.current = null;
                }
                setConnected(false);

                // Switch to polling after timeout
                if (sseFailureCount.current >= PRODUCTION_CONFIG.MAX_SSE_FAILURES) {
                    console.warn(`[SSE] Too many failures, switching to polling`);
                    startPollingFallback();
                    return;
                }

                // Try reconnection if under limit
                if (reconnectAttempts < maxReconnectAttempts && isPageVisible) {
                    scheduleReconnection();
                } else {
                    startPollingFallback();
                }
            }, PRODUCTION_CONFIG.SSE_CONNECTION_TIMEOUT * 1000);

            try {
                eventSource.current = new EventSource(url.toString());

                eventSource.current.onopen = () => {
                    console.log(`[SSE] Connected successfully for tab ${tabId.current}`);

                    // Clear timeout on successful connection
                    if (connectionTimeoutRef.current) {
                        clearTimeout(connectionTimeoutRef.current);
                        connectionTimeoutRef.current = null;
                    }

                    // Reset failure counters
                    sseFailureCount.current = 0;
                    connectionRetryCount.current = 0;
                    reconnectAttempts = 0;

                    setConnected(true);
                    broadcastConnectionStatus(true);
                    showUnshownToastNotifications();
                };

                eventSource.current.onmessage = (event) => {
                    if (!isPageVisible) return;

                    try {
                        const parsedData = JSON.parse(event.data);

                        // Handle different message types
                        switch (parsedData.type) {
                            case 'connected':
                                console.log(`[SSE] Initial connection confirmed (${parsedData.connectionTime}ms)`);
                                break;
                            case 'heartbeat':
                                // Silent heartbeat handling
                                break;
                            case 'timeout_warning':
                                console.warn(`[SSE] Server timeout warning: ${parsedData.message}`);
                                break;
                            case 'notification':
                                if (parsedData.notification) {
                                    handleSSENotification(parsedData.notification);
                                }
                                break;
                            case 'error':
                                console.warn(`[SSE] Server error: ${parsedData.message}`);
                                break;
                            default:
                                // Handle direct notification for backward compatibility
                                handleSSENotification(parsedData);
                        }
                    } catch (error) {
                        console.warn('[SSE] Message parse error:', error);
                    }
                };

                eventSource.current.onerror = (error) => {
                    console.warn(`[SSE] Connection error:`, error);

                    // Clear timeout on error
                    if (connectionTimeoutRef.current) {
                        clearTimeout(connectionTimeoutRef.current);
                        connectionTimeoutRef.current = null;
                    }

                    sseFailureCount.current++;
                    setConnected(false);
                    broadcastConnectionStatus(false);

                    if (eventSource.current) {
                        eventSource.current.close();
                        eventSource.current = null;
                    }

                    // Check if we should switch to polling
                    if (sseFailureCount.current >= PRODUCTION_CONFIG.MAX_SSE_FAILURES) {
                        console.warn(`[SSE] Max failures reached, switching to polling`);
                        startPollingFallback();
                        return;
                    }

                    // Try reconnection if under limits
                    if (reconnectAttempts < maxReconnectAttempts && isPageVisible) {
                        scheduleReconnection();
                    } else {
                        console.warn(`[SSE] Max reconnection attempts reached, switching to polling`);
                        startPollingFallback();
                    }
                };
            } catch (error) {
                console.error('[SSE] Failed to create EventSource:', error);
                sseFailureCount.current++;
                setConnected(false);

                if (
                    sseFailureCount.current >= PRODUCTION_CONFIG.MAX_SSE_FAILURES ||
                    reconnectAttempts >= maxReconnectAttempts
                ) {
                    startPollingFallback();
                } else if (isPageVisible) {
                    scheduleReconnection();
                }
            }
        };

        const scheduleReconnection = () => {
            const delay = Math.min(
                PRODUCTION_CONFIG.SSE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
                10000, // Cap at 10 seconds
            );

            reconnectAttempts++;
            console.log(`[SSE] Scheduling reconnection in ${delay}ms (attempt ${reconnectAttempts})`);

            setTimeout(() => {
                if (isPageVisible && isMainTab && !usingPollingFallback) {
                    connectSSE();
                }
            }, delay);
        };

        // Start connection
        connectSSE();

        return () => {
            // Cleanup timeouts
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
            }

            // Stop polling fallback
            stopPollingFallback();

            // Close SSE connection
            if (eventSource.current) {
                eventSource.current.close();
                eventSource.current = null;
            }
        };
    }, [isMainTab, carrierId, userId, isPageVisible, isInitialized, hasEnabledNotifications]);

    // Broadcast connection status to other tabs
    const broadcastConnectionStatus = (connected: boolean) => {
        safeBroadcast({
            type: 'CONNECTION_STATUS',
            payload: { connected },
        });
    };

    // Production-optimized utility functions with memory management
    const deduplicateAndSort = useCallback((notifications: any[]): any[] => {
        // Filter out admin and driver-specific notifications
        const filteredNotifications = notifications.filter((notification) => {
            if (notification.data && notification.data.forDriver === true) return false;
            if (!notification.userId) return false;
            return true;
        });

        // Remove duplicates based on ID
        const uniqueNotifications = filteredNotifications.filter(
            (notification, index, self) => index === self.findIndex((n) => n.id === notification.id),
        );

        // Sort by time first (most recent first), then by priority for ties
        const sorted = uniqueNotifications.sort((a, b) => {
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();

            if (aTime !== bTime) {
                return bTime - aTime;
            }

            const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
            const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
            const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;

            return bPriority - aPriority;
        });

        // Limit notifications in memory for production performance
        return sorted.slice(0, PRODUCTION_CONFIG.MAX_NOTIFICATIONS);
    }, []);

    // Handle notifications from SSE (main tab only)
    const handleSSENotification = useCallback(
        (notification: any) => {
            // Filter out driver/admin notifications
            if (notification.data && notification.data.forDriver === true) {
                return;
            }
            if (!notification.userId) {
                return;
            }

            // Check if already processed
            if (processedNotificationIds.current.has(notification.id)) {
                return;
            }
            processedNotificationIds.current.add(notification.id);

            // Update local state
            setNotifications((prev) => {
                const exists = prev.some((n) => n.id === notification.id);
                if (exists) {
                    return prev;
                }

                const updated = [notification, ...prev];
                const deduplicated = deduplicateAndSort(updated);
                return deduplicated;
            });

            // Update unread count
            if (!notification.isRead) {
                setUnreadCount((prev) => prev + 1);
            }

            // Show toast for new notifications (directly add to local state for main tab)
            const notificationCreatedAt = new Date(notification.createdAt).getTime();
            const sessionStart = sessionStartTime.current;

            if (notificationCreatedAt >= sessionStart) {
                const getToastType = (type: string): 'info' | 'error' | 'success' | 'warning' => {
                    switch (type?.toLowerCase()) {
                        case 'success':
                            return 'success';
                        case 'warning':
                            return 'warning';
                        case 'error':
                            return 'error';
                        default:
                            return 'info';
                    }
                };

                const toast: ToastNotification = {
                    id: notification.id,
                    notificationId: notification.id,
                    title: notification.title || 'New Notification',
                    message: notification.message || '',
                    type: getToastType(notification.type),
                    priority: notification.priority,
                    duration: 5000,
                };

                setToastNotifications((prev) => [toast, ...prev]);
            }

            // Broadcast to other tabs
            if (!isChannelClosed.current && broadcastChannel.current) {
                try {
                    safeBroadcast({
                        type: 'NEW_NOTIFICATION',
                        payload: { notification },
                    });

                    // Also broadcast toast notification for other tabs
                    if (notificationCreatedAt >= sessionStart) {
                        safeBroadcast({
                            type: 'TOAST_NOTIFICATION',
                            payload: { notification },
                        });
                    }
                } catch (error) {
                    // Ignore broadcast errors
                }
            }
        },
        [deduplicateAndSort, safeBroadcast],
    );

    // Production-optimized shared state management
    const updateSharedState = useCallback(() => {
        try {
            const state = {
                notifications: notifications.slice(0, PRODUCTION_CONFIG.MAX_NOTIFICATIONS), // Limit stored data
                unreadCount,
                timestamp: Date.now(),
            };
            localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch (error) {
            // Handle localStorage quota exceeded in production
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                // Clear old data and try again
                localStorage.removeItem(STATE_KEY);
                try {
                    const minimizedState = { notifications: [], unreadCount, timestamp: Date.now() };
                    localStorage.setItem(STATE_KEY, JSON.stringify(minimizedState));
                } catch (retryError) {
                    // Ignore retry errors
                }
            }
        }
    }, [notifications, unreadCount]);

    // Toast cleanup for memory management
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return;

        const cleanupInterval = setInterval(() => {
            setToastNotifications((prev) => {
                // Keep only the most recent toasts (last 10)
                return prev.slice(0, 10);
            });
        }, PRODUCTION_CONFIG.TOAST_CLEANUP_INTERVAL);

        return () => clearInterval(cleanupInterval);
    }, []);

    // Load shared state from localStorage - only notifications, not unread count
    const loadSharedState = useCallback(() => {
        try {
            const stateStr = localStorage.getItem(STATE_KEY);
            if (stateStr) {
                const state = JSON.parse(stateStr);
                setNotifications(state.notifications || []);
                // Don't load unread count from localStorage - let API be the source of truth
                // setUnreadCount(state.unreadCount || 0);
            }
        } catch (error) {
            // Ignore errors loading shared state
        }
    }, []);

    // Load initial state
    useEffect(() => {
        loadSharedState();
    }, [loadSharedState]);

    // Sync state changes to localStorage (debounced to prevent excessive writes)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            updateSharedState();
        }, 100); // Debounce by 100ms

        return () => clearTimeout(timeoutId);
    }, [updateSharedState]);

    // API methods - Production optimized with race condition prevention
    const refreshNotifications = useCallback(async () => {
        if (!carrierId || isLoadingRef.current) return; // Use ref instead of loading state

        isLoadingRef.current = true;
        setLoading(true);
        try {
            const response = await NotificationService.getNotifications({
                carrierId,
                userId,
                limit: PRODUCTION_CONFIG.MAX_NOTIFICATIONS,
                offset: 0,
            });

            const fetchedNotifications = response.data?.notifications || [];
            const fetchedUnreadCount = response.data?.unreadCount || 0;

            // Set the unread count from API response (don't calculate from notifications)
            setUnreadCount(fetchedUnreadCount);

            setNotifications((prev) => {
                const notificationMap = new Map();
                fetchedNotifications.forEach((notification) => {
                    notificationMap.set(notification.id, notification);
                });
                prev.forEach((existing) => {
                    if (!notificationMap.has(existing.id)) {
                        notificationMap.set(existing.id, existing);
                    }
                });

                const merged = Array.from(notificationMap.values());
                processedNotificationIds.current.clear();
                merged.forEach((notification) => {
                    processedNotificationIds.current.add(notification.id);
                });

                return deduplicateAndSort(merged);
            });

            // Direct broadcast without using safeBroadcast to avoid dependency
            if (!isChannelClosed.current && broadcastChannel.current) {
                try {
                    broadcastChannel.current.postMessage({
                        type: 'NOTIFICATION_UPDATE',
                        payload: {
                            notifications: fetchedNotifications,
                            unreadCount: fetchedUnreadCount,
                        },
                        fromTab: tabId.current,
                    });
                } catch (error) {
                    // Ignore broadcast errors
                }
            }
        } catch (error) {
            // Ignore refresh errors
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [carrierId, userId, deduplicateAndSort]); // Removed loading and safeBroadcast dependencies

    const markAsRead = useCallback(
        async (notificationIds: string[]) => {
            try {
                await NotificationService.markAsRead(notificationIds, userId);

                setNotifications((prev) => {
                    const updatedNotifications = prev.map((notif) =>
                        notificationIds.includes(notif.id)
                            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
                            : notif,
                    );

                    // Calculate new unread count from updated notifications
                    const newUnreadCount = updatedNotifications.filter((n) => !n.isRead).length;

                    // Update unread count immediately
                    setUnreadCount(newUnreadCount);

                    // Direct broadcast without using safeBroadcast to avoid dependency
                    if (!isChannelClosed.current && broadcastChannel.current) {
                        try {
                            broadcastChannel.current.postMessage({
                                type: 'NOTIFICATION_UPDATE',
                                payload: {
                                    notifications: updatedNotifications,
                                    unreadCount: newUnreadCount,
                                },
                                fromTab: tabId.current,
                            });
                        } catch (error) {
                            // Ignore broadcast errors
                        }
                    }

                    return updatedNotifications;
                });
            } catch (error) {
                // Ignore mark as read errors
            }
        },
        [userId],
    ); // Removed safeBroadcast, unreadCount, notifications dependencies

    const markAllAsRead = useCallback(async () => {
        if (!carrierId || !userId) return;

        try {
            await NotificationService.markAllAsRead(userId, carrierId);

            setNotifications((prev) => {
                const updatedNotifications = prev.map((notif) => ({
                    ...notif,
                    isRead: true,
                    readAt: new Date().toISOString(),
                }));

                // Direct broadcast without using safeBroadcast to avoid dependency
                if (!isChannelClosed.current && broadcastChannel.current) {
                    try {
                        broadcastChannel.current.postMessage({
                            type: 'NOTIFICATION_UPDATE',
                            payload: {
                                notifications: updatedNotifications,
                                unreadCount: 0,
                            },
                            fromTab: tabId.current,
                        });
                    } catch (error) {
                        // Ignore broadcast errors
                    }
                }

                return updatedNotifications;
            });

            setUnreadCount(0);
        } catch (error) {
            // Ignore mark all as read errors
        }
    }, [carrierId, userId]); // Removed safeBroadcast dependency

    const createNotification = useCallback(async (data: any) => {
        try {
            await NotificationService.createNotification(data);
        } catch (error) {
            // Ignore create notification errors
        }
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToastNotifications((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const markToastAsRead = useCallback(
        (notificationId: string) => {
            markAsRead([notificationId]).catch(() => {
                // Ignore errors
            });
            dismissToast(notificationId);
        },
        [markAsRead, dismissToast],
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (heartbeatTimer.current) {
                clearInterval(heartbeatTimer.current);
            }
            if (leaderCheckTimer.current) {
                clearInterval(leaderCheckTimer.current);
            }
            if (visibilityCheckTimer.current) {
                clearInterval(visibilityCheckTimer.current);
            }
            if (initTimer.current) {
                clearTimeout(initTimer.current);
            }
            if (pollingTimer.current) {
                clearTimeout(pollingTimer.current);
            }
            if (eventSource.current) {
                eventSource.current.close();
            }
            if (broadcastChannel.current) {
                broadcastChannel.current.close();
            }

            // If we were the leader, clear the leadership
            if (isMainTab) {
                const leaderInfo = localStorage.getItem(LEADER_KEY);
                if (leaderInfo) {
                    try {
                        const { tabId: leaderId } = JSON.parse(leaderInfo);
                        if (leaderId === tabId.current) {
                            localStorage.removeItem(LEADER_KEY);
                        }
                    } catch (error) {
                        // Ignore errors during cleanup
                    }
                }
            }
        };
    }, [isMainTab]);

    // Load notifications on mount and when session changes (production-optimized and non-blocking)
    useEffect(() => {
        // Early return if missing required data, already loading, or not initialized
        if (!userId || !carrierId || isLoadingRef.current || !isMounted || !isInitialized) return;

        // Don't load notifications if user has no enabled preferences
        if (hasEnabledNotifications === false) {
            console.log('[Notifications] Skipping notification load - no enabled preferences');
            return;
        }

        // Wait for preferences check to complete
        if (hasEnabledNotifications === null) {
            console.log('[Notifications] Waiting for preferences check before loading notifications');
            return;
        }

        const loadNotifications = async () => {
            // Double-check to prevent race conditions and ensure component is ready
            if (isLoadingRef.current || !isMounted || !isInitialized) return;

            isLoadingRef.current = true;
            setLoading(true);

            try {
                const response = await NotificationService.getNotifications({
                    carrierId,
                    userId,
                    limit: PRODUCTION_CONFIG.MAX_NOTIFICATIONS,
                    offset: 0,
                });

                // Check if component is still mounted and initialized before updating state
                if (!isMounted || !isInitialized) return;

                const fetchedNotifications = response.data?.notifications || [];
                const fetchedUnreadCount = response.data?.unreadCount || 0;

                // Set the unread count from API response first - this is the authoritative source
                setUnreadCount(fetchedUnreadCount);

                setNotifications((prev) => {
                    // Use only the fetched notifications as the authoritative source
                    // Don't merge with previous state during initial load to avoid count issues
                    const isInitialLoad = prev.length === 0;

                    if (isInitialLoad) {
                        // For initial load, use only API data
                        processedNotificationIds.current.clear();
                        fetchedNotifications.forEach((notification) => {
                            processedNotificationIds.current.add(notification.id);
                        });

                        return fetchedNotifications.slice(0, PRODUCTION_CONFIG.MAX_NOTIFICATIONS);
                    } else {
                        // For subsequent loads, merge carefully
                        const notificationMap = new Map();
                        fetchedNotifications.forEach((notification) => {
                            notificationMap.set(notification.id, notification);
                        });
                        prev.forEach((existing) => {
                            if (!notificationMap.has(existing.id)) {
                                notificationMap.set(existing.id, existing);
                            }
                        });

                        const merged = Array.from(notificationMap.values());
                        processedNotificationIds.current.clear();
                        merged.forEach((notification) => {
                            processedNotificationIds.current.add(notification.id);
                        });

                        // Inline deduplication and sorting with memory limit
                        const uniqueNotifications = merged.filter(
                            (notification, index, self) => index === self.findIndex((n) => n.id === notification.id),
                        );
                        const sorted = uniqueNotifications.sort((a, b) => {
                            const aTime = new Date(a.createdAt).getTime();
                            const bTime = new Date(b.createdAt).getTime();
                            return bTime - aTime;
                        });

                        return sorted.slice(0, PRODUCTION_CONFIG.MAX_NOTIFICATIONS);
                    }
                });

                // Only broadcast if we have a valid broadcast channel and component is ready
                if (!isChannelClosed.current && broadcastChannel.current && isMounted && isInitialized) {
                    try {
                        broadcastChannel.current.postMessage({
                            type: 'NOTIFICATION_UPDATE',
                            payload: {
                                notifications: fetchedNotifications,
                                unreadCount: fetchedUnreadCount,
                            },
                            fromTab: tabId.current,
                        });
                    } catch (error) {
                        // Ignore broadcast errors
                    }
                }
            } catch (error) {
                // Ignore notification load errors
            } finally {
                if (isMounted && isInitialized) {
                    setLoading(false);
                }
                isLoadingRef.current = false;
            }
        };

        // Only call immediately on mount if initialized, use shorter delay for faster loading
        const isInitialLoad = notifications.length === 0;
        const delay = isInitialLoad ? 50 : PRODUCTION_CONFIG.DEBOUNCE_DELAY; // Very short delay for initial load

        const timeoutId = setTimeout(loadNotifications, delay);

        return () => {
            clearTimeout(timeoutId);
            // Don't reset isLoadingRef here as it might be in progress
        };
    }, [userId, carrierId, isMounted, isInitialized, hasEnabledNotifications]);

    const value = useMemo(
        () => ({
            notifications,
            unreadCount,
            loading,
            connected,
            usingPollingFallback,
            hasEnabledNotifications,
            toastNotifications,
            markAsRead,
            markAllAsRead,
            refreshNotifications,
            createNotification,
            dismissToast,
            markToastAsRead,
            isMainTab,
            checkNotificationPreferences,
        }),
        [
            notifications,
            unreadCount,
            loading,
            connected,
            usingPollingFallback,
            hasEnabledNotifications,
            toastNotifications,
            markAsRead,
            markAllAsRead,
            refreshNotifications,
            createNotification,
            dismissToast,
            markToastAsRead,
            isMainTab,
            checkNotificationPreferences,
        ],
    );

    return <GlobalNotificationContext.Provider value={value}>{children}</GlobalNotificationContext.Provider>;
};
