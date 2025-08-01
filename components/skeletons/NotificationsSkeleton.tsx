import React from 'react';

const NotificationsSkeleton: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* iPad-like centered layout container */}
            <div className="mx-auto max-w-4xl px-3 md:px-6">
                <div className="my-3 md:my-6">
                    {/* Select All Header Skeleton - seamless */}
                    <div className="hidden md:block px-6 py-4 animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-4 bg-gray-200/80 rounded"></div>
                            <div className="h-4 bg-gray-200/80 rounded w-64"></div>
                            <div className="h-3 bg-gray-200/60 rounded w-32"></div>
                        </div>
                    </div>

                    {/* Mobile Select All Header Skeleton - seamless */}
                    <div className="md:hidden px-4 py-3 animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-4 bg-gray-200/80 rounded"></div>
                            <div className="h-4 bg-gray-200/80 rounded w-32"></div>
                            <div className="h-3 bg-gray-200/60 rounded w-20 ml-auto"></div>
                        </div>
                    </div>

                    {/* Modern notification cards skeleton with compact elegant design */}
                    <div className="space-y-2 px-4 md:px-6 py-3">
                        {[...Array(6)].map((_, index) => (
                            <div
                                key={index}
                                className="relative rounded-2xl overflow-hidden bg-white/90 animate-pulse"
                                style={{
                                    border: '1px solid rgba(229, 231, 235, 0.3)',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
                                    backdropFilter: 'blur(8px) saturate(120%)',
                                    WebkitBackdropFilter: 'blur(8px) saturate(120%)',
                                }}
                            >
                                {/* Unread indicator stripe skeleton */}
                                {index < 3 && (
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-200 rounded-l-2xl"
                                        style={{
                                            background:
                                                'linear-gradient(to bottom, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.3))',
                                        }}
                                    />
                                )}

                                {/* Content area */}
                                <div className="flex items-start gap-3 p-3 md:p-4">
                                    {/* Modern checkbox skeleton */}
                                    <div className="flex items-center pt-0.5">
                                        <div className="h-3.5 w-3.5 bg-gray-200/80 rounded shadow-sm"></div>
                                    </div>

                                    {/* Notification content skeleton */}
                                    <div className="flex-1 min-w-0">
                                        {/* Header with title and status */}
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 min-w-0 pr-3">
                                                <div
                                                    className="h-4 md:h-5 bg-gray-200/90 rounded mb-1"
                                                    style={{
                                                        width: `${60 + index * 10}%`,
                                                        fontFamily:
                                                            '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                                                    }}
                                                ></div>
                                            </div>

                                            {/* Status and timestamp skeleton */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <div
                                                    className="h-3 bg-gray-200/70 rounded"
                                                    style={{
                                                        width: '3rem',
                                                        fontFamily:
                                                            '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                                    }}
                                                ></div>
                                                {index < 3 ? (
                                                    <div
                                                        className="w-2 h-2 bg-blue-200 rounded-full"
                                                        style={{
                                                            boxShadow: '0 0 4px rgba(59, 130, 246, 0.3)',
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="bg-green-50/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                        <div className="w-2.5 h-2.5 bg-green-200/80 rounded-full"></div>
                                                        <div className="h-2 w-8 bg-green-200/80 rounded"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Message content skeleton */}
                                        <div className="mb-2 space-y-1">
                                            <div
                                                className="h-3 md:h-4 bg-gray-200/80 rounded"
                                                style={{
                                                    width: '95%',
                                                    fontFamily:
                                                        '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                                }}
                                            ></div>
                                            <div
                                                className="h-3 md:h-4 bg-gray-200/80 rounded"
                                                style={{
                                                    width: `${70 + index * 5}%`,
                                                    fontFamily:
                                                        '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                                }}
                                            ></div>
                                        </div>

                                        {/* Modern badges skeleton */}
                                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                            <div
                                                className="h-6 bg-gray-50/80 border border-gray-200/50 rounded-full backdrop-blur-sm"
                                                style={{
                                                    width: '5rem',
                                                    fontFamily:
                                                        '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                                }}
                                            ></div>

                                            {index % 3 !== 0 && (
                                                <div
                                                    className={`h-6 rounded-full border backdrop-blur-sm ${
                                                        index % 3 === 1
                                                            ? 'bg-red-50/80 border-red-200/50'
                                                            : 'bg-orange-50/80 border-orange-200/50'
                                                    }`}
                                                    style={{
                                                        width: index % 3 === 1 ? '3.5rem' : '2.5rem',
                                                        fontFamily:
                                                            '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                                    }}
                                                ></div>
                                            )}
                                        </div>

                                        {/* Type description skeleton */}
                                        <div
                                            className="h-3 bg-gray-200/60 rounded"
                                            style={{
                                                width: `${50 + index * 8}%`,
                                                fontFamily:
                                                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination skeleton - seamless footer */}
                    <div className="px-4 md:px-6 py-3 md:py-4">
                        {/* Desktop Pagination Skeleton */}
                        <div className="hidden md:flex items-center justify-between animate-pulse">
                            <div className="h-4 bg-gray-200/80 rounded w-48"></div>
                            <div className="flex items-center gap-2">
                                <div
                                    className="p-2 rounded-xl bg-white/60 h-10 w-10"
                                    style={{
                                        background: `
                                            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%),
                                            linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)
                                        `,
                                        backdropFilter: 'blur(12px) saturate(150%)',
                                        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                    }}
                                ></div>
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-8 h-8 rounded-lg ${
                                                i === 2 ? 'bg-blue-200' : 'bg-gray-200/80'
                                            }`}
                                            style={
                                                i === 2
                                                    ? {
                                                          background: `
                                                    linear-gradient(135deg, rgba(59, 130, 246, 0.6) 0%, rgba(99, 102, 241, 0.5) 50%, rgba(139, 92, 246, 0.4) 100%)
                                                `,
                                                      }
                                                    : {
                                                          background: `
                                                    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%),
                                                    linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)
                                                `,
                                                          backdropFilter: 'blur(12px) saturate(150%)',
                                                          WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                                                          border: '1px solid rgba(255, 255, 255, 0.4)',
                                                      }
                                            }
                                        ></div>
                                    ))}
                                </div>
                                <div
                                    className="p-2 rounded-xl bg-white/60 h-10 w-10"
                                    style={{
                                        background: `
                                            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%),
                                            linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)
                                        `,
                                        backdropFilter: 'blur(12px) saturate(150%)',
                                        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Mobile Pagination Skeleton */}
                        <div className="md:hidden animate-pulse">
                            <div className="h-3 bg-gray-200/80 rounded w-32 mx-auto mb-3"></div>
                            <div className="flex items-center justify-center gap-3">
                                <div
                                    className="h-10 w-20 rounded-xl bg-white/60"
                                    style={{
                                        background: `
                                            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%),
                                            linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)
                                        `,
                                        backdropFilter: 'blur(12px) saturate(150%)',
                                        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                    }}
                                ></div>
                                <div
                                    className="h-10 w-8 rounded-xl text-white"
                                    style={{
                                        background: `
                                            linear-gradient(135deg, rgba(59, 130, 246, 0.6) 0%, rgba(99, 102, 241, 0.5) 50%, rgba(139, 92, 246, 0.4) 100%)
                                        `,
                                    }}
                                ></div>
                                <div
                                    className="h-10 w-16 rounded-xl bg-white/60"
                                    style={{
                                        background: `
                                            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%),
                                            linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)
                                        `,
                                        backdropFilter: 'blur(12px) saturate(150%)',
                                        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationsSkeleton;
