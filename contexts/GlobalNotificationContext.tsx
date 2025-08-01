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
    HEARTBEAT_INTERVAL: process.env.NODE_ENV === 'production' ? 8000 : 5000,
    LEADER_TIMEOUT: process.env.NODE_ENV === 'production' ? 20000 : 10000,
    SSE_RECONNECT_DELAY: process.env.NODE_ENV === 'production' ? 1000 : 500,
    SSE_CONNECTION_TIMEOUT: process.env.NODE_ENV === 'production' ? 30 : 15,
    MAX_NOTIFICATIONS: 100,
    DEBOUNCE_DELAY: process.env.NODE_ENV === 'production' ? 1000 : 500,
    TOAST_CLEANUP_INTERVAL: 30000,
    INIT_DELAY: process.env.NODE_ENV === 'production' ? 200 : 100,
    VISIBILITY_CHECK_INTERVAL: 5000,
    POLLING_INTERVAL: process.env.NODE_ENV === 'production' ? 15000 : 10000,
    MAX_SSE_FAILURES: 3,
    AUTO_RECONNECT_ON_CLOSE: true,
    CONNECTION_RETRY_LIMIT: 5,
};

// Broadcast channel for communication between tabs
const CHANNEL_NAME = 'carrier-nest-notifications';
const LEADER_KEY = 'carrier-nest-notification-leader';
const STATE_KEY = 'carrier-nest-notification-state';
const TOAST_SHOWN_KEY = 'carrier-nest-toast-shown';

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
    const [hasEnabledNotifications, setHasEnabledNotifications] = useState<boolean | null>(null);

    const broadcastChannel = useRef<BroadcastChannel | null>(null);
    const eventSource = useRef<EventSource | null>(null);
    const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
    const leaderCheckTimer = useRef<NodeJS.Timeout | null>(null);
    const visibilityCheckTimer = useRef<NodeJS.Timeout | null>(null);
    const initTimer = useRef<NodeJS.Timeout | null>(null);
    const tabId = useRef<string>(Math.random().toString(36).substr(2, 9));
    const processedNotificationIds = useRef(new Set<string>());
    const toastCreatedNotificationIds = useRef(new Set<string>());
    const sessionStartTime = useRef(Date.now());
    const tabInactiveTimestamp = useRef<number | null>(null);
    const isChannelClosed = useRef<boolean>(false);
    const isLoadingRef = useRef<boolean>(false);
    const pollingTimer = useRef<NodeJS.Timeout | null>(null);
    const lastPollingCheck = useRef<number>(Date.now());
    const sseFailureCount = useRef<number>(0);
    const connectionRetryCount = useRef<number>(0);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const carrierId = session?.user?.defaultCarrierId;
    const userId = session?.user?.id;

    // Helper functions for persistent toast tracking
    const getShownToastIds = useCallback((): Set<string> => {
        try {
            const stored = localStorage.getItem(TOAST_SHOWN_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
                const filtered = data.filter((item: any) => item.timestamp > dayAgo);
                localStorage.setItem(TOAST_SHOWN_KEY, JSON.stringify(filtered));
                return new Set(filtered.map((item: any) => item.id));
            }
        } catch (error) {
            localStorage.removeItem(TOAST_SHOWN_KEY);
        }
        return new Set<string>();
    }, []);

    const markToastAsShown = useCallback(
        (notificationId: string) => {
            try {
                const existing = getShownToastIds();
                if (!existing.has(notificationId)) {
                    const stored = localStorage.getItem(TOAST_SHOWN_KEY);
                    const data = stored ? JSON.parse(stored) : [];
                    data.push({ id: notificationId, timestamp: Date.now() });
                    localStorage.setItem(TOAST_SHOWN_KEY, JSON.stringify(data));
                    toastCreatedNotificationIds.current.add(notificationId);
                }
            } catch (error) {
                toastCreatedNotificationIds.current.add(notificationId);
            }
        },
        [getShownToastIds],
    );

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
                const hasAnyEnabled = preferences.some(
                    (pref: any) => pref.enabled || pref.emailEnabled || pref.smsEnabled || pref.pushEnabled,
                );
                setHasEnabledNotifications(hasAnyEnabled);
                return hasAnyEnabled;
            } else {
                setHasEnabledNotifications(false);
                return false;
            }
        } catch (error) {
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

    // Function to show toast notifications for notifications that occurred while tab was inactive
    const showNotificationsFromInactiveTime = useCallback(
        (inactiveTimestamp: number) => {
            if (!notifications.length) {
                return;
            }

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

            const notificationsWhileInactive = notifications.filter((notification) => {
                const notificationTime = new Date(notification.createdAt).getTime();
                const isAfterInactive = notificationTime > inactiveTimestamp;
                const isNotAlreadyToasted = !toastNotifications.some(
                    (toast) => toast.notificationId === notification.id,
                );
                const isForCurrentUser = notification.userId === userId;

                return isAfterInactive && isNotAlreadyToasted && !notification.isRead && isForCurrentUser;
            });

            if (notificationsWhileInactive.length > 0) {
                const newToasts: ToastNotification[] = notificationsWhileInactive.map((notification) => ({
                    id: notification.id,
                    notificationId: notification.id,
                    title: notification.title || 'New Notification',
                    message: notification.message || '',
                    type: getToastType(notification.type),
                    priority: notification.priority,
                    duration: 8000,
                }));

                setToastNotifications((prev) => [...newToasts, ...prev]);

                if (!isChannelClosed.current && broadcastChannel.current) {
                    newToasts.forEach((toast) => {
                        safeBroadcast({
                            type: 'TOAST_NOTIFICATION',
                            payload: {
                                notification: notifications.find((n) => n.id === toast.notificationId),
                                fromInactive: true,
                            },
                        });
                    });
                }
            }
        },
        [notifications, toastNotifications, safeBroadcast, userId],
    );

    // Page and Window Visibility API - Track when tab/window becomes active/inactive
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleVisibilityChange = () => {
            const isTabVisible = !document.hidden;
            const isWindowFocused = document.hasFocus();
            const isVisible = isTabVisible && isWindowFocused;

            setIsPageVisible(isVisible);

            if (!isVisible) {
                const reason = !isTabVisible ? 'tab inactivity' : 'window lost focus';

                tabInactiveTimestamp.current = Date.now();

                if (eventSource.current) {
                    eventSource.current.close();
                    eventSource.current = null;
                    setConnected(false);
                }

                if (heartbeatTimer.current) {
                    clearInterval(heartbeatTimer.current);
                    heartbeatTimer.current = null;
                }

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

                safeBroadcast({
                    type: 'TAB_INACTIVE',
                    payload: { tabId: tabId.current },
                });
            } else {
                console.log(
                    `[Tab Tracking] Previous inactive timestamp:`,
                    tabInactiveTimestamp.current ? new Date(tabInactiveTimestamp.current).toISOString() : 'null',
                );
                console.log(
                    `[Tab Tracking] Current session start time:`,
                    new Date(sessionStartTime.current).toISOString(),
                );

                if (tabInactiveTimestamp.current) {
                    const inactiveTime = tabInactiveTimestamp.current;
                    const inactiveDuration = Date.now() - inactiveTime;
                    console.log(
                        `[Tab Tracking] Tab was inactive for ${inactiveDuration}ms (${Math.round(
                            inactiveDuration / 1000,
                        )}s)`,
                    );
                    console.log(
                        `[Tab Tracking] Checking for notifications since ${new Date(inactiveTime).toISOString()}`,
                    );

                    setTimeout(() => {
                        console.log(`[Tab Tracking] Running showNotificationsFromInactiveTime after 100ms delay`);
                        showNotificationsFromInactiveTime(inactiveTime);
                    }, 100);

                    tabInactiveTimestamp.current = null;
                } else {
                    console.log(`[Tab Tracking] No previous inactive timestamp found`);
                }

                const newSessionStart = Date.now();
                console.log(
                    `[Tab Tracking] Updating session start time from ${new Date(
                        sessionStartTime.current,
                    ).toISOString()} to ${new Date(newSessionStart).toISOString()}`,
                );
                sessionStartTime.current = newSessionStart;

                setTimeout(() => {
                    if (isPageVisible && isMounted && isInitialized) {
                        electLeader();
                    }
                }, 500);
                console.log(`[Tab Tracking] ================================`);
            }
        };

        const initialTabVisible = !document.hidden;
        const initialWindowFocused = document.hasFocus();
        setIsPageVisible(initialTabVisible && initialWindowFocused);

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);
        window.addEventListener('blur', handleVisibilityChange);

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
    }, [isMainTab, isMounted, isInitialized, isPageVisible, showNotificationsFromInactiveTime]);

    // Non-blocking initialization
    useEffect(() => {
        if (typeof window === 'undefined') return;

        initTimer.current = setTimeout(() => {
            setIsMounted(true);
            setIsInitialized(true);

            const shownToastIds = getShownToastIds();
            shownToastIds.forEach((id) => toastCreatedNotificationIds.current.add(id));
        }, PRODUCTION_CONFIG.INIT_DELAY);

        return () => {
            if (initTimer.current) {
                clearTimeout(initTimer.current);
            }
        };
    }, [getShownToastIds]);

    // Initialize broadcast channel
    useEffect(() => {
        if (typeof window === 'undefined' || !isInitialized) return;

        isChannelClosed.current = false;
        broadcastChannel.current = new BroadcastChannel(CHANNEL_NAME);

        broadcastChannel.current.onmessage = (event) => {
            if (isChannelClosed.current) return;

            const { type, payload, fromTab } = event.data;

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
                    setNotifications((prev) => {
                        const exists = prev.some((n) => n.id === payload.notification.id);
                        if (exists) return prev;

                        const updated = [payload.notification, ...prev];
                        const uniqueNotifications = updated.filter(
                            (notification, index, self) => index === self.findIndex((n) => n.id === notification.id),
                        );
                        return uniqueNotifications.sort((a, b) => {
                            const aTime = new Date(a.createdAt).getTime();
                            const bTime = new Date(b.createdAt).getTime();
                            return bTime - aTime;
                        });
                    });
                    break;
                case 'TOAST_NOTIFICATION':
                    const notificationTimestamp = new Date(payload.notification.createdAt).getTime();
                    const currentTabSessionStart = sessionStartTime.current;
                    const shouldShowToast = payload.fromInactive || notificationTimestamp >= currentTabSessionStart;

                    if (shouldShowToast) {
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
                            duration: payload.fromInactive ? 6000 : 5000,
                        };
                        setToastNotifications((prev) => [toast, ...prev]);
                    }
                    break;
                case 'TAB_INACTIVE':
                    if (isPageVisible && isInitialized && !isMainTab) {
                        setTimeout(() => electLeader(), 1000);
                    }
                    break;
                case 'LEADER_HEARTBEAT':
                    if (payload.tabId !== tabId.current) {
                        setIsMainTab(false);
                        updateLeaderTimestamp(payload.tabId);
                    }
                    break;
                case 'LEADER_ELECTION':
                    if (isMainTab && payload.tabId !== tabId.current && isPageVisible) {
                        safeBroadcast({
                            type: 'LEADER_HEARTBEAT',
                            payload: { tabId: tabId.current },
                        });
                    }
                    break;
            }
        };

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
    }, [isInitialized, isPageVisible]);

    // Leader election logic
    const electLeader = useCallback(() => {
        if (typeof window === 'undefined' || !isPageVisible || !isInitialized) {
            return;
        }

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

        safeBroadcast({
            type: 'LEADER_HEARTBEAT',
            payload: { tabId: tabId.current },
        });
    }, [safeBroadcast, updateLeaderTimestamp]);

    // Periodic check for leader status
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
        const shownToastIds = getShownToastIds();

        const unshownNotifications = notifications.filter((notification) => {
            const notificationCreatedAt = new Date(notification.createdAt).getTime();
            const isAfterSessionStart = notificationCreatedAt >= sessionStart;
            const isNotAlreadyToasted = !toastNotifications.some((toast) => toast.notificationId === notification.id);
            const isNotPreviouslyShown = !shownToastIds.has(notification.id);
            const isRecent = currentTime - notificationCreatedAt <= 3600000; // 1 hour

            return (
                isAfterSessionStart && isNotAlreadyToasted && isNotPreviouslyShown && isRecent && !notification.isRead
            );
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

            newToasts.forEach((toast) => markToastAsShown(toast.notificationId));
            setToastNotifications((prev) => [...newToasts, ...prev]);

            if (!isChannelClosed.current && broadcastChannel.current) {
                newToasts.forEach((toast) => {
                    safeBroadcast({
                        type: 'TOAST_NOTIFICATION',
                        payload: { notification: notifications.find((n) => n.id === toast.notificationId) },
                    });
                });
            }
        }
    }, [notifications, toastNotifications, safeBroadcast, getShownToastIds, markToastAsShown]);

    // Production-optimized SSE connection handling
    useEffect(() => {
        if (hasEnabledNotifications === null) {
            return;
        }

        if (!hasEnabledNotifications) {
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
            if (eventSource.current) {
                eventSource.current.close();
                eventSource.current = null;
                setConnected(false);
            }
            return;
        }

        let reconnectAttempts = 0;
        const maxReconnectAttempts = PRODUCTION_CONFIG.CONNECTION_RETRY_LIMIT;

        const startPollingFallback = () => {
            if (usingPollingFallback || !isPageVisible) return;

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
                        signal: AbortSignal.timeout(5000),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.notifications?.length > 0) {
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
                    // Ignore polling errors
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
        };

        const connectSSE = () => {
            if (usingPollingFallback) {
                return;
            }

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
            url.searchParams.set('t', Date.now().toString());

            connectionTimeoutRef.current = setTimeout(() => {
                sseFailureCount.current++;

                if (eventSource.current) {
                    eventSource.current.close();
                    eventSource.current = null;
                }
                setConnected(false);

                if (sseFailureCount.current >= PRODUCTION_CONFIG.MAX_SSE_FAILURES) {
                    startPollingFallback();
                    return;
                }

                if (reconnectAttempts < maxReconnectAttempts && isPageVisible) {
                    scheduleReconnection();
                } else {
                    startPollingFallback();
                }
            }, PRODUCTION_CONFIG.SSE_CONNECTION_TIMEOUT * 1000);

            try {
                eventSource.current = new EventSource(url.toString());

                eventSource.current.onopen = () => {
                    if (connectionTimeoutRef.current) {
                        clearTimeout(connectionTimeoutRef.current);
                        connectionTimeoutRef.current = null;
                    }

                    sseFailureCount.current = 0;
                    connectionRetryCount.current = 0;
                    reconnectAttempts = 0;

                    const oldSessionStart = sessionStartTime.current;
                    sessionStartTime.current = Date.now();

                    setConnected(true);
                    broadcastConnectionStatus(true);
                    showUnshownToastNotifications();
                };

                eventSource.current.onmessage = (event) => {
                    if (!isPageVisible) return;

                    try {
                        const parsedData = JSON.parse(event.data);

                        switch (parsedData.type) {
                            case 'connected':
                                break;
                            case 'heartbeat':
                                if (parsedData.dbStatus === 'disabled') {
                                    console.warn('[SSE] Database queries disabled on server side');
                                }
                                break;
                            case 'timeout_warning':
                                if (parsedData.shouldReconnect && PRODUCTION_CONFIG.AUTO_RECONNECT_ON_CLOSE) {
                                    // Wait for auto-reconnect
                                } else {
                                    if (eventSource.current) {
                                        eventSource.current.close();
                                        eventSource.current = null;
                                        setConnected(false);
                                    }
                                    startPollingFallback();
                                }
                                break;
                            case 'early_warning':
                                break;
                            case 'notification':
                                if (parsedData.notification) {
                                    handleSSENotification(parsedData.notification);
                                }
                                break;
                            case 'error':
                                break;
                            default:
                                handleSSENotification(parsedData);
                        }
                    } catch (error) {
                        // Ignore parse errors
                    }
                };

                eventSource.current.onerror = (error) => {
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

                    if (isPageVisible && isMainTab && PRODUCTION_CONFIG.AUTO_RECONNECT_ON_CLOSE) {
                        if (reconnectAttempts < maxReconnectAttempts) {
                            scheduleReconnection();
                            return;
                        }
                    }

                    if (sseFailureCount.current >= PRODUCTION_CONFIG.MAX_SSE_FAILURES) {
                        startPollingFallback();
                        return;
                    }

                    if (reconnectAttempts < maxReconnectAttempts && isPageVisible) {
                        scheduleReconnection();
                    } else {
                        startPollingFallback();
                    }
                };
            } catch (error) {
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
            const delay = Math.min(PRODUCTION_CONFIG.SSE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), 10000);

            reconnectAttempts++;

            setTimeout(() => {
                if (isPageVisible && isMainTab && !usingPollingFallback) {
                    connectSSE();
                }
            }, delay);
        };

        connectSSE();

        return () => {
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
            }

            stopPollingFallback();

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
    const deduplicateAndSort = useCallback(
        (notifications: any[]): any[] => {
            const filteredNotifications = notifications.filter((notification) => {
                if (!notification.userId) {
                    return false;
                }

                if (notification.data && notification.data.forDriver === true && notification.userId !== userId) {
                    return false;
                }

                return true;
            });

            const uniqueNotifications = filteredNotifications.filter(
                (notification, index, self) => index === self.findIndex((n) => n.id === notification.id),
            );

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

            return sorted.slice(0, PRODUCTION_CONFIG.MAX_NOTIFICATIONS);
        },
        [userId],
    );

    // Handle notifications from SSE (main tab only)
    const handleSSENotification = useCallback(
        (notification: any) => {
            if (notification.data && notification.data.forDriver === true) {
                if (notification.userId !== userId) {
                    return;
                }
            }

            if (!notification.userId) {
                return;
            }

            if (notification.userId !== userId) {
                return;
            }

            if (processedNotificationIds.current.has(notification.id)) {
                const notificationCreatedAt = new Date(notification.createdAt).getTime();
                const hasExistingToast = toastNotifications.some((toast) => toast.notificationId === notification.id);
                const hasAlreadyCreatedToast = toastCreatedNotificationIds.current.has(notification.id);
                const notificationAge = Date.now() - notificationCreatedAt;
                const isRecentEnough = notificationAge <= 3600000; // 1 hour

                if (!hasExistingToast && !hasAlreadyCreatedToast && !notification.isRead && isRecentEnough) {
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

                    markToastAsShown(notification.id);
                    setToastNotifications((prev) => [toast, ...prev]);
                }

                return;
            }
            processedNotificationIds.current.add(notification.id);

            setNotifications((prev) => {
                const exists = prev.some((n) => n.id === notification.id);
                if (exists) {
                    return prev;
                }

                const updated = [notification, ...prev];
                const deduplicated = deduplicateAndSort(updated);
                return deduplicated;
            });

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

                markToastAsShown(notification.id);
                setToastNotifications((prev) => [toast, ...prev]);
            }

            if (!isChannelClosed.current && broadcastChannel.current) {
                try {
                    safeBroadcast({
                        type: 'NEW_NOTIFICATION',
                        payload: { notification },
                    });

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

            setTimeout(() => {
                // Refresh without dependency
                if (!carrierId || isLoadingRef.current) return;

                isLoadingRef.current = true;
                setLoading(true);

                NotificationService.getNotifications({
                    carrierId,
                    userId,
                    limit: PRODUCTION_CONFIG.MAX_NOTIFICATIONS,
                    offset: 0,
                })
                    .then((response) => {
                        const fetchedNotifications = response.data?.notifications || [];
                        const fetchedUnreadCount = response.data?.unreadCount || 0;
                        setUnreadCount(fetchedUnreadCount);
                    })
                    .catch(() => {
                        // Ignore refresh errors
                    })
                    .finally(() => {
                        setLoading(false);
                        isLoadingRef.current = false;
                    });
            }, 1000);
        },
        [deduplicateAndSort, safeBroadcast, userId, markToastAsShown, toastNotifications],
    );

    // Production-optimized shared state management
    const updateSharedState = useCallback(() => {
        try {
            const state = {
                notifications: notifications.slice(0, PRODUCTION_CONFIG.MAX_NOTIFICATIONS),
                unreadCount,
                timestamp: Date.now(),
            };
            localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch (error) {
            if (error instanceof Error && error.name === 'QuotaExceededError') {
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

    // Periodic unread count validation
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return;

        const validateInterval = setInterval(() => {
            const calculatedUnreadCount = notifications.filter((n) => !n.isRead).length;

            if (calculatedUnreadCount !== unreadCount) {
                setUnreadCount(calculatedUnreadCount);
            }
        }, 30000);

        return () => clearInterval(validateInterval);
    }, [notifications, unreadCount]);

    // Toast cleanup for memory management
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return;

        const cleanupInterval = setInterval(() => {
            setToastNotifications((prev) => prev.slice(0, 10));
        }, PRODUCTION_CONFIG.TOAST_CLEANUP_INTERVAL);

        return () => clearInterval(cleanupInterval);
    }, []);

    // Load shared state from localStorage
    const loadSharedState = useCallback(() => {
        try {
            const stateStr = localStorage.getItem(STATE_KEY);
            if (stateStr) {
                const state = JSON.parse(stateStr);
                setNotifications(state.notifications || []);
            }
        } catch (error) {
            // Ignore errors loading shared state
        }
    }, []);

    // Load initial state
    useEffect(() => {
        loadSharedState();
    }, [loadSharedState]);

    // Sync state changes to localStorage (debounced)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            updateSharedState();
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [updateSharedState]);

    // API methods - Production optimized
    const refreshNotifications = useCallback(async () => {
        if (!carrierId || isLoadingRef.current) return;

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
    }, [carrierId, userId, deduplicateAndSort]);

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

                    const newUnreadCount = updatedNotifications.filter((n) => !n.isRead).length;
                    setUnreadCount(newUnreadCount);

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
    );

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
    }, [carrierId, userId]);

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

    // Load notifications on mount and when session changes
    useEffect(() => {
        if (!userId || !carrierId || isLoadingRef.current || !isMounted || !isInitialized) return;

        if (hasEnabledNotifications === false) {
            return;
        }

        if (hasEnabledNotifications === null) {
            return;
        }

        const loadNotifications = async () => {
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

                if (!isMounted || !isInitialized) return;

                const fetchedNotifications = response.data?.notifications || [];
                const fetchedUnreadCount = response.data?.unreadCount || 0;

                setUnreadCount(fetchedUnreadCount);

                setNotifications((prev) => {
                    const isInitialLoad = prev.length === 0;

                    if (isInitialLoad) {
                        processedNotificationIds.current.clear();
                        fetchedNotifications.forEach((notification) => {
                            processedNotificationIds.current.add(notification.id);
                        });

                        return fetchedNotifications.slice(0, PRODUCTION_CONFIG.MAX_NOTIFICATIONS);
                    } else {
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

        const isInitialLoad = notifications.length === 0;
        const delay = isInitialLoad ? 50 : PRODUCTION_CONFIG.DEBOUNCE_DELAY;

        const timeoutId = setTimeout(loadNotifications, delay);

        return () => {
            clearTimeout(timeoutId);
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
