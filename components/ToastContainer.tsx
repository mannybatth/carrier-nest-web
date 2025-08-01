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

    // Debug logging
    useEffect(() => {
        // Debug logging removed for production
    }, [notification]);

    useEffect(() => {
        const duration = notification.duration || 6000;

        const timer = setTimeout(() => {
            setShow(false);
            setTimeout(() => onDismiss(notification.id), 300);
        }, duration);

        return () => {
            clearTimeout(timer);
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
        const iconClass = 'h-5 w-5';
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
                    titleColor: 'text-green-800',
                    messageColor: 'text-green-700',
                    iconColor: 'text-green-600',
                    accentColor: 'rgba(52, 199, 89, 0.2)', // Apple green
                    shadowColor: 'rgba(52, 199, 89, 0.15)',
                    glowColor: 'rgba(52, 199, 89, 0.3)',
                };
            case 'warning':
                return {
                    titleColor: 'text-orange-800',
                    messageColor: 'text-orange-700',
                    iconColor: 'text-orange-600',
                    accentColor: 'rgba(255, 149, 0, 0.2)', // Apple orange
                    shadowColor: 'rgba(255, 149, 0, 0.15)',
                    glowColor: 'rgba(255, 149, 0, 0.3)',
                };
            case 'error':
                return {
                    titleColor: 'text-red-800',
                    messageColor: 'text-red-700',
                    iconColor: 'text-red-600',
                    accentColor: 'rgba(255, 69, 58, 0.2)', // Apple red
                    shadowColor: 'rgba(255, 69, 58, 0.15)',
                    glowColor: 'rgba(255, 69, 58, 0.3)',
                };
            default:
                return {
                    titleColor: 'text-blue-800',
                    messageColor: 'text-blue-700',
                    iconColor: 'text-blue-600',
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
                {/* Liquid Glass Toast Container with Apple Design Language */}
                <div
                    className={`relative overflow-hidden rounded-2xl transition-all duration-700 ease-out cursor-pointer
                        transform hover:scale-[1.02] active:scale-[0.98]
                        ${notification.priority === 'URGENT' ? 'animate-pulse' : ''}`}
                    onClick={handleToastClick}
                    style={{
                        background: `
                            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.95) 0%, rgba(248, 248, 251, 0.9) 50%, rgba(240, 240, 243, 0.85) 100%),
                            linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(0, 0, 0, 0.05) 100%)
                        `,
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        boxShadow: `
                            0 8px 32px rgba(0, 0, 0, 0.12),
                            0 2px 16px rgba(0, 0, 0, 0.08),
                            inset 0 1px 0 rgba(255, 255, 255, 0.7),
                            inset 0 -1px 0 rgba(0, 0, 0, 0.1),
                            0 0 0 1px rgba(255, 255, 255, 0.2)
                        `,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '16px', // Consistent border radius
                    }}
                >
                    {/* Dynamic liquid accent gradient */}
                    <div
                        className="absolute top-0 left-0 right-0 h-1 overflow-hidden"
                        style={{
                            background: `linear-gradient(90deg,
                                ${colors.accentColor} 0%,
                                ${colors.glowColor} 30%,
                                ${colors.glowColor} 50%,
                                ${colors.glowColor} 70%,
                                ${colors.accentColor} 100%)`,
                            borderRadius: '16px 16px 0 0', // Match container border radius
                        }}
                    >
                        <div
                            className="absolute inset-0 opacity-60"
                            style={{
                                background: `linear-gradient(90deg, transparent 0%, ${colors.glowColor} 50%, transparent 100%)`,
                                animation: 'shimmer 3s ease-in-out infinite',
                            }}
                        />
                    </div>

                    {/* Liquid glass shine effect */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 30%, transparent 70%, rgba(255, 255, 255, 0.2) 100%)`,
                            transform: 'translateX(-100%)',
                            animation: 'liquid-shine 4s ease-in-out infinite',
                            borderRadius: '16px', // Match container border radius
                        }}
                    />

                    {/* Content area with enhanced liquid aesthetics */}
                    <div className="flex items-start gap-4 p-6 relative z-10">
                        {/* Icon with liquid glass effect */}
                        <div className={`flex-shrink-0 ${colors.iconColor} mt-0.5 relative`}>
                            <div
                                className="p-3 transition-all duration-300 ease-out"
                                style={{
                                    background: `
                                        radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 70%),
                                        ${colors.accentColor}
                                    `,
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    boxShadow: `
                                        0 4px 16px ${colors.shadowColor},
                                        inset 0 1px 0 rgba(255, 255, 255, 0.7),
                                        inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                                    `,
                                    border: '1px solid rgba(255, 255, 255, 0.4)',
                                    borderRadius: '12px', // Consistent border radius
                                    transform: 'translateZ(0)',
                                }}
                            >
                                {getIcon()}
                            </div>
                        </div>

                        {/* Enhanced text content with liquid glass backdrop */}
                        <div className="flex-1 min-w-0">
                            {hasTitle && (
                                <div
                                    className={`font-semibold text-[15px] leading-6 ${colors.titleColor} truncate mb-2`}
                                    style={{
                                        textShadow: '0 1px 3px rgba(255, 255, 255, 0.8)',
                                        fontWeight: '600',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    {notification.title}
                                </div>
                            )}
                            {hasMessage && (
                                <div
                                    className={`text-[13px] leading-5 ${colors.messageColor} ${
                                        hasTitle ? 'line-clamp-2' : 'line-clamp-3'
                                    }`}
                                    style={{
                                        textShadow: '0 1px 2px rgba(255, 255, 255, 0.6)',
                                        lineHeight: '1.45',
                                    }}
                                >
                                    {notification.message}
                                </div>
                            )}
                        </div>

                        {/* Liquid glass close button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDismiss();
                            }}
                            className="flex-shrink-0 p-2.5 transition-all duration-300 ease-out
                                     text-gray-500 hover:text-gray-700
                                     transform hover:scale-110 active:scale-90 hover:rotate-90"
                            style={{
                                background: `
                                    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.9) 0%, rgba(248, 248, 251, 0.7) 100%)
                                `,
                                backdropFilter: 'blur(12px) saturate(150%)',
                                WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                                boxShadow: `
                                    0 4px 16px rgba(0, 0, 0, 0.1),
                                    inset 0 1px 0 rgba(255, 255, 255, 0.8),
                                    inset 0 -1px 0 rgba(0, 0, 0, 0.05),
                                    0 0 0 1px rgba(255, 255, 255, 0.3)
                                `,
                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                borderRadius: '10px', // Consistent border radius
                            }}
                        >
                            <XMarkIcon className="h-4 w-4" />
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
    maxVisible = 3, // Changed default to 3 for stacking
}) => {
    const [mounted, setMounted] = useState(false);

    // Debug logging
    useEffect(() => {
        // Debug logging removed for production
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
                return 'top-4 left-4';
            case 'top-center':
                return 'top-4 left-1/2 transform -translate-x-1/2';
            case 'top-right':
                return 'top-4 right-4';
            case 'bottom-left':
                return 'bottom-4 left-4';
            case 'bottom-center':
                return 'bottom-4 left-1/2 transform -translate-x-1/2';
            case 'bottom-right':
                return 'bottom-4 right-4';
            default:
                return 'top-4 right-4';
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

    // Debug logging removed for production

    const containerElement = (
        <div
            className={`fixed ${positionClasses} pointer-events-none w-full max-w-sm`}
            style={{ zIndex }}
            aria-live="polite"
            aria-label="Notifications"
        >
            <div className="relative min-w-0 w-full">
                {visibleNotifications.map((notification, index) => {
                    // Calculate stacking transformations for consistent 3D effect
                    const stackOffset = index * 8; // Reduced offset for tighter stacking
                    const scaleReduction = 1 - index * 0.025; // Smaller scale reduction for subtlety
                    const shadowDepth = 1 + index * 0.6; // Consistent shadow depth
                    const blurAmount = index > 0 ? 1 + index * 0.5 : 0; // Subtle progressive blur for depth

                    return (
                        <div
                            key={notification.id}
                            className="absolute top-0 left-0 w-full toast-stack-item"
                            style={{
                                transform: `translateY(${stackOffset}px) scale(${scaleReduction}) translateZ(${
                                    -index * 5
                                }px)`,
                                zIndex: maxVisible - index,
                                filter: `
                                    drop-shadow(0 ${4 + index * 2}px ${8 + index * 4}px rgba(0, 0, 0, ${
                                    0.12 * shadowDepth
                                }))
                                    ${blurAmount > 0 ? `blur(${blurAmount}px)` : ''}
                                `,
                                perspective: '1000px',
                                transformStyle: 'preserve-3d',
                            }}
                        >
                            <ToastItem
                                notification={notification}
                                onDismiss={onDismiss}
                                onMarkAsRead={onMarkAsRead}
                                animationDirection={animationDirection}
                            />
                        </div>
                    );
                })}

                {/* Stack indicator for additional notifications */}
                {notifications.length > maxVisible && (
                    <div
                        className="absolute top-6 right-2 z-0 pointer-events-none"
                        style={{
                            transform: `translateY(${maxVisible * 8}px) scale(${1 - maxVisible * 0.025})`,
                        }}
                    >
                        <div
                            className="w-full h-12"
                            style={{
                                background: `
                                    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.9) 0%, rgba(248, 248, 251, 0.85) 50%, rgba(240, 240, 243, 0.8) 100%),
                                    linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(0, 0, 0, 0.03) 100%)
                                `,
                                backdropFilter: 'blur(16px) saturate(150%)',
                                WebkitBackdropFilter: 'blur(16px) saturate(150%)',
                                boxShadow: `
                                    0 4px 16px rgba(0, 0, 0, 0.08),
                                    0 1px 8px rgba(0, 0, 0, 0.05),
                                    inset 0 1px 0 rgba(255, 255, 255, 0.6),
                                    inset 0 -1px 0 rgba(0, 0, 0, 0.05),
                                    0 0 0 1px rgba(255, 255, 255, 0.15)
                                `,
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                borderRadius: '16px', // Consistent border radius
                            }}
                        >
                            <div className="flex items-center justify-center h-full px-4">
                                <span
                                    className="text-xs font-semibold text-gray-600"
                                    style={{
                                        textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)',
                                        letterSpacing: '-0.01em',
                                    }}
                                >
                                    +{notifications.length - maxVisible} more notification
                                    {notifications.length - maxVisible !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Spacer to ensure proper container height for stacking */}
                <div
                    className="invisible w-full"
                    style={{
                        height:
                            visibleNotifications.length > 0
                                ? `${90 + (Math.min(visibleNotifications.length, maxVisible) - 1) * 8}px`
                                : '0px',
                    }}
                />
            </div>
        </div>
    );

    // Debug logging removed for production

    return createPortal(containerElement, document.body);
};

export default ToastContainer;
