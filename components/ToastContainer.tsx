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
    animationDirection = { from: 'translate-x-full', to: 'translate-x-full' }, // Default right slide
}) => {
    const [show, setShow] = useState(true);

    useEffect(() => {
        const duration = notification.duration || 6000; // Default 6 seconds, longer for better UX
        const timer = setTimeout(() => {
            setShow(false);
            setTimeout(() => onDismiss(notification.id), 400); // Longer exit animation
        }, duration);

        return () => clearTimeout(timer);
    }, [notification.id, onDismiss, notification.duration]);

    const handleDismiss = () => {
        setShow(false);
        setTimeout(() => onDismiss(notification.id), 400); // Match longer animation
    };

    const handleToastClick = () => {
        // Mark as read if we have a notification ID and callback
        if (notification.notificationId && onMarkAsRead) {
            onMarkAsRead(notification.notificationId);
        }
        // Dismiss the toast
        handleDismiss();
    };

    const getIcon = () => {
        // Apple design principle: Icon size should relate to text hierarchy
        const iconClass = isCompact ? 'h-4 w-4' : 'h-4 w-4'; // Consistent icon size
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

    // Determine layout based on content
    const hasTitle = notification.title && notification.title.trim() !== '';
    const hasMessage = notification.message && notification.message.trim() !== '';
    const isCompact = hasTitle && !hasMessage; // Only title, no message - this becomes the focus

    return (
        <Transition
            show={show}
            enter="transform ease-out duration-500"
            enterFrom={`${animationDirection.from} opacity-0 scale-95 rotate-1`}
            enterTo="translate-x-0 translate-y-0 opacity-100 scale-100 rotate-0"
            leave="transition ease-in duration-400"
            leaveFrom="opacity-100 scale-100 translate-x-0 translate-y-0 rotate-0"
            leaveTo={`opacity-0 scale-95 ${animationDirection.to} rotate-1`}
        >
            <div className="relative group pointer-events-auto w-full">
                {/* Apple Liquid Design Container with Enhanced Glassmorphism */}
                <div
                    className="relative bg-white/[0.88] backdrop-blur-2xl rounded-2xl shadow-2xl shadow-black/[0.08] border border-white/[0.6] ring-1 ring-gray-900/[0.03] transition-all duration-500 ease-out hover:shadow-2xl hover:shadow-black/[0.12] hover:scale-[1.01] hover:-translate-y-1 overflow-hidden cursor-pointer"
                    onClick={handleToastClick}
                    style={{
                        background: `
                            linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 50%, rgba(241,245,249,0.88) 100%),
                            radial-gradient(circle at 30% 20%, rgba(59,130,246,0.03) 0%, transparent 50%),
                            radial-gradient(circle at 70% 80%, rgba(168,85,247,0.02) 0%, transparent 50%)
                        `,
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    }}
                >
                    {/* Liquid Glass Gradient Overlay */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-40"
                        style={{
                            background: `
                                linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, rgba(59,130,246,0.03) 100%),
                                radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                                radial-gradient(circle at 75% 75%, rgba(168,85,247,0.03) 0%, transparent 50%)
                            `,
                        }}
                    />

                    {/* Liquid Surface Highlight */}
                    <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <div className="absolute top-1 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                    {/* Liquid Priority Accent Flow */}
                    <div
                        className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${
                            notification.type === 'error'
                                ? 'bg-gradient-to-b from-red-400/50 via-red-500/60 to-red-600/40 shadow-lg shadow-red-500/20'
                                : notification.type === 'warning'
                                ? 'bg-gradient-to-b from-amber-400/50 via-amber-500/60 to-amber-600/40 shadow-lg shadow-amber-500/20'
                                : notification.type === 'success'
                                ? 'bg-gradient-to-b from-green-400/50 via-green-500/60 to-green-600/40 shadow-lg shadow-green-500/20'
                                : 'bg-gradient-to-b from-blue-400/50 via-blue-500/60 to-blue-600/40 shadow-lg shadow-blue-500/20'
                        }`}
                        style={{
                            background: `
                                ${
                                    notification.type === 'error'
                                        ? 'linear-gradient(180deg, rgba(239,68,68,0.5) 0%, rgba(220,38,38,0.6) 50%, rgba(185,28,28,0.4) 100%)'
                                        : notification.type === 'warning'
                                        ? 'linear-gradient(180deg, rgba(245,158,11,0.5) 0%, rgba(217,119,6,0.6) 50%, rgba(180,83,9,0.4) 100%)'
                                        : notification.type === 'success'
                                        ? 'linear-gradient(180deg, rgba(34,197,94,0.5) 0%, rgba(22,163,74,0.6) 50%, rgba(21,128,61,0.4) 100%)'
                                        : 'linear-gradient(180deg, rgba(59,130,246,0.5) 0%, rgba(37,99,235,0.6) 50%, rgba(29,78,216,0.4) 100%)'
                                }
                            `,
                            filter: 'blur(0.5px)',
                        }}
                    />

                    {/* Content with conditional layout */}
                    <div className={`relative ${isCompact ? 'p-4' : 'p-5'}`}>
                        {isCompact ? (
                            /* Centered layout for title-only notifications */
                            <div className="flex items-center justify-center gap-3">
                                {/* Liquid Design Icon for title-only */}
                                <div
                                    className={`flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:scale-105 ${
                                        notification.type === 'error'
                                            ? 'bg-gradient-to-br from-red-50/90 via-red-100/80 to-red-50/70 text-red-600 shadow-red-500/15'
                                            : notification.type === 'warning'
                                            ? 'bg-gradient-to-br from-amber-50/90 via-amber-100/80 to-amber-50/70 text-amber-600 shadow-amber-500/15'
                                            : notification.type === 'success'
                                            ? 'bg-gradient-to-br from-green-50/90 via-green-100/80 to-green-50/70 text-green-600 shadow-green-500/15'
                                            : 'bg-gradient-to-br from-blue-50/90 via-blue-100/80 to-blue-50/70 text-blue-600 shadow-blue-500/15'
                                    } ring-1 ring-white/40 border border-white/60`}
                                    style={{
                                        backdropFilter: 'blur(10px) saturate(150%)',
                                    }}
                                >
                                    {React.cloneElement(getIcon(), {
                                        className: 'h-5 w-5 drop-shadow-sm',
                                    })}
                                </div>

                                {/* Clean title as main focus */}
                                <div className="flex-1 text-center">
                                    <h3 className="text-sm font-semibold text-gray-900 leading-tight tracking-normal">
                                        {notification.title}
                                    </h3>

                                    {/* Liquid Priority Badge for compact layout */}
                                    {notification.priority && (
                                        <div className="mt-3">
                                            <span
                                                className={`inline-flex items-center px-3 py-1.5 rounded-2xl text-xs font-semibold backdrop-blur-xl shadow-lg ring-1 ring-white/30 border border-white/40 transition-all duration-300 ${
                                                    notification.priority === 'URGENT'
                                                        ? 'bg-gradient-to-r from-red-50/80 to-red-100/60 text-red-700 shadow-red-500/20'
                                                        : notification.priority === 'HIGH'
                                                        ? 'bg-gradient-to-r from-amber-50/80 to-amber-100/60 text-amber-700 shadow-amber-500/20'
                                                        : notification.priority === 'MEDIUM'
                                                        ? 'bg-gradient-to-r from-yellow-50/80 to-yellow-100/60 text-yellow-700 shadow-yellow-500/20'
                                                        : 'bg-gradient-to-r from-gray-50/80 to-gray-100/60 text-gray-700 shadow-gray-500/20'
                                                }`}
                                                style={{
                                                    backdropFilter: 'blur(16px) saturate(180%)',
                                                }}
                                            >
                                                {notification.priority}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Liquid Close Button for compact layout */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDismiss();
                                    }}
                                    className="flex-shrink-0 w-7 h-7 rounded-xl bg-white/60 hover:bg-white/80 active:bg-white/90 backdrop-blur-lg flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none hover:scale-110 active:scale-95 shadow-sm ring-1 ring-white/50 border border-white/60"
                                    title="Close"
                                    style={{
                                        backdropFilter: 'blur(12px) saturate(120%)',
                                    }}
                                >
                                    <XMarkIcon className="h-3.5 w-3.5 text-gray-600" />
                                </button>
                            </div>
                        ) : (
                            /* Standard layout for title + message notifications */
                            <div className="flex items-start gap-3">
                                {/* Liquid Design Icon for full notifications */}
                                <div
                                    className={`flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:scale-105 ${
                                        notification.type === 'error'
                                            ? 'bg-gradient-to-br from-red-50/90 via-red-100/80 to-red-50/70 text-red-600 shadow-red-500/15'
                                            : notification.type === 'warning'
                                            ? 'bg-gradient-to-br from-amber-50/90 via-amber-100/80 to-amber-50/70 text-amber-600 shadow-amber-500/15'
                                            : notification.type === 'success'
                                            ? 'bg-gradient-to-br from-green-50/90 via-green-100/80 to-green-50/70 text-green-600 shadow-green-500/15'
                                            : 'bg-gradient-to-br from-blue-50/90 via-blue-100/80 to-blue-50/70 text-blue-600 shadow-blue-500/15'
                                    } ring-1 ring-white/40 border border-white/60`}
                                    style={{
                                        backdropFilter: 'blur(10px) saturate(150%)',
                                    }}
                                >
                                    {React.cloneElement(getIcon(), {
                                        className: 'h-5 w-5 drop-shadow-sm',
                                    })}
                                </div>

                                {/* Clean text content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 space-y-1">
                                            {hasTitle && (
                                                <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                                                    {notification.title}
                                                </h3>
                                            )}
                                            {hasMessage && (
                                                <p
                                                    className={`text-gray-700 leading-relaxed line-clamp-2 ${
                                                        hasTitle ? 'text-xs' : 'text-sm font-medium'
                                                    }`}
                                                >
                                                    {notification.message}
                                                </p>
                                            )}
                                        </div>

                                        {/* Liquid Close Button for standard layout */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDismiss();
                                            }}
                                            className="flex-shrink-0 w-7 h-7 rounded-xl bg-white/60 hover:bg-white/80 active:bg-white/90 backdrop-blur-lg flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none hover:scale-110 active:scale-95 shadow-sm ring-1 ring-white/50 border border-white/60"
                                            title="Close"
                                            style={{
                                                backdropFilter: 'blur(12px) saturate(120%)',
                                            }}
                                        >
                                            <XMarkIcon className="h-3.5 w-3.5 text-gray-600" />
                                        </button>
                                    </div>

                                    {/* Liquid Priority Badge for standard layout */}
                                    {notification.priority && (
                                        <div className="mt-3">
                                            <span
                                                className={`inline-flex items-center px-3 py-1.5 rounded-2xl text-xs font-semibold backdrop-blur-xl shadow-lg ring-1 ring-white/30 border border-white/40 transition-all duration-300 ${
                                                    notification.priority === 'URGENT'
                                                        ? 'bg-gradient-to-r from-red-50/80 to-red-100/60 text-red-700 shadow-red-500/20'
                                                        : notification.priority === 'HIGH'
                                                        ? 'bg-gradient-to-r from-amber-50/80 to-amber-100/60 text-amber-700 shadow-amber-500/20'
                                                        : notification.priority === 'MEDIUM'
                                                        ? 'bg-gradient-to-r from-yellow-50/80 to-yellow-100/60 text-yellow-700 shadow-yellow-500/20'
                                                        : 'bg-gradient-to-r from-gray-50/80 to-gray-100/60 text-gray-700 shadow-gray-500/20'
                                                }`}
                                                style={{
                                                    backdropFilter: 'blur(16px) saturate(180%)',
                                                }}
                                            >
                                                {notification.priority}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Liquid Surface Bottom Reflection */}
                    <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                    <div className="absolute bottom-1 left-6 right-6 h-px bg-gradient-to-r from-transparent via-gray-200/15 to-transparent" />
                </div>
            </div>
        </Transition>
    );
};

interface ToastContainerProps {
    notifications: ToastNotification[];
    onDismiss: (id: string) => void;
    onMarkAsRead?: (notificationId: string) => void;
    position?: ToastPosition;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
    notifications,
    onDismiss,
    onMarkAsRead,
    position = 'top-right', // Default to top-right as requested
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Get positioning classes based on position prop
    const getPositionClasses = () => {
        switch (position) {
            case 'top-left':
                return 'top-4 left-4';
            case 'top-center':
                return 'top-4 left-1/2 -translate-x-1/2';
            case 'top-right':
                return 'top-4 right-4';
            case 'bottom-left':
                return 'bottom-4 left-4';
            case 'bottom-center':
                return 'bottom-4 left-1/2 -translate-x-1/2';
            case 'bottom-right':
                return 'bottom-4 right-4';
            default:
                return 'top-4 left-1/2 -translate-x-1/2'; // Default to top-center
        }
    };

    // Determine animation direction based on position
    const getAnimationDirection = () => {
        switch (position) {
            case 'top-left':
            case 'bottom-left':
                return { from: '-translate-x-full', to: 'translate-x-full' };
            case 'top-center':
            case 'bottom-center':
                return { from: '-translate-y-full', to: 'translate-y-full' };
            case 'top-right':
            case 'bottom-right':
            default:
                return { from: 'translate-x-full', to: 'translate-x-full' };
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] pointer-events-none">
            {/* Apple-style toast positioning with customizable location */}
            <div className={`absolute ${getPositionClasses()} flex flex-col gap-3 w-80 max-w-[calc(100vw-2rem)]`}>
                {notifications.map((notification, index) => (
                    <div
                        key={notification.id}
                        style={{
                            transform: `translateY(${index * 2}px) scale(${1 - index * 0.02})`,
                            zIndex: notifications.length - index,
                        }}
                        className="transition-all duration-300 ease-out"
                    >
                        <ToastItem
                            notification={notification}
                            onDismiss={onDismiss}
                            onMarkAsRead={onMarkAsRead}
                            animationDirection={getAnimationDirection()}
                        />
                    </div>
                ))}
            </div>
        </div>,
        document.body,
    );
};

export default ToastContainer;
