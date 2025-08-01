import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useGlobalNotifications } from '../../contexts/GlobalNotificationContext';
import { NotificationService } from '../../lib/services/NotificationServiceClient';
import Layout from '../../components/layout/Layout';
import NotificationsSkeleton from '../../components/skeletons/NotificationsSkeleton';
import {
    BellIcon,
    CheckIcon,
    EyeIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    InformationCircleIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

const NOTIFICATIONS_PER_PAGE = 100;

// Notification type display helpers
function getNotificationTypeDisplayName(type: string): string {
    const typeMap: Record<string, string> = {
        ASSIGNMENT_STARTED: 'Assignment Started',
        ASSIGNMENT_COMPLETED: 'Assignment Completed',
        ASSIGNMENT_CANCELLED: 'Assignment Cancelled',
        ASSIGNMENT_UPDATED: 'Assignment Updated',
        DOCUMENT_UPLOADED: 'Document Uploaded',
        DOCUMENT_DELETED: 'Document Deleted',
        ROUTE_LEG_COMPLETED: 'Route Leg Completed',
        ROUTE_LEG_STARTED: 'Route Leg Started',
        ROUTE_LEG_UPDATED: 'Route Leg Updated',
        DRIVER_ASSIGNMENT_NOTIFICATION: 'Driver Assignment',
        LOAD_UPDATED: 'Load Updated',
        INVOICE_GENERATED: 'Invoice Generated',
        PAYMENT_RECEIVED: 'Payment Received',
        SYSTEM_MAINTENANCE: 'System Maintenance',
        SECURITY_ALERT: 'Security Alert',
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function getNotificationTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
        ASSIGNMENT_STARTED:
            'Driver has started working on the assigned route and is actively executing the delivery plan.',
        ASSIGNMENT_COMPLETED:
            'Driver has successfully completed the assignment and all associated route legs have been finished.',
        ASSIGNMENT_CANCELLED: 'The assignment has been cancelled and is no longer active. Driver has been notified.',
        ASSIGNMENT_UPDATED:
            'Assignment details have been modified, including route changes, timing updates, or special instructions.',
        DOCUMENT_UPLOADED:
            'New documentation has been uploaded and attached to the assignment for compliance and record keeping.',
        DOCUMENT_DELETED:
            'A document has been removed from the assignment. This could be due to corrections, updates, or policy changes.',
        ROUTE_LEG_COMPLETED: 'A specific segment of the route has been completed successfully by the driver.',
        ROUTE_LEG_STARTED:
            'Driver has begun a new segment of the route and is actively traveling to the next destination.',
        ROUTE_LEG_UPDATED:
            'Route leg information has been updated with new details, timing, or special delivery instructions.',
        DRIVER_ASSIGNMENT_NOTIFICATION:
            'Notification sent directly to the assigned driver regarding their current or upcoming assignments.',
        LOAD_UPDATED: 'Load information has been modified, affecting weight, cargo details, or delivery requirements.',
        INVOICE_GENERATED: 'A new invoice has been automatically generated for completed delivery services.',
        PAYMENT_RECEIVED: 'Payment has been successfully processed and received for completed services.',
        SYSTEM_MAINTENANCE:
            'Scheduled system maintenance notification to inform users of potential service interruptions.',
        SECURITY_ALERT: 'Important security notification requiring immediate attention to protect your account.',
    };
    return descriptions[type] || 'General notification about system activity or updates.';
}

const NotificationsPage: React.FC = () => {
    const { data: session } = useSession();
    const { unreadCount, connected, loading: contextLoading, markAsRead, markAllAsRead } = useGlobalNotifications();

    const [filter, setFilter] = useState<'all' | 'unread'>('unread');
    const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [animatingOut, setAnimatingOut] = useState<string[]>([]); // Track notifications animating out

    const carrierId = session?.user?.defaultCarrierId;
    const userId = session?.user?.id;

    // Calculate pagination values
    const totalPages = Math.ceil(totalCount / NOTIFICATIONS_PER_PAGE);
    const offset = (currentPage - 1) * NOTIFICATIONS_PER_PAGE;

    // Fetch notifications with pagination
    const fetchNotifications = async (page = 1, filterType: 'all' | 'unread' = filter) => {
        if (!carrierId) return;

        setLoading(true);
        try {
            const offset = (page - 1) * NOTIFICATIONS_PER_PAGE;
            const response = await NotificationService.getNotifications({
                carrierId,
                userId,
                limit: NOTIFICATIONS_PER_PAGE,
                offset,
                unreadOnly: filterType === 'unread',
            });

            if (response.code === 200 && response.data) {
                setNotifications(response.data.notifications || []);
                setTotalCount(response.data.total || 0);
                setHasMore(response.data.hasMore || false);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setNotifications([]);
            setTotalCount(0);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch when component mounts or dependencies change
    useEffect(() => {
        if (carrierId && userId) {
            fetchNotifications(1, filter);
            setCurrentPage(1);
        }
    }, [carrierId, userId, filter]);

    const handleSelectNotification = (id: string) => {
        setSelectedNotifications((prev) => (prev.includes(id) ? prev.filter((nId) => nId !== id) : [...prev, id]));
    };

    const handleSelectAll = () => {
        if (selectedNotifications.length === notifications.length) {
            setSelectedNotifications([]);
        } else {
            setSelectedNotifications(notifications.map((n) => n.id));
        }
    };

    const handleMarkSelectedAsRead = async () => {
        if (selectedNotifications.length > 0) {
            // If on unread tab, animate out selected notifications
            if (filter === 'unread') {
                setAnimatingOut((prev) => [...prev, ...selectedNotifications]);

                setTimeout(async () => {
                    await markAsRead(selectedNotifications);

                    // Remove from notifications list after animation
                    setTimeout(() => {
                        setNotifications((prev) => prev.filter((n) => !selectedNotifications.includes(n.id)));
                        setAnimatingOut((prev) => prev.filter((id) => !selectedNotifications.includes(id)));
                        setSelectedNotifications([]);
                    }, 300);
                }, 100);
            } else {
                await markAsRead(selectedNotifications);
                setSelectedNotifications([]);
                // Refresh the current page to reflect changes
                await fetchNotifications(currentPage, filter);
            }
        }
    };

    const handleMarkAllAsRead = async () => {
        if (filter === 'unread' && notifications.length > 0) {
            // Animate out all unread notifications
            const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
            setAnimatingOut(unreadIds);

            setTimeout(async () => {
                await markAllAsRead();

                // Remove all unread notifications after animation
                setTimeout(() => {
                    setNotifications((prev) => prev.filter((n) => n.isRead));
                    setAnimatingOut([]);
                }, 300);
            }, 100);
        } else {
            await markAllAsRead();
            // Refresh the current page to reflect changes
            await fetchNotifications(currentPage, filter);
        }
    };

    const handlePageChange = async (page: number) => {
        setCurrentPage(page);
        setSelectedNotifications([]); // Clear selections when changing pages
        await fetchNotifications(page, filter);
    };

    const handleNotificationClick = async (notification: any) => {
        if (!notification.isRead) {
            // If on unread tab, add to animating out list first
            if (filter === 'unread') {
                setAnimatingOut((prev) => [...prev, notification.id]);

                // Wait for animation to start, then mark as read
                setTimeout(async () => {
                    await markAsRead([notification.id]);

                    // Remove from notifications list after animation completes
                    setTimeout(() => {
                        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
                        setAnimatingOut((prev) => prev.filter((id) => id !== notification.id));
                    }, 300); // Match animation duration
                }, 100);
            } else {
                // If on all tab, just mark as read and update locally
                await markAsRead([notification.id]);
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
                    ),
                );
            }
        }
    };

    const getTimeAgo = (date: string) => {
        const now = new Date();
        const notificationDate = new Date(date);
        const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    useEffect(() => {
        // This effect was previously for refreshing notifications when filter changed
        // Now it's handled in the main useEffect above
    }, []);

    const smHeaderComponent = (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <BellSolidIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-base font-semibold text-gray-900 truncate">Notifications</h1>
                    {unreadCount > 0 && <p className="text-xs text-gray-600">{unreadCount} unread</p>}
                </div>
            </div>
        </div>
    );

    return (
        <Layout smHeaderComponent={smHeaderComponent}>
            <div className="flex flex-col h-full bg-gray-50/50 -mt-1 md:mt-0">
                {/* Clean Apple-style Header */}
                <div
                    className="hidden md:block sticky top-0 z-10"
                    style={{
                        background: `rgba(255, 255, 255, 0.8)`,
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <div className="px-6 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-4">
                                    {/* Simplified icon container */}
                                    <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                                        <BellSolidIcon className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h1
                                            className="text-2xl font-semibold text-gray-900"
                                            style={{
                                                letterSpacing: '-0.025em',
                                                fontFamily:
                                                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                                            }}
                                        >
                                            Notifications
                                        </h1>
                                        <p
                                            className="text-sm text-gray-500 mt-1"
                                            style={{
                                                fontFamily:
                                                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                            }}
                                        >
                                            Real-time updates about assignments and routes
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Clean filter tabs */}
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setFilter('unread')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                            filter === 'unread'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                        style={{
                                            fontFamily:
                                                '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                        }}
                                    >
                                        Unread ({unreadCount})
                                    </button>
                                    <button
                                        onClick={() => setFilter('all')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                            filter === 'all'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                        style={{
                                            fontFamily:
                                                '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                        }}
                                    >
                                        All
                                    </button>
                                </div>

                                {/* Mark All Read Button */}
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 font-medium rounded-xl transition-all duration-200 hover:scale-105"
                                    >
                                        <CheckIcon className="w-4 h-4" />
                                        Mark all as read
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Bulk Actions */}
                        {selectedNotifications.length > 0 && (
                            <div className="mt-4 p-4 bg-blue-50/80 backdrop-blur-xl rounded-2xl border border-blue-200/50">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-blue-900">
                                        {selectedNotifications.length} notification
                                        {selectedNotifications.length > 1 ? 's' : ''} selected
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleMarkSelectedAsRead}
                                            className="text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
                                        >
                                            Mark as read
                                        </button>
                                        <button
                                            onClick={() => setSelectedNotifications([])}
                                            className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Filter Bar */}
                <div className="md:hidden bg-white/90 backdrop-blur-xl border-b border-gray-200/60 sticky top-[50px] sm:top-[59px] z-[5]">
                    <div className="px-4 py-2.5">
                        <div className="flex items-center justify-between mb-2">
                            {/* Mobile Filter Tabs */}
                            <div className="flex bg-gray-100/80 backdrop-blur-xl rounded-xl p-1 flex-1 max-w-xs">
                                <button
                                    onClick={() => setFilter('unread')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                        filter === 'unread' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                                    }`}
                                >
                                    Unread ({unreadCount})
                                </button>
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                        filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                                    }`}
                                >
                                    All
                                </button>
                            </div>

                            {/* Mobile Mark All Read Button */}
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="ml-3 p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 rounded-xl transition-all duration-200"
                                >
                                    <CheckIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Mobile Bulk Actions */}
                        {selectedNotifications.length > 0 && (
                            <div className="p-3 bg-blue-50/80 backdrop-blur-xl rounded-xl border border-blue-200/50">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-blue-900">
                                        {selectedNotifications.length} selected
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleMarkSelectedAsRead}
                                            className="text-sm font-medium text-blue-700"
                                        >
                                            Mark read
                                        </button>
                                        <button
                                            onClick={() => setSelectedNotifications([])}
                                            className="text-sm font-medium text-gray-600"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notification Types Help Section - Apple style collapsible */}
                {/* iPad-like centered layout container */}
                <div className="mx-auto max-w-4xl px-3 md:px-6">
                    <div className="my-3 md:my-6">
                        <details className="group bg-white/60 backdrop-blur-xl rounded-2xl border border-gray-200/60 overflow-hidden transition-all duration-300">
                            <summary className="flex items-center justify-between px-4 md:px-6 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                        <InformationCircleIcon className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">Notification Types</h3>
                                        <p className="text-xs text-gray-600">
                                            Learn about different notification categories
                                        </p>
                                    </div>
                                </div>
                                <ChevronDownIcon className="w-5 h-5 text-gray-400 transition-transform duration-200 group-open:rotate-180" />
                            </summary>

                            <div className="px-4 md:px-6 pb-4 border-t border-gray-200/60 bg-gray-50/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                    <div className="space-y-3">
                                        <div className="bg-white/80 rounded-xl p-4 border border-gray-200/40">
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                                                        Assignment Updates
                                                    </h4>
                                                    <p className="text-xs text-gray-600 leading-relaxed">
                                                        Get notified when drivers start, complete, or update
                                                        assignments, ensuring you stay informed about delivery progress.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/80 rounded-xl p-4 border border-gray-200/40">
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                                                        Route Activities
                                                    </h4>
                                                    <p className="text-xs text-gray-600 leading-relaxed">
                                                        Track route leg completions and updates to monitor real-time
                                                        delivery progress and logistics coordination.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="bg-white/80 rounded-xl p-4 border border-gray-200/40">
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                                                        Document & Business
                                                    </h4>
                                                    <p className="text-xs text-gray-600 leading-relaxed">
                                                        Stay updated on document uploads, invoice generation, payments,
                                                        and other important business activities.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/80 rounded-xl p-4 border border-gray-200/40">
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                                                        System & Security
                                                    </h4>
                                                    <p className="text-xs text-gray-600 leading-relaxed">
                                                        Receive important alerts about system maintenance, security
                                                        updates, and platform announcements.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-blue-50/60 rounded-xl border border-blue-200/40">
                                    <p className="text-xs text-blue-800 leading-relaxed">
                                        <strong>Priority Levels:</strong> Urgent (immediate attention), High (important
                                        updates), Medium (general updates), Low (informational). All notifications
                                        include detailed descriptions to help you understand the context and required
                                        actions.
                                    </p>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {loading ? (
                        <NotificationsSkeleton />
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 px-6">
                            <div className="w-20 h-20 bg-gray-100/80 backdrop-blur-xl rounded-3xl flex items-center justify-center mb-6">
                                <BellIcon className="w-10 h-10 text-gray-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                            </h2>
                            <p className="text-sm text-center max-w-md text-gray-600 leading-relaxed">
                                {filter === 'unread'
                                    ? 'You have no unread notifications. Great job staying on top of things!'
                                    : "When you receive notifications, they will appear here. We'll keep you updated on important activities."}
                            </p>
                        </div>
                    ) : (
                        <div className="mx-auto max-w-4xl px-3 md:px-6">
                            <div className="my-3 md:my-6">
                                {/* Clean Desktop Select All - seamless header */}
                                <div className="hidden md:block px-6 py-4">
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedNotifications.length === notifications.length &&
                                                notifications.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span
                                            className="text-sm font-medium text-gray-700"
                                            style={{
                                                fontFamily:
                                                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                            }}
                                        >
                                            Select all {notifications.length} notifications on this page
                                        </span>
                                        <span
                                            className="text-xs text-gray-500"
                                            style={{
                                                fontFamily:
                                                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                            }}
                                        >
                                            (Showing {offset + 1}-{Math.min(offset + notifications.length, totalCount)}{' '}
                                            of {totalCount})
                                        </span>
                                    </label>
                                </div>

                                {/* Clean Mobile Select All - seamless header */}
                                <div className="md:hidden px-4 py-3">
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedNotifications.length === notifications.length &&
                                                notifications.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span
                                            className="text-sm font-medium text-gray-700"
                                            style={{
                                                fontFamily:
                                                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                            }}
                                        >
                                            Select all on page
                                        </span>
                                        <span
                                            className="text-xs text-gray-500 ml-auto"
                                            style={{
                                                fontFamily:
                                                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                            }}
                                        >
                                            {offset + 1}-{Math.min(offset + notifications.length, totalCount)} of{' '}
                                            {totalCount}
                                        </span>
                                    </label>
                                </div>

                                {/* Modern notification cards with compact elegant design */}
                                <div className="space-y-2 px-4 md:px-6 py-3">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`relative group cursor-pointer rounded-2xl overflow-hidden apple-card-hover
                                            ${
                                                animatingOut.includes(notification.id)
                                                    ? 'animate-fade-out-slide'
                                                    : 'transition-all duration-300 ease-out'
                                            }
                                            ${!notification.isRead ? 'bg-white/90' : 'bg-white/70'}`}
                                            onClick={() => handleNotificationClick(notification)}
                                            style={{
                                                border: '1px solid rgba(229, 231, 235, 0.3)',
                                                boxShadow: !notification.isRead
                                                    ? '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)'
                                                    : '0 1px 3px rgba(0, 0, 0, 0.03)',
                                                backdropFilter: 'blur(8px) saturate(120%)',
                                                WebkitBackdropFilter: 'blur(8px) saturate(120%)',
                                            }}
                                        >
                                            {/* Unread indicator stripe */}
                                            {!notification.isRead && (
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-l-2xl"
                                                    style={{
                                                        boxShadow: '0 0 6px rgba(59, 130, 246, 0.4)',
                                                    }}
                                                />
                                            )}

                                            {/* Content area */}
                                            <div className="flex items-start gap-3 p-3 md:p-4">
                                                {/* Modern checkbox */}
                                                <div className="flex items-center pt-0.5">
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedNotifications.includes(notification.id)}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                handleSelectNotification(notification.id);
                                                            }}
                                                            className="h-3.5 w-3.5 text-blue-600 focus:ring-2 focus:ring-blue-500/40 border-gray-300/60 rounded shadow-sm transition-all duration-200 hover:border-blue-400"
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                backdropFilter: 'blur(4px)',
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Notification content */}
                                                <div className="flex-1 min-w-0">
                                                    {/* Header with title and status */}
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1 min-w-0 pr-3">
                                                            <h3
                                                                className={`text-sm md:text-base font-semibold leading-tight ${
                                                                    !notification.isRead
                                                                        ? 'text-gray-900'
                                                                        : 'text-gray-700'
                                                                }`}
                                                                style={{
                                                                    letterSpacing: '-0.025em',
                                                                    fontFamily:
                                                                        '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                                                                }}
                                                            >
                                                                {notification.title}
                                                            </h3>
                                                        </div>

                                                        {/* Status and timestamp */}
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span
                                                                className="text-xs font-medium text-gray-500/80"
                                                                style={{
                                                                    fontFamily:
                                                                        '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                                                }}
                                                            >
                                                                {getTimeAgo(notification.createdAt)}
                                                            </span>
                                                            {!notification.isRead ? (
                                                                <div
                                                                    className="w-2 h-2 bg-blue-500 rounded-full shadow-sm"
                                                                    style={{
                                                                        boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)',
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="text-xs text-green-600/80 flex items-center gap-1 bg-green-50/50 px-1.5 py-0.5 rounded-full">
                                                                    <EyeIcon className="w-2.5 h-2.5" />
                                                                    <span className="font-medium">Read</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Message content */}
                                                    <div
                                                        className="text-xs md:text-sm text-gray-600/90 mb-2 leading-relaxed line-clamp-2"
                                                        style={{
                                                            fontFamily:
                                                                '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                                            lineHeight: '1.4',
                                                        }}
                                                    >
                                                        {notification.message}
                                                    </div>

                                                    {/* Modern badges with refined compact design */}
                                                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                                        <span
                                                            className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-gray-50/80 text-gray-700 rounded-full font-medium border border-gray-200/50 backdrop-blur-sm"
                                                            style={{
                                                                fontFamily:
                                                                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                                            }}
                                                        >
                                                            <div className="w-1 h-1 rounded-full bg-gray-500/70"></div>
                                                            {getNotificationTypeDisplayName(notification.type)}
                                                        </span>

                                                        {notification.priority !== 'LOW' && (
                                                            <span
                                                                className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium border backdrop-blur-sm ${
                                                                    notification.priority === 'URGENT'
                                                                        ? 'bg-red-50/80 text-red-700 border-red-200/50'
                                                                        : notification.priority === 'HIGH'
                                                                        ? 'bg-orange-50/80 text-orange-700 border-orange-200/50'
                                                                        : 'bg-yellow-50/80 text-yellow-700 border-yellow-200/50'
                                                                }`}
                                                                style={{
                                                                    fontFamily:
                                                                        '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                                                }}
                                                            >
                                                                <div
                                                                    className={`w-1 h-1 rounded-full ${
                                                                        notification.priority === 'URGENT'
                                                                            ? 'bg-red-500/70'
                                                                            : notification.priority === 'HIGH'
                                                                            ? 'bg-orange-500/70'
                                                                            : 'bg-yellow-500/70'
                                                                    }`}
                                                                ></div>
                                                                {notification.priority}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Type description with improved styling */}
                                                    <div
                                                        className="text-xs text-gray-500/70 leading-relaxed font-medium line-clamp-1"
                                                        style={{
                                                            fontFamily:
                                                                '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                                            lineHeight: '1.3',
                                                        }}
                                                    >
                                                        {getNotificationTypeDescription(notification.type)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination - seamless footer */}
                                <div className="px-4 md:px-6 py-3 md:py-4">
                                    {/* Desktop Pagination */}
                                    <div className="hidden md:flex items-center justify-between">
                                        <div className="text-sm text-gray-700 font-medium">
                                            Showing {offset + 1} to{' '}
                                            {Math.min(offset + notifications.length, totalCount)} of {totalCount}{' '}
                                            notifications
                                        </div>

                                        {totalPages > 1 && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handlePageChange(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    className="p-2 rounded-xl bg-white/60 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
                                                    style={{
                                                        background: `
                                                        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%),
                                                        linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)
                                                    `,
                                                        backdropFilter: 'blur(12px) saturate(150%)',
                                                        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                                                        boxShadow: `
                                                        0 4px 8px rgba(67, 56, 202, 0.04),
                                                        inset 0 1px 2px rgba(255, 255, 255, 0.6),
                                                        0 0 0 1px rgba(255, 255, 255, 0.3)
                                                    `,
                                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                                    }}
                                                >
                                                    <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
                                                </button>

                                                <div className="flex items-center gap-1">
                                                    {[...Array(Math.min(totalPages, 7))].map((_, index) => {
                                                        let pageNumber;
                                                        if (totalPages <= 7) {
                                                            pageNumber = index + 1;
                                                        } else if (currentPage <= 4) {
                                                            pageNumber = index + 1;
                                                        } else if (currentPage >= totalPages - 3) {
                                                            pageNumber = totalPages - 6 + index;
                                                        } else {
                                                            pageNumber = currentPage - 3 + index;
                                                        }

                                                        return (
                                                            <button
                                                                key={pageNumber}
                                                                onClick={() => handlePageChange(pageNumber)}
                                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${
                                                                    currentPage === pageNumber
                                                                        ? 'text-white shadow-sm'
                                                                        : 'text-gray-700'
                                                                }`}
                                                                style={
                                                                    currentPage === pageNumber
                                                                        ? {
                                                                              background: `
                                                                    linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(139, 92, 246, 0.7) 100%),
                                                                    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 70%)
                                                                `,
                                                                              boxShadow: `
                                                                    0 4px 12px rgba(59, 130, 246, 0.3),
                                                                    0 2px 6px rgba(99, 102, 241, 0.2),
                                                                    inset 0 1px 2px rgba(255, 255, 255, 0.4)
                                                                `,
                                                                              border: '1px solid rgba(255, 255, 255, 0.3)',
                                                                          }
                                                                        : {
                                                                              background: `
                                                                    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%),
                                                                    linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)
                                                                `,
                                                                              backdropFilter:
                                                                                  'blur(12px) saturate(150%)',
                                                                              WebkitBackdropFilter:
                                                                                  'blur(12px) saturate(150%)',
                                                                              boxShadow: `
                                                                    0 2px 4px rgba(67, 56, 202, 0.04),
                                                                    inset 0 1px 2px rgba(255, 255, 255, 0.6),
                                                                    0 0 0 1px rgba(255, 255, 255, 0.3)
                                                                `,
                                                                              border: '1px solid rgba(255, 255, 255, 0.4)',
                                                                          }
                                                                }
                                                            >
                                                                {pageNumber}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <button
                                                    onClick={() => handlePageChange(currentPage + 1)}
                                                    disabled={currentPage === totalPages}
                                                    className="p-2 rounded-xl bg-white/60 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
                                                    style={{
                                                        background: `
                                                        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%),
                                                        linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)
                                                    `,
                                                        backdropFilter: 'blur(12px) saturate(150%)',
                                                        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                                                        boxShadow: `
                                                        0 4px 8px rgba(67, 56, 202, 0.04),
                                                        inset 0 1px 2px rgba(255, 255, 255, 0.6),
                                                        0 0 0 1px rgba(255, 255, 255, 0.3)
                                                    `,
                                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                                    }}
                                                >
                                                    <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile Pagination */}
                                    <div className="md:hidden">
                                        <div className="text-xs text-gray-600 text-center mb-3">
                                            Page {currentPage} of {Math.max(totalPages, 1)} ({totalCount} total)
                                        </div>

                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => handlePageChange(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm font-medium"
                                                    style={{
                                                        background: `
                                                        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%),
                                                        linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)
                                                    `,
                                                        backdropFilter: 'blur(12px) saturate(150%)',
                                                        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                                                        boxShadow: `
                                                        0 4px 8px rgba(67, 56, 202, 0.04),
                                                        inset 0 1px 2px rgba(255, 255, 255, 0.6),
                                                        0 0 0 1px rgba(255, 255, 255, 0.3)
                                                    `,
                                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                                    }}
                                                >
                                                    <ChevronLeftIcon className="w-4 h-4" />
                                                    Previous
                                                </button>

                                                <div
                                                    className="px-3 py-2 rounded-xl text-sm font-medium min-w-[2.5rem] text-center text-white"
                                                    style={{
                                                        background: `
                                                        linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(139, 92, 246, 0.7) 100%),
                                                        radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 70%)
                                                    `,
                                                        boxShadow: `
                                                        0 4px 12px rgba(59, 130, 246, 0.3),
                                                        0 2px 6px rgba(99, 102, 241, 0.2),
                                                        inset 0 1px 2px rgba(255, 255, 255, 0.4)
                                                    `,
                                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                                    }}
                                                >
                                                    {currentPage}
                                                </div>

                                                <button
                                                    onClick={() => handlePageChange(currentPage + 1)}
                                                    disabled={currentPage === totalPages}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm font-medium"
                                                    style={{
                                                        background: `
                                                        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%),
                                                        linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)
                                                    `,
                                                        backdropFilter: 'blur(12px) saturate(150%)',
                                                        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                                                        boxShadow: `
                                                        0 4px 8px rgba(67, 56, 202, 0.04),
                                                        inset 0 1px 2px rgba(255, 255, 255, 0.6),
                                                        0 0 0 1px rgba(255, 255, 255, 0.3)
                                                    `,
                                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                                    }}
                                                >
                                                    Next
                                                    <ChevronRightIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

// Add authentication requirement
(NotificationsPage as any).authenticationEnabled = true;

export default NotificationsPage;
