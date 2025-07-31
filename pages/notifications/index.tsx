import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useGlobalNotifications } from '../../contexts/GlobalNotificationContext';
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
    const { notifications, unreadCount, connected, loading, markAsRead, markAllAsRead, refreshNotifications } =
        useGlobalNotifications();

    const [filter, setFilter] = useState<'all' | 'unread'>('unread');
    const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    const filteredNotifications = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

    // Pagination calculations
    const totalPages = Math.ceil(filteredNotifications.length / NOTIFICATIONS_PER_PAGE);
    const startIndex = (currentPage - 1) * NOTIFICATIONS_PER_PAGE;
    const endIndex = startIndex + NOTIFICATIONS_PER_PAGE;
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

    const handleSelectNotification = (id: string) => {
        setSelectedNotifications((prev) => (prev.includes(id) ? prev.filter((nId) => nId !== id) : [...prev, id]));
    };

    const handleSelectAll = () => {
        if (selectedNotifications.length === paginatedNotifications.length) {
            setSelectedNotifications([]);
        } else {
            setSelectedNotifications(paginatedNotifications.map((n) => n.id));
        }
    };

    const handleMarkSelectedAsRead = async () => {
        if (selectedNotifications.length > 0) {
            await markAsRead(selectedNotifications);
            setSelectedNotifications([]);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        setSelectedNotifications([]); // Clear selections when changing pages
    };

    const handleNotificationClick = async (notification: any) => {
        if (!notification.isRead) {
            await markAsRead([notification.id]);
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
        refreshNotifications();
        setCurrentPage(1); // Reset to first page when notifications refresh
    }, [filter]);

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
                {/* Apple-style Header - Hidden on mobile */}
                <div className="hidden md:block bg-white/80 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-10">
                    <div className="px-6 py-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                                        <BellSolidIcon className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                            Notifications
                                        </h1>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Real-time updates about assignments, routes, and system activities
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Apple-style Filter Tabs */}
                                <div className="flex bg-gray-100/80 backdrop-blur-xl rounded-xl p-1">
                                    <button
                                        onClick={() => setFilter('unread')}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                            filter === 'unread'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                        }`}
                                    >
                                        Unread ({unreadCount})
                                    </button>
                                    <button
                                        onClick={() => setFilter('all')}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                            filter === 'all'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                        }`}
                                    >
                                        All ({notifications.length})
                                    </button>
                                </div>

                                {/* Mark All Read Button */}
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
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
                                    All ({notifications.length})
                                </button>
                            </div>

                            {/* Mobile Mark All Read Button */}
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
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
                <div className="mx-3  my-3  md:mx-6 ">
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
                                                    Get notified when drivers start, complete, or update assignments,
                                                    ensuring you stay informed about delivery progress.
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
                                                    Stay updated on document uploads, invoice generation, payments, and
                                                    other important business activities.
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
                                                    Receive important alerts about system maintenance, security updates,
                                                    and platform announcements.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-blue-50/60 rounded-xl border border-blue-200/40">
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    <strong>Priority Levels:</strong> Urgent (immediate attention), High (important
                                    updates), Medium (general updates), Low (informational). All notifications include
                                    detailed descriptions to help you understand the context and required actions.
                                </p>
                            </div>
                        </div>
                    </details>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {loading ? (
                        <NotificationsSkeleton />
                    ) : filteredNotifications.length === 0 ? (
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
                        <div className="bg-white/80 backdrop-blur-xl mx-3 md:mx-6 my-3 md:my-6 rounded-2xl border border-gray-200/60 overflow-hidden">
                            {/* Select All Header - Desktop only */}
                            <div className="hidden md:block px-6 py-4 border-b border-gray-200/60 bg-gray-50/50">
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={
                                            selectedNotifications.length === paginatedNotifications.length &&
                                            paginatedNotifications.length > 0
                                        }
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Select all {paginatedNotifications.length} notifications on this page
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        (Showing {startIndex + 1}-{Math.min(endIndex, filteredNotifications.length)} of{' '}
                                        {filteredNotifications.length})
                                    </span>
                                </label>
                            </div>

                            {/* Mobile Select All - Collapsible */}
                            <div className="md:hidden px-4 py-3 border-b border-gray-200/60 bg-gray-50/50">
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={
                                            selectedNotifications.length === paginatedNotifications.length &&
                                            paginatedNotifications.length > 0
                                        }
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Select all on page</span>
                                    <span className="text-xs text-gray-500 ml-auto">
                                        {startIndex + 1}-{Math.min(endIndex, filteredNotifications.length)} of{' '}
                                        {filteredNotifications.length}
                                    </span>
                                </label>
                            </div>

                            {/* Notifications List */}
                            <div className="divide-y divide-gray-200/60">
                                {paginatedNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`flex items-start px-4 md:px-6 py-4 md:py-5 hover:bg-gray-50/50 transition-all duration-200 active:bg-gray-100/50 ${
                                            !notification.isRead ? 'bg-blue-50/30 border-l-4 border-l-blue-500' : ''
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <div className="flex items-center mr-3 md:mr-4 pt-1">
                                            <input
                                                type="checkbox"
                                                checked={selectedNotifications.includes(notification.id)}
                                                onChange={() => handleSelectNotification(notification.id)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h3
                                                    className={`text-sm md:text-sm font-medium text-gray-900 leading-5 pr-2 ${
                                                        !notification.isRead ? 'font-semibold' : ''
                                                    }`}
                                                >
                                                    {notification.title}
                                                </h3>
                                                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                                                    <span className="text-xs text-gray-500 font-medium">
                                                        {getTimeAgo(notification.createdAt)}
                                                    </span>
                                                    {!notification.isRead && (
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                                                {notification.message}
                                            </p>

                                            {/* Mobile-optimized badges with better descriptions */}
                                            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                                                <span
                                                    className={`text-xs px-2 md:px-3 py-1 rounded-full font-medium ${
                                                        notification.priority === 'URGENT'
                                                            ? 'bg-red-100 text-red-700'
                                                            : notification.priority === 'HIGH'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : notification.priority === 'MEDIUM'
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                    }`}
                                                >
                                                    {getNotificationTypeDisplayName(notification.type)}
                                                </span>

                                                {notification.priority !== 'LOW' && (
                                                    <span
                                                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                                                            notification.priority === 'URGENT'
                                                                ? 'bg-red-50 text-red-600'
                                                                : notification.priority === 'HIGH'
                                                                ? 'bg-amber-50 text-amber-600'
                                                                : 'bg-yellow-50 text-yellow-600'
                                                        }`}
                                                    >
                                                        {notification.priority}
                                                    </span>
                                                )}

                                                {notification.isRead && (
                                                    <span className="text-xs text-green-700 flex items-center gap-1 font-medium">
                                                        <EyeIcon className="w-3 h-3" />
                                                        Read
                                                    </span>
                                                )}
                                            </div>

                                            {/* Notification type description - Apple style subtle notes */}
                                            <div className="mt-2 text-xs text-gray-500 leading-relaxed">
                                                {getNotificationTypeDescription(notification.type)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Mobile-optimized Pagination */}
                            {totalPages > 1 && (
                                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200/60 bg-gray-50/50">
                                    {/* Desktop Pagination */}
                                    <div className="hidden md:flex items-center justify-between">
                                        <div className="text-sm text-gray-700 font-medium">
                                            Showing {startIndex + 1} to{' '}
                                            {Math.min(endIndex, filteredNotifications.length)} of{' '}
                                            {filteredNotifications.length} notifications
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="p-2 rounded-xl bg-white/60 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
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
                                                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                                                                currentPage === pageNumber
                                                                    ? 'bg-blue-500 text-white shadow-sm'
                                                                    : 'bg-white/60 hover:bg-white text-gray-700'
                                                            }`}
                                                        >
                                                            {pageNumber}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="p-2 rounded-xl bg-white/60 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                                            >
                                                <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mobile Pagination */}
                                    <div className="md:hidden">
                                        <div className="text-xs text-gray-600 text-center mb-3">
                                            Page {currentPage} of {totalPages} ({filteredNotifications.length} total)
                                        </div>

                                        <div className="flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                                            >
                                                <ChevronLeftIcon className="w-4 h-4" />
                                                Previous
                                            </button>

                                            <div className="px-3 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium min-w-[2.5rem] text-center">
                                                {currentPage}
                                            </div>

                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                                            >
                                                Next
                                                <ChevronRightIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
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
