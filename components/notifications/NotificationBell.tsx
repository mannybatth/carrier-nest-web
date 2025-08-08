import React, { Fragment, useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { useGlobalNotifications } from '../../contexts/GlobalNotificationContext';
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
                                ? 'w-12 h-12 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 shadow-sm shadow-slate-900/5 border border-slate-200/50'
                                : 'w-10 h-10 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 shadow-sm shadow-slate-900/5 border border-slate-200/50'
                        } backdrop-blur-sm hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-slate-300/50 focus:ring-offset-1 focus:ring-offset-transparent`}
                        data-tooltip-id="tooltip"
                        data-tooltip-content={`${unreadCount} unread notifications`}
                        data-tooltip-place={collapsed ? 'right' : 'top'}
                    >
                        <BellIconComponent
                            className={`${
                                collapsed ? 'w-6 h-6' : 'w-5 h-5'
                            } transition-all duration-200 text-slate-600 group-hover:text-slate-700`}
                        />

                        {/* Subtle Unread Count Badge */}
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[1.125rem] h-4 px-1 text-xs font-medium text-white bg-blue-500 rounded-full shadow-sm ring-1 ring-white/60">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}

                        {/* Subtle Connection Status Indicator */}
                        <div
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${
                                connected ? 'bg-green-500' : 'bg-orange-500'
                            }`}
                            title={connected ? 'Real-time connected' : 'Polling mode'}
                        />
                    </button>
                ) : (
                    // Desktop: Menu button that shows popup
                    <Menu.Button
                        className={`relative flex items-center justify-center transition-all duration-300 ease-out group ${
                            collapsed
                                ? 'w-12 h-12 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 shadow-sm shadow-slate-900/5 border border-slate-200/50'
                                : 'w-10 h-10 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 shadow-sm shadow-slate-900/5 border border-slate-200/50'
                        } backdrop-blur-sm hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-slate-300/50 focus:ring-offset-1 focus:ring-offset-transparent`}
                        data-tooltip-id="tooltip"
                        data-tooltip-content={`${unreadCount} unread notifications`}
                        data-tooltip-place={collapsed ? 'right' : 'top'}
                    >
                        <BellIconComponent
                            className={`${
                                collapsed ? 'w-6 h-6' : 'w-5 h-5'
                            } transition-all duration-200 text-slate-600 group-hover:text-slate-700`}
                        />

                        {/* Subtle Unread Count Badge */}
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[1.125rem] h-4 px-1 text-xs font-medium text-white bg-blue-500 rounded-full shadow-sm ring-1 ring-white/60">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}

                        {/* Subtle Connection Status Indicator */}
                        <div
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${
                                connected ? 'bg-green-500' : 'bg-orange-500'
                            }`}
                            title={connected ? 'Real-time connected' : 'Polling mode'}
                        />
                    </Menu.Button>
                )}
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
                        } liquid-popup overflow-hidden focus:outline-none`}
                    >
                        {/* Clean Liquid Header */}
                        <div className="relative px-6 py-5 border-b border-liquid-subtle">
                            {/* Minimal overlay */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />

                            {/* Content */}
                            <div className="relative">
                                {/* Header row */}
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-10 h-10 liquid-card rounded-xl flex items-center justify-center flex-shrink-0 shadow-liquid-subtle">
                                            <BellIconComponent className="w-5 h-5 text-slate-600 drop-shadow-sm" />
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
                                            <button className="w-8 h-8 liquid-button rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center group">
                                                <Cog6ToothIcon className="w-4 h-4 text-slate-600 group-hover:text-slate-700 transition-colors duration-200" />
                                            </button>
                                        </Link>
                                        {/* Mark All Read Button */}
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={handleMarkAllAsRead}
                                                className="px-3 py-1.5 text-xs font-semibold text-blue-700 liquid-button rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
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
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50/90 text-blue-700 shadow-liquid-subtle border border-liquid-subtle">
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
                                        {/* Clean liquid background */}
                                        <div className="absolute inset-0 bg-slate-50/60 rounded-full blur-sm" />
                                        <div className="relative w-20 h-20 liquid-card rounded-full flex items-center justify-center shadow-liquid">
                                            <BellIcon className="w-9 h-9 text-slate-500" />
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
                                                    className={`relative group rounded-xl transition-all duration-200 cursor-pointer overflow-hidden ${
                                                        active
                                                            ? 'bg-slate-50/90 scale-[0.98] shadow-liquid'
                                                            : 'bg-white/60 hover:bg-slate-50/80 hover:shadow-liquid-subtle'
                                                    } border border-liquid-subtle`}
                                                    onClick={() =>
                                                        handleNotificationClick(notification.id, notification.isRead)
                                                    }
                                                >
                                                    {/* Clean liquid overlay */}
                                                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/30 via-transparent to-slate-50/10" />

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

                                                                    {/* Clean Mark as Read Button */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleNotificationClick(
                                                                                notification.id,
                                                                                notification.isRead,
                                                                            );
                                                                        }}
                                                                        className="group/btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 liquid-button rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
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

                        {/* Clean Liquid Footer */}
                        <div className="relative px-4 py-3 border-t border-liquid-subtle">
                            {/* Minimal overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-white/30 to-transparent" />

                            <div className="relative">
                                <Link
                                    href="/notifications"
                                    className="group flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-blue-600 hover:text-blue-700 liquid-button rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <span>View All</span>
                                    {unreadCount > unreadNotifications.length && (
                                        <span className="px-2 py-1 text-xs bg-blue-50/90 text-blue-700 rounded-lg font-semibold shadow-liquid-subtle border border-liquid-subtle">
                                            +{unreadCount - unreadNotifications.length}
                                        </span>
                                    )}
                                    <svg
                                        className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
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
