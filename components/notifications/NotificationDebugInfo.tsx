import React from 'react';
import { useGlobalNotifications } from '../../contexts/GlobalNotificationContext';

/**
 * Debug component to show the global notification system status
 * This can be placed anywhere in your app to monitor the cross-tab notification system
 */
export const NotificationDebugInfo: React.FC = () => {
    const { isMainTab, connected, unreadCount, notifications } = useGlobalNotifications();

    return (
        <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200/60 p-4 shadow-lg text-xs font-mono max-w-xs z-[9999]">
            <div className="mb-2 font-semibold text-gray-900">Global Notifications Debug</div>

            <div className="space-y-1 text-gray-700">
                <div className="flex justify-between">
                    <span>Tab Status:</span>
                    <span className={`font-semibold ${isMainTab ? 'text-green-600' : 'text-blue-600'}`}>
                        {isMainTab ? 'LEADER' : 'FOLLOWER'}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>SSE Connected:</span>
                    <span className={`font-semibold ${connected ? 'text-green-600' : 'text-red-600'}`}>
                        {connected ? 'YES' : 'NO'}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Unread Count:</span>
                    <span className="font-semibold text-blue-600">{unreadCount}</span>
                </div>

                <div className="flex justify-between">
                    <span>Total Notifications:</span>
                    <span className="font-semibold text-gray-600">{notifications.length}</span>
                </div>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
                {isMainTab ? (
                    <>🎯 This tab manages the SSE connection</>
                ) : (
                    <>📡 This tab receives notifications via BroadcastChannel</>
                )}
            </div>
        </div>
    );
};

export default NotificationDebugInfo;
