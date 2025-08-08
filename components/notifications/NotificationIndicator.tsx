import React from 'react';
import { useGlobalNotifications } from '../../contexts/GlobalNotificationContext';

export default function NotificationIndicator() {
    const { notifications, unreadCount } = useGlobalNotifications();
    const connected = true; // fallback since we don't have SSE context
    const loading = false; // fallback since we don't have SSE context

    return (
        <div className="flex items-center space-x-2 p-2 bg-white border rounded-lg shadow-sm">
            {/* Connection Status */}
            <div className="flex items-center space-x-1">
                <div
                    className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
                    title={connected ? 'Real-time notifications connected' : 'Using polling fallback'}
                />
                <span className="text-xs text-gray-500">{connected ? 'Live' : 'Polling'}</span>
            </div>

            {/* Notification Count */}
            <div className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-4 4-4-4h3v-3a4 4 0 00-4-4H9a4 4 0 00-4 4v3"
                    />
                </svg>

                {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}

                {loading && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
            </div>

            {/* Recent Notifications Preview */}
            <div className="text-xs text-gray-500">
                {notifications.length > 0 ? `${notifications.length} total` : 'No notifications'}
            </div>
        </div>
    );
}
