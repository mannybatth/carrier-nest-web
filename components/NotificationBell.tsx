import React, { Fragment, useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { useGlobalNotifications } from '../contexts/GlobalNotificationContext';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface NotificationBellProps {
    collapsed?: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ collapsed = false }) => {
    const { notifications, unreadCount, connected, markAsRead, markAllAsRead } = useGlobalNotifications();
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);

    // Mobile detection
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);

        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const handleBellClick = () => {
        if (isMobile) {
            // On mobile, navigate to notifications page
            router.push('/notifications');
        }
        // On desktop, Menu component handles the popup automatically
    };

    const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
        if (!isRead) {
            await markAsRead([notificationId]);
        }
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
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

    // Filter to only show unread notifications
    const unreadNotifications = notifications.filter((notification) => !notification.isRead).slice(0, 5);
    const BellIconComponent = unreadCount > 0 ? BellSolidIcon : BellIcon;

    return (
        <Menu as="div" className="relative" key="notification-bell-menu">
            {/* Enhanced Apple-style Bell Button with Liquid Glass Design */}
            <div className="relative">
                {isMobile ? (
                    // Mobile: Regular button that navigates to notifications page
                    <button
                        onClick={handleBellClick}
                        className={`relative flex items-center justify-center transition-all duration-300 ease-out group ${
                            collapsed
                                ? 'w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 hover:from-blue-600 hover:via-blue-700 hover:to-purple-800 shadow-2xl shadow-blue-500/40 border border-blue-400/30 ring-1 ring-white/20'
                                : 'w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 hover:from-blue-600 hover:via-blue-700 hover:to-purple-800 shadow-xl shadow-blue-500/30 border border-blue-400/30 ring-1 ring-white/20'
                        } backdrop-blur-sm hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2 focus:ring-offset-transparent`}
                        data-tooltip-id="tooltip"
                        data-tooltip-content={`${unreadCount} unread notifications`}
                        data-tooltip-place={collapsed ? 'right' : 'top'}
                    >
                        <BellIconComponent
                            className={`${
                                collapsed ? 'w-6 h-6' : 'w-5 h-5'
                            } transition-all duration-200 text-white drop-shadow-lg group-hover:drop-shadow-xl`}
                        />

                        {/* Enhanced Unread Count Badge */}
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg shadow-red-500/30 ring-2 ring-white/50 animate-pulse">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}

                        {/* Enhanced Connection Status Indicator */}
                        <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-lg ${
                                connected ? 'bg-green-500 shadow-green-500/30' : 'bg-orange-500 shadow-orange-500/30'
                            }`}
                            title={connected ? 'Real-time connected' : 'Polling mode'}
                        />
                    </button>
                ) : (
                    // Desktop: Menu button that shows popup
                    <Menu.Button
                        className={`relative flex items-center justify-center transition-all duration-300 ease-out group ${
                            collapsed
                                ? 'w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 hover:from-blue-600 hover:via-blue-700 hover:to-purple-800 shadow-2xl shadow-blue-500/40 border border-blue-400/30 ring-1 ring-white/20'
                                : 'w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 hover:from-blue-600 hover:via-blue-700 hover:to-purple-800 shadow-xl shadow-blue-500/30 border border-blue-400/30 ring-1 ring-white/20'
                        } backdrop-blur-sm hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2 focus:ring-offset-transparent`}
                        data-tooltip-id="tooltip"
                        data-tooltip-content={`${unreadCount} unread notifications`}
                        data-tooltip-place={collapsed ? 'right' : 'top'}
                    >
                        <BellIconComponent
                            className={`${
                                collapsed ? 'w-6 h-6' : 'w-5 h-5'
                            } transition-all duration-200 text-white drop-shadow-lg group-hover:drop-shadow-xl`}
                        />

                        {/* Enhanced Unread Count Badge */}
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg shadow-red-500/30 ring-2 ring-white/50 animate-pulse">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}

                        {/* Enhanced Connection Status Indicator */}
                        <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-lg ${
                                connected ? 'bg-green-500 shadow-green-500/30' : 'bg-orange-500 shadow-orange-500/30'
                            }`}
                            title={connected ? 'Real-time connected' : 'Polling mode'}
                        />
                    </Menu.Button>
                )}

                {/* Subtle Glow Effect */}
                <div
                    className={`absolute inset-0 ${
                        collapsed ? 'w-12 h-12 rounded-2xl' : 'w-10 h-10 rounded-xl'
                    } bg-gradient-to-br from-blue-400/20 to-purple-600/20 blur-xl -z-10`}
                ></div>
            </div>

            {/* Ultra-Modern Apple-style Notification Popup - Only show on desktop */}
            {!isMobile && (
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-300"
                    enterFrom="transform opacity-0 scale-90 translate-y-4"
                    enterTo="transform opacity-100 scale-100 translate-y-0"
                    leave="transition ease-in duration-200"
                    leaveFrom="transform opacity-100 scale-100 translate-y-0"
                    leaveTo="transform opacity-0 scale-90 translate-y-4"
                >
                    <Menu.Items
                        className={`absolute z-[9999] w-[22rem] ${
                            collapsed
                                ? 'bottom-full left-0 mb-4 origin-bottom-left'
                                : 'bottom-full left-0 mb-4 origin-bottom'
                        } bg-white/98 backdrop-blur-3xl rounded-[2rem] shadow-2xl shadow-black/20 border border-white/60 ring-1 ring-gray-100/50 overflow-hidden focus:outline-none`}
                        style={{
                            backgroundImage:
                                'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%)',
                        }}
                    >
                        {/* Ultra-Premium Glass Header */}
                        <div className="relative px-6 py-5 border-b border-gray-100/60">
                            {/* Advanced gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-blue-50/30 to-purple-50/20" />

                            {/* Decorative background pattern */}
                            <div className="absolute inset-0 opacity-[0.02]">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600" />
                            </div>

                            {/* Content */}
                            <div className="relative">
                                {/* Header row */}
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500/15 to-purple-600/15 backdrop-blur-xl rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-blue-200/20 border border-white/40">
                                            <BellIconComponent className="w-5 h-5 text-blue-600 drop-shadow-sm" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 tracking-tight leading-tight">
                                                Notifications
                                            </h3>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                                Updates and alerts
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Settings Gear Button */}
                                        <Link href="/settings/notifications">
                                            <button className="w-8 h-8 bg-gray-50/80 hover:bg-gray-100/80 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center shadow-sm ring-1 ring-gray-200/25 border border-white/60 backdrop-blur-sm group">
                                                <Cog6ToothIcon className="w-4 h-4 text-gray-600 group-hover:text-gray-700 transition-colors duration-200" />
                                            </button>
                                        </Link>
                                        {/* Mark All Read Button */}
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={handleMarkAllAsRead}
                                                className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0 shadow-sm ring-1 ring-blue-200/25 border border-white/60 backdrop-blur-sm"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Status indicator row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`w-2.5 h-2.5 rounded-full shadow-lg ${
                                                connected
                                                    ? 'bg-green-500 shadow-green-500/40 ring-2 ring-green-100'
                                                    : 'bg-orange-500 shadow-orange-500/40 ring-2 ring-orange-100'
                                            }`}
                                        />
                                        <span className="text-xs text-gray-600 font-medium">
                                            {connected ? 'Live updates active' : 'Refreshing notifications'}
                                        </span>
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-100/70 text-blue-800 shadow-sm ring-1 ring-blue-200/30 border border-white/50">
                                            {unreadCount} new
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Ultra-Modern Notifications List */}
                        <div className="max-h-[24rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200/60 scrollbar-track-transparent">
                            {unreadNotifications.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="relative w-20 h-20 mx-auto mb-6">
                                        {/* Decorative background rings */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-gray-100/80 to-gray-200/40 rounded-full blur-sm" />
                                        <div className="relative w-20 h-20 bg-gradient-to-br from-gray-50/90 to-gray-100/70 backdrop-blur-xl rounded-full flex items-center justify-center shadow-xl shadow-gray-200/60 ring-1 ring-gray-200/40 border border-white/60">
                                            <BellIcon className="w-9 h-9 text-gray-400 drop-shadow-sm" />
                                        </div>
                                    </div>
                                    <h4 className="text-base font-semibold text-gray-900 mb-2">All caught up!</h4>
                                    <p className="text-sm text-gray-600 leading-relaxed max-w-56 mx-auto">
                                        You don&apos;t have any unread notifications. We&apos;ll notify you when
                                        something new happens.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 space-y-3">
                                    {unreadNotifications.map((notification, index) => (
                                        <Menu.Item key={`notification-${notification.id}-${index}`}>
                                            {({ active }) => (
                                                <div
                                                    className={`relative group rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden ${
                                                        active
                                                            ? 'bg-gray-50/80 scale-[0.98] shadow-lg shadow-gray-200/40 ring-1 ring-gray-200/30'
                                                            : 'hover:bg-gray-50/50 hover:shadow-md hover:shadow-gray-200/30'
                                                    } bg-gradient-to-br from-blue-50/70 to-indigo-50/50 ring-1 ring-blue-200/30 shadow-sm shadow-blue-200/20 border border-blue-100/40`}
                                                    onClick={() =>
                                                        handleNotificationClick(notification.id, notification.isRead)
                                                    }
                                                >
                                                    {/* Enhanced gradient overlay for unread notifications */}
                                                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-blue-50/40 via-transparent to-indigo-50/30" />

                                                    <div className="relative p-4">
                                                        <div className="flex items-start gap-4">
                                                            {/* Priority indicator */}
                                                            <div
                                                                className={`flex-shrink-0 w-1 h-full absolute left-0 top-0 bottom-0 rounded-r-full ${
                                                                    notification.priority === 'URGENT'
                                                                        ? 'bg-gradient-to-b from-red-400 to-red-600'
                                                                        : notification.priority === 'HIGH'
                                                                        ? 'bg-gradient-to-b from-amber-400 to-amber-600'
                                                                        : notification.priority === 'MEDIUM'
                                                                        ? 'bg-gradient-to-b from-blue-400 to-blue-600'
                                                                        : 'bg-gradient-to-b from-green-400 to-green-600'
                                                                }`}
                                                            />

                                                            <div className="flex-1 min-w-0 pl-3">
                                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                                    <h4 className="text-sm text-gray-900 leading-5 flex-1 tracking-tight font-semibold">
                                                                        {notification.title}
                                                                    </h4>
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                                                                            {getTimeAgo(notification.createdAt)}
                                                                        </span>
                                                                        {/* Unread indicator dot */}
                                                                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm shadow-blue-500/40 ring-1 ring-blue-200" />
                                                                    </div>
                                                                </div>

                                                                <p className="text-sm text-gray-700 leading-5 mb-3 line-clamp-2">
                                                                    {notification.message}
                                                                </p>

                                                                <div className="flex items-center justify-between">
                                                                    <span
                                                                        className={`text-xs px-3 py-1.5 rounded-xl font-medium shadow-sm border ${
                                                                            notification.priority === 'URGENT'
                                                                                ? 'bg-red-50/80 text-red-700 ring-1 ring-red-200/40 border-red-100/50'
                                                                                : notification.priority === 'HIGH'
                                                                                ? 'bg-amber-50/80 text-amber-700 ring-1 ring-amber-200/40 border-amber-100/50'
                                                                                : notification.priority === 'MEDIUM'
                                                                                ? 'bg-yellow-50/80 text-yellow-700 ring-1 ring-yellow-200/40 border-yellow-100/50'
                                                                                : 'bg-gray-50/80 text-gray-700 ring-1 ring-gray-200/40 border-gray-100/50'
                                                                        }`}
                                                                    >
                                                                        {notification.type
                                                                            .replace('_', ' ')
                                                                            .toLowerCase()}
                                                                    </span>

                                                                    {/* Apple-style Mark as Read Button */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleNotificationClick(
                                                                                notification.id,
                                                                                notification.isRead,
                                                                            );
                                                                        }}
                                                                        className="group/btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100/80 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm ring-1 ring-blue-200/30 border border-white/60 backdrop-blur-sm"
                                                                        title="Mark as read"
                                                                    >
                                                                        <svg
                                                                            className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-110"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            viewBox="0 0 24 24"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2.5}
                                                                                d="M5 13l4 4L19 7"
                                                                            />
                                                                        </svg>
                                                                        <span className="hidden sm:inline">Read</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Menu.Item>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Ultra-Premium Footer - Always show */}
                        <div className="relative px-4 py-3 border-t border-gray-100/60">
                            {/* Advanced gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-50/70 via-white/50 to-blue-50/30" />

                            <div className="relative">
                                <Link
                                    href="/notifications"
                                    className="group flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 hover:from-blue-100/70 hover:to-indigo-100/70 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm ring-1 ring-blue-200/25 border border-white/60 backdrop-blur-sm"
                                >
                                    <span>View All</span>
                                    {unreadCount > unreadNotifications.length && (
                                        <span className="px-2 py-1 text-xs bg-gradient-to-r from-blue-100/80 to-indigo-100/80 text-blue-700 rounded-lg font-semibold shadow-sm ring-1 ring-blue-200/30 border border-white/50">
                                            +{unreadCount - unreadNotifications.length}
                                        </span>
                                    )}
                                    <svg
                                        className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2.5}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </Menu.Items>
                </Transition>
            )}
        </Menu>
    );
};

export default NotificationBell;
