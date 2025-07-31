import React, { useEffect } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useGlobalNotifications } from '../contexts/GlobalNotificationContext';
import { NotificationPriority } from '../interfaces/notifications';
import toast from 'react-hot-toast';

interface NotificationToastProps {
    notification: any;
    onDismiss: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
    const getIcon = () => {
        switch (notification.priority) {
            case NotificationPriority.URGENT:
            case NotificationPriority.HIGH:
                return <ExclamationCircleIcon className="w-6 h-6 text-red-500" />;
            case NotificationPriority.MEDIUM:
                return <InformationCircleIcon className="w-6 h-6 text-blue-500" />;
            case NotificationPriority.LOW:
            default:
                return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
        }
    };

    const getBorderColor = () => {
        switch (notification.priority) {
            case NotificationPriority.URGENT:
                return 'border-red-200';
            case NotificationPriority.HIGH:
                return 'border-orange-200';
            case NotificationPriority.MEDIUM:
                return 'border-blue-200';
            case NotificationPriority.LOW:
            default:
                return 'border-green-200';
        }
    };

    return (
        <div className="relative group pointer-events-auto">
            {/* Apple-style Liquid Glass Container */}
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/15 border border-white/40 ring-1 ring-gray-900/5 transition-all duration-300 hover:shadow-3xl hover:shadow-black/20 hover:scale-[1.02] overflow-hidden">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-gray-100/20 pointer-events-none" />

                {/* Priority accent bar */}
                <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                        notification.priority === NotificationPriority.URGENT
                            ? 'bg-gradient-to-b from-red-400 to-red-600'
                            : notification.priority === NotificationPriority.HIGH
                            ? 'bg-gradient-to-b from-orange-400 to-orange-600'
                            : notification.priority === NotificationPriority.MEDIUM
                            ? 'bg-gradient-to-b from-blue-400 to-blue-600'
                            : 'bg-gradient-to-b from-green-400 to-green-600'
                    }`}
                />

                <div className="relative p-5">
                    <div className="flex items-start gap-4">
                        {/* Enhanced icon with background */}
                        <div
                            className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
                                notification.priority === NotificationPriority.URGENT ||
                                notification.priority === NotificationPriority.HIGH
                                    ? 'bg-gradient-to-br from-red-400 to-red-500 shadow-red-500/25'
                                    : notification.priority === NotificationPriority.MEDIUM
                                    ? 'bg-gradient-to-br from-blue-400 to-blue-500 shadow-blue-500/25'
                                    : 'bg-gradient-to-br from-green-400 to-green-500 shadow-green-500/25'
                            }`}
                        >
                            {React.cloneElement(getIcon(), {
                                className: 'w-5 h-5 text-white drop-shadow-sm',
                            })}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 leading-5 tracking-tight">
                                {notification.title}
                            </h3>
                            <p className="mt-1.5 text-sm text-gray-700 leading-5">{notification.message}</p>

                            {/* Priority badge */}
                            {notification.priority === NotificationPriority.URGENT && (
                                <div className="mt-3">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100/80 text-red-800 shadow-sm">
                                        URGENT
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Enhanced close button */}
                        <button
                            className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-100/60 hover:bg-gray-200/80 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none hover:scale-110 active:scale-95"
                            onClick={onDismiss}
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Soft glow effect based on priority */}
            <div
                className={`absolute inset-0 rounded-3xl blur-xl -z-10 ${
                    notification.priority === NotificationPriority.URGENT ||
                    notification.priority === NotificationPriority.HIGH
                        ? 'bg-red-400/10'
                        : notification.priority === NotificationPriority.MEDIUM
                        ? 'bg-blue-400/10'
                        : 'bg-green-400/10'
                }`}
            />
        </div>
    );
};

// Hook to automatically show toast notifications
export const useNotificationToasts = () => {
    const { notifications } = useGlobalNotifications();

    useEffect(() => {
        const lastNotification = notifications[0];
        if (lastNotification && !lastNotification.isRead && !lastNotification.toastShown) {
            // Mark as toast shown to prevent duplicate toasts
            lastNotification.toastShown = true;

            const duration = lastNotification.priority === NotificationPriority.URGENT ? 10000 : 6000;

            toast.custom(
                (t) => <NotificationToast notification={lastNotification} onDismiss={() => toast.dismiss(t.id)} />,
                { duration, position: 'top-right' },
            );
        }
    }, [notifications]);
};

export default NotificationToast;
