import React, { useEffect } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useGlobalNotifications } from '../../contexts/GlobalNotificationContext';
import { NotificationPriority } from '../../interfaces/notifications';
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
                return <ExclamationCircleIcon className="w-4 h-4 text-red-500" />;
            case NotificationPriority.MEDIUM:
                return <InformationCircleIcon className="w-4 h-4 text-blue-500" />;
            case NotificationPriority.LOW:
            default:
                return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
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

    // Get progress border color based on priority
    const getProgressBorderColor = () => {
        switch (notification.priority) {
            case NotificationPriority.URGENT:
                return 'from-red-400 via-red-500 to-red-600';
            case NotificationPriority.HIGH:
                return 'from-orange-400 via-orange-500 to-orange-600';
            case NotificationPriority.MEDIUM:
                return 'from-blue-400 via-blue-500 to-blue-600';
            case NotificationPriority.LOW:
            default:
                return 'from-green-400 via-green-500 to-green-600';
        }
    };

    // Calculate duration for progress animation
    const duration = notification.priority === NotificationPriority.URGENT ? 10000 : 6000;

    return (
        <div className="relative group pointer-events-auto w-full max-w-sm">
            {/* Enhanced backdrop blur for stronger glass separation */}
            <div className="absolute inset-0 bg-black/10 backdrop-blur-xl rounded-3xl -z-30 scale-105" />

            {/* Progress border container with enhanced liquid glass effect */}
            <div className={`relative p-0.5 rounded-3xl bg-gradient-to-r ${getProgressBorderColor()} shadow-2xl`}>
                {/* Animated progress border with liquid glass properties */}
                <div
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${getProgressBorderColor()} opacity-90 shadow-inner`}
                    style={{
                        animation: `progressBorder ${duration}ms linear forwards`,
                        filter: 'blur(0.5px)',
                    }}
                />

                {/* Main liquid glass container with enhanced effects */}
                <div className="relative bg-white/15 backdrop-blur-3xl rounded-3xl shadow-2xl shadow-black/30 border border-white/40 ring-2 ring-white/20 transition-all duration-700 hover:shadow-3xl hover:shadow-black/40 hover:scale-[1.02] overflow-hidden">
                    {/* Primary glass overlay with realistic refraction */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/15 to-transparent pointer-events-none rounded-3xl" />

                    {/* Secondary glass layer for depth */}
                    <div className="absolute inset-0 bg-gradient-to-tl from-gray-100/25 via-transparent to-white/25 pointer-events-none rounded-3xl" />

                    {/* Liquid glass reflection effect */}
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-t-3xl" />

                    {/* Frosted glass texture overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-gray-50/10 pointer-events-none rounded-3xl opacity-60" />

                    {/* Enhanced priority accent bar with liquid glass glow */}
                    <div
                        className={`absolute left-0 top-2 bottom-2 w-2 rounded-r-full shadow-2xl backdrop-blur-sm ${
                            notification.priority === NotificationPriority.URGENT
                                ? 'bg-gradient-to-b from-red-300 via-red-500 to-red-700 shadow-red-500/60'
                                : notification.priority === NotificationPriority.HIGH
                                ? 'bg-gradient-to-b from-orange-300 via-orange-500 to-orange-700 shadow-orange-500/60'
                                : notification.priority === NotificationPriority.MEDIUM
                                ? 'bg-gradient-to-b from-blue-300 via-blue-500 to-blue-700 shadow-blue-500/60'
                                : 'bg-gradient-to-b from-green-300 via-green-500 to-green-700 shadow-green-500/60'
                        }`}
                    />

                    {/* Content container with enhanced liquid glass effect */}
                    <div className="relative p-6 bg-white/5 backdrop-blur-2xl">
                        <div className="flex items-start gap-4">
                            {/* Enhanced icon with premium liquid glass effect */}
                            <div
                                className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-2xl mt-0.5 border border-white/40 ring-1 ring-white/20 ${
                                    notification.priority === NotificationPriority.URGENT ||
                                    notification.priority === NotificationPriority.HIGH
                                        ? 'bg-gradient-to-br from-red-400/80 via-red-500/70 to-red-600/80 shadow-red-500/50'
                                        : notification.priority === NotificationPriority.MEDIUM
                                        ? 'bg-gradient-to-br from-blue-400/80 via-blue-500/70 to-blue-600/80 shadow-blue-500/50'
                                        : 'bg-gradient-to-br from-green-400/80 via-green-500/70 to-green-600/80 shadow-green-500/50'
                                }`}
                            >
                                {React.cloneElement(getIcon(), {
                                    className: 'w-6 h-6 text-white drop-shadow-2xl',
                                })}
                            </div>

                            {/* Enhanced content with liquid glass typography */}
                            <div className="flex-1 min-w-0 pr-3">
                                <h3 className="text-xl font-bold text-gray-900 leading-7 tracking-tight line-clamp-2 mb-3 drop-shadow-lg">
                                    {notification.title}
                                </h3>
                                <p className="text-base text-gray-800 leading-7 line-clamp-3 drop-shadow-md opacity-95">
                                    {notification.message}
                                </p>

                                {/* Enhanced priority badge with premium liquid glass effect */}
                                {notification.priority === NotificationPriority.URGENT && (
                                    <div className="mt-4">
                                        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-red-500/25 text-red-900 shadow-2xl backdrop-blur-2xl border border-red-400/40 ring-1 ring-red-300/30">
                                            🚨 URGENT
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Enhanced close button with premium liquid glass effect */}
                            <button
                                className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/25 hover:bg-white/35 backdrop-blur-2xl flex items-center justify-center transition-all duration-400 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none hover:scale-110 border border-white/30 shadow-2xl ring-1 ring-white/20"
                                onClick={onDismiss}
                            >
                                <span className="sr-only">Close</span>
                                <svg
                                    className="h-5 w-5 text-gray-700 drop-shadow-lg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
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
            </div>

            {/* Enhanced multi-layered atmospheric glow effects */}
            <div
                className={`absolute inset-0 rounded-3xl blur-3xl -z-10 opacity-70 scale-95 ${
                    notification.priority === NotificationPriority.URGENT ||
                    notification.priority === NotificationPriority.HIGH
                        ? 'bg-red-400/40'
                        : notification.priority === NotificationPriority.MEDIUM
                        ? 'bg-blue-400/40'
                        : 'bg-green-400/40'
                }`}
            />
            <div
                className={`absolute inset-0 rounded-3xl blur-xl -z-20 scale-110 opacity-50 ${
                    notification.priority === NotificationPriority.URGENT ||
                    notification.priority === NotificationPriority.HIGH
                        ? 'bg-red-500/50'
                        : notification.priority === NotificationPriority.MEDIUM
                        ? 'bg-blue-500/50'
                        : 'bg-green-500/50'
                }`}
            />
            <div
                className={`absolute inset-0 rounded-3xl blur-2xl -z-30 scale-125 opacity-30 ${
                    notification.priority === NotificationPriority.URGENT ||
                    notification.priority === NotificationPriority.HIGH
                        ? 'bg-red-600/60'
                        : notification.priority === NotificationPriority.MEDIUM
                        ? 'bg-blue-600/60'
                        : 'bg-green-600/60'
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
