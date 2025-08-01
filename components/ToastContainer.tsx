import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Transition } from '@headlessui/react';
import {
    XMarkIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

export interface ToastNotification {
    id: string;
    notificationId?: string; // Original notification ID for mark as read functionality
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info' | 'error';
    priority?: string;
    duration?: number;
}

export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface ToastItemProps {
    notification: ToastNotification;
    onDismiss: (id: string) => void;
    onMarkAsRead?: (notificationId: string) => void;
    animationDirection?: { from: string; to: string };
}

const ToastItem: React.FC<ToastItemProps> = ({
    notification,
    onDismiss,
    onMarkAsRead,
    animationDirection = { from: 'translate-x-full', to: 'translate-x-full' },
}) => {
    const [show, setShow] = useState(true);
    const [progress, setProgress] = useState(100);

    // Debug logging removed for production
    useEffect(() => {
        // Production-ready notification tracking
    }, [notification, progress]);

    useEffect(() => {
        const duration = notification.duration || 6000;
        const startTime = Date.now();

        // Apple-style smooth progress animation with easing
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, duration - elapsed);
            const rawProgress = (remaining / duration) * 100;

            // Apple-style easing for smoother animation
            const easedProgress =
                rawProgress > 90
                    ? rawProgress
                    : rawProgress > 50
                    ? rawProgress - Math.sin((100 - rawProgress) * 0.1) * 2
                    : rawProgress - Math.sin((100 - rawProgress) * 0.05) * 1;

            setProgress(Math.max(0, easedProgress));
        }, 16); // 60fps for smooth animation

        const timer = setTimeout(() => {
            setShow(false);
            setTimeout(() => onDismiss(notification.id), 300);
        }, duration);

        return () => {
            clearTimeout(timer);
            clearInterval(progressInterval);
        };
    }, [notification.id, onDismiss, notification.duration]);

    const handleDismiss = () => {
        setShow(false);
        setTimeout(() => onDismiss(notification.id), 300);
    };

    const handleToastClick = () => {
        if (notification.notificationId && onMarkAsRead) {
            onMarkAsRead(notification.notificationId);
        }
        handleDismiss();
    };

    const getIcon = () => {
        const iconClass = 'h-4 w-4'; // Compact icons for better proportion
        switch (notification.type) {
            case 'success':
                return <CheckCircleIcon className={iconClass} />;
            case 'warning':
                return <ExclamationTriangleIcon className={iconClass} />;
            case 'error':
                return <ExclamationCircleIcon className={iconClass} />;
            default:
                return <InformationCircleIcon className={iconClass} />;
        }
    };

    const getTypeColors = () => {
        switch (notification.type) {
            case 'success':
                return {
                    titleColor: 'text-green-900',
                    messageColor: 'text-green-800',
                    iconColor: 'text-green-700',
                    accentColor: 'rgba(52, 199, 89, 0.2)', // Apple green
                    shadowColor: 'rgba(52, 199, 89, 0.15)',
                    glowColor: 'rgba(52, 199, 89, 0.3)',
                };
            case 'warning':
                return {
                    titleColor: 'text-orange-900',
                    messageColor: 'text-orange-800',
                    iconColor: 'text-orange-700',
                    accentColor: 'rgba(255, 149, 0, 0.2)', // Apple orange
                    shadowColor: 'rgba(255, 149, 0, 0.15)',
                    glowColor: 'rgba(255, 149, 0, 0.3)',
                };
            case 'error':
                return {
                    titleColor: 'text-red-900',
                    messageColor: 'text-red-800',
                    iconColor: 'text-red-700',
                    accentColor: 'rgba(255, 69, 58, 0.2)', // Apple red
                    shadowColor: 'rgba(255, 69, 58, 0.15)',
                    glowColor: 'rgba(255, 69, 58, 0.3)',
                };
            default:
                return {
                    titleColor: 'text-blue-900',
                    messageColor: 'text-blue-800',
                    iconColor: 'text-blue-700',
                    accentColor: 'rgba(0, 122, 255, 0.2)', // Apple blue
                    shadowColor: 'rgba(0, 122, 255, 0.15)',
                    glowColor: 'rgba(0, 122, 255, 0.3)',
                };
        }
    };

    const colors = getTypeColors();
    const hasTitle = notification.title && notification.title.trim() !== '';
    const hasMessage = notification.message && notification.message.trim() !== '';

    return (
        <Transition
            show={show}
            enter="transform ease-out duration-700"
            enterFrom="opacity-0 scale-90 translate-x-full translate-y-[-30px] rotate-6"
            enterTo="translate-x-0 translate-y-0 opacity-100 scale-100 rotate-0"
            leave="transition ease-in duration-400"
            leaveFrom="opacity-100 scale-100 translate-x-0 translate-y-0 rotate-0"
            leaveTo="opacity-0 scale-85 translate-x-full translate-y-[-40px] rotate-12"
        >
            <div className="relative group pointer-events-auto w-full">
                {/* Liquid Glass Toast Container with Premium Apple Design Language */}
                <div
                    className={`relative overflow-hidden rounded-3xl transition-all duration-300 ease-out cursor-pointer
                        transform hover:scale-[1.01] active:scale-[0.99] bg-white
                        ${notification.priority === 'URGENT' ? 'animate-pulse' : ''}`}
                    onClick={handleToastClick}
                    style={{
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
                        border: '1px solid rgba(229, 231, 235, 0.6)',
                        borderRadius: '24px',
                    }}
                >
                    {/* Simple accent line for notification type */}
                    <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{
                            backgroundColor: colors.accentColor.replace('0.2', '0.6'),
                            borderRadius: '24px 24px 0 0',
                        }}
                    />

                    {/* Content area with responsive padding */}
                    <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 md:p-6 relative z-10">
                        {/* Simple icon container */}
                        <div className={`flex-shrink-0 ${colors.iconColor} mt-0.5 sm:mt-1`}>
                            <div
                                className="p-3 sm:p-3.5 md:p-4 transition-all duration-300 ease-out
                                         hover:scale-105 relative overflow-hidden bg-gray-50 rounded-2xl"
                                style={{
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                    border: '1px solid rgba(229, 231, 235, 0.6)',
                                }}
                            >
                                {getIcon()}
                            </div>
                        </div>

                        {/* Apple-style enhanced text content with premium typography */}
                        <div className="flex-1 min-w-0 pr-2 sm:pr-3">
                            {hasTitle && (
                                <div
                                    className={`font-bold text-sm sm:text-base leading-5 sm:leading-6 ${colors.titleColor} mb-1.5 sm:mb-2 line-clamp-2`}
                                    style={{
                                        textShadow:
                                            '0 2px 4px rgba(255, 255, 255, 0.95), 0 1px 2px rgba(0, 0, 0, 0.12)',
                                        fontWeight: '700',
                                        letterSpacing: '-0.025em',
                                        lineHeight: '1.25',
                                        fontFamily:
                                            '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                                    }}
                                >
                                    {notification.title}
                                </div>
                            )}
                            {hasMessage && (
                                <div
                                    className={`text-xs sm:text-sm leading-4 sm:leading-5 ${colors.messageColor} ${
                                        hasTitle ? 'line-clamp-1 sm:line-clamp-2' : 'line-clamp-2 sm:line-clamp-3'
                                    } opacity-90`}
                                    style={{
                                        textShadow: '0 1px 3px rgba(255, 255, 255, 0.9), 0 1px 2px rgba(0, 0, 0, 0.08)',
                                        lineHeight: '1.35',
                                        letterSpacing: '-0.015em',
                                        fontFamily:
                                            '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                    }}
                                >
                                    {notification.message}
                                </div>
                            )}
                        </div>

                        {/* Simple close button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDismiss();
                            }}
                            className="flex-shrink-0 p-2.5 sm:p-3 transition-all duration-300 ease-out
                                     text-gray-500 hover:text-gray-700 active:scale-90
                                     hover:bg-gray-100 rounded-2xl group relative overflow-hidden"
                            style={{
                                background: 'rgba(249, 250, 251, 0.8)',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                border: '1px solid rgba(229, 231, 235, 0.6)',
                            }}
                        >
                            {/* Simple circular progress indicator */}
                            <div
                                className="absolute inset-0 rounded-2xl"
                                style={{
                                    background: `conic-gradient(from -90deg,
                                        rgba(59, 130, 246, 0.8) 0%,
                                        rgba(59, 130, 246, 0.8) ${progress}%,
                                        transparent ${progress}%,
                                        transparent 100%)`,
                                    mask: `radial-gradient(circle at center, transparent 42%, white 45%, white 100%)`,
                                    WebkitMask: `radial-gradient(circle at center, transparent 42%, white 45%, white 100%)`,
                                }}
                            />

                            <XMarkIcon
                                className="h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ease-out
                                               group-hover:scale-110 relative z-10"
                            />
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    );
};

interface ToastContainerProps {
    notifications: ToastNotification[];
    position?: ToastPosition;
    onDismiss: (id: string) => void;
    onMarkAsRead?: (notificationId: string) => void;
    zIndex?: number;
    maxVisible?: number;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
    notifications,
    position = 'top-right',
    onDismiss,
    onMarkAsRead,
    zIndex = 50,
    maxVisible = 5, // Increased default for vertical list
}) => {
    const [mounted, setMounted] = useState(false);

    // Debug logging removed for production
    useEffect(() => {
        // Production-ready container tracking
    }, [notifications, position, zIndex, maxVisible]);

    useEffect(() => {
        // Debug logging removed for production
        setMounted(true);
        return () => {
            // Debug logging removed for production
        };
    }, []);

    useEffect(() => {
        // Debug logging removed for production
    }, [mounted]);

    if (!mounted) {
        // Debug logging removed for production
        return null;
    }

    const getPositionClasses = (pos: ToastPosition) => {
        switch (pos) {
            case 'top-left':
                return 'top-2 sm:top-4 left-2 sm:left-4';
            case 'top-center':
                return 'top-2 sm:top-4 left-1/2 transform -translate-x-1/2';
            case 'top-right':
                return 'top-2 sm:top-4 right-2 sm:right-4';
            case 'bottom-left':
                return 'bottom-2 sm:bottom-4 left-2 sm:left-4';
            case 'bottom-center':
                return 'bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2';
            case 'bottom-right':
                return 'bottom-2 sm:bottom-4 right-2 sm:right-4';
            default:
                return 'top-2 sm:top-4 right-2 sm:right-4';
        }
    };

    const getAnimationDirection = (pos: ToastPosition) => {
        if (pos.includes('left')) {
            return { from: '-translate-x-full', to: '-translate-x-full' };
        } else if (pos.includes('right')) {
            return { from: 'translate-x-full', to: 'translate-x-full' };
        } else if (pos.includes('top')) {
            return { from: '-translate-y-full', to: '-translate-y-full' };
        } else {
            return { from: 'translate-y-full', to: 'translate-y-full' };
        }
    };

    const visibleNotifications = notifications.slice(0, maxVisible);
    const animationDirection = getAnimationDirection(position);
    const positionClasses = getPositionClasses(position);

    // Production-ready notification processing

    // Debug logging removed for production

    const containerElement = (
        <div
            className={`fixed ${positionClasses} pointer-events-none w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-sm xl:max-w-sm px-3 sm:px-0`}
            style={{ zIndex }}
            aria-live="polite"
            aria-label="Notifications"
        >
            <div className="relative min-w-0 w-full space-y-2 sm:space-y-3">
                {visibleNotifications.map((notification, index) => (
                    <div key={notification.id} className="w-full">
                        <ToastItem
                            notification={notification}
                            onDismiss={onDismiss}
                            onMarkAsRead={onMarkAsRead}
                            animationDirection={animationDirection}
                        />
                    </div>
                ))}

                {/* Simple indicator for additional notifications with mobile optimization */}
                {notifications.length > maxVisible && (
                    <div className="w-full mt-2 sm:mt-3">
                        <div
                            className="w-full h-10 sm:h-12 flex items-center justify-center bg-white rounded-2xl"
                            style={{
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                border: '1px solid rgba(229, 231, 235, 0.6)',
                            }}
                        >
                            <span
                                className="text-xs sm:text-sm font-semibold text-gray-600"
                                style={{
                                    letterSpacing: '-0.01em',
                                    lineHeight: '1.2',
                                }}
                            >
                                +{notifications.length - maxVisible} more notification
                                {notifications.length - maxVisible !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                )}

                {/* Spacer removed - no longer needed for vertical list layout */}
            </div>
        </div>
    );

    // Debug logging removed for production

    return createPortal(containerElement, document.body);
};

export default ToastContainer;
