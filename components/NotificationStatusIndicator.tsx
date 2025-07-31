import React from 'react';
import { useGlobalNotifications } from '../contexts/GlobalNotificationContext';

/**
 * Example component showing the notification system status
 * This can be used for debugging or displaying connection info to users
 */
export const NotificationStatusIndicator: React.FC = () => {
    const { unreadCount } = useGlobalNotifications();

    // Fallback values since we don't have SSE context
    const connected = true;
    const loading = false;
    const connectionMode = 'polling';
    const lastActivity = Date.now();

    const getStatusColor = () => {
        if (loading) return 'text-yellow-600';
        if (!connected) return 'text-red-600';
        return 'text-green-600';
    };

    const getModeDescription = () => {
        if (connectionMode === 'polling') {
            return 'Background polling';
        } else {
            return 'Unknown';
        }
    };

    const formatLastActivity = () => {
        const now = Date.now();
        const diff = now - lastActivity;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return new Date(lastActivity).toLocaleDateString();
    };

    const handleReconnect = () => {
        // Placeholder for reconnect functionality
    };

    const handleDisconnect = () => {
        // Placeholder for disconnect functionality
    };

    return (
        <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
                <div
                    className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} ${
                        loading ? 'animate-pulse' : ''
                    }`}
                />
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                    {loading ? 'Connecting...' : connected ? 'Connected' : 'Disconnected'}
                </span>
            </div>

            {/* Connection Mode */}
            <div className="text-sm text-gray-600">
                <span className="font-medium">Mode:</span> {getModeDescription()}
            </div>

            {/* Unread Count */}
            <div className="text-sm text-gray-600">
                <span className="font-medium">Unread:</span> {unreadCount}
            </div>

            {/* Last Activity */}
            <div className="text-sm text-gray-600">
                <span className="font-medium">Last Activity:</span> {formatLastActivity()}
            </div>

            {/* Manual Controls */}
            <div className="flex space-x-2">
                <button
                    onClick={handleReconnect}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Reconnect
                </button>
                <button
                    onClick={handleDisconnect}
                    className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                    Disconnect
                </button>
            </div>
        </div>
    );
};

/**
 * Simplified notification bell that works with the notification system
 */
export const SmartNotificationBell: React.FC = () => {
    const { unreadCount } = useGlobalNotifications();

    // Fallback values since we don't have SSE context
    const connected = true;
    const connectionMode = 'polling';

    return (
        <div className="relative">
            {/* Bell Icon */}
            <button className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
                {/* Bell SVG */}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-5 5v-5zM13 7a4 4 0 11-8 0 4 4 0 018 0zM9 17v1a3 3 0 006 0v-1"
                    />
                </svg>

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}

                {/* Connection Mode Indicator */}
                <div
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        !connected ? 'bg-red-500' : 'bg-yellow-500'
                    }`}
                    title={`Mode: ${connectionMode}`}
                />
            </button>
        </div>
    );
};
