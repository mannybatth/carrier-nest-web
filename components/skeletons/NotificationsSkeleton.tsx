import React from 'react';

const NotificationsSkeleton: React.FC = () => {
    return (
        <div className="bg-white/80 backdrop-blur-xl mx-3 md:mx-6 my-3 md:my-6 rounded-2xl border border-gray-200/60 overflow-hidden">
            {/* Header Skeleton */}
            <div className="hidden md:block px-6 py-4 border-b border-gray-200/60 bg-gray-50/50">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
            </div>

            {/* Notification Items Skeleton */}
            <div className="divide-y divide-gray-200/60">
                {[...Array(8)].map((_, index) => (
                    <div key={index} className="p-4 md:p-6 animate-pulse">
                        <div className="flex items-start gap-4">
                            {/* Selection checkbox skeleton */}
                            <div className="flex-shrink-0 mt-1">
                                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                            </div>

                            {/* Priority indicator skeleton */}
                            <div className="flex-shrink-0">
                                <div className="w-1 h-16 bg-gray-200 rounded-full"></div>
                            </div>

                            {/* Content area */}
                            <div className="flex-1 min-w-0 space-y-3">
                                {/* Header row */}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                                        <div className="w-2.5 h-2.5 bg-gray-200 rounded-full"></div>
                                    </div>
                                </div>

                                {/* Message content */}
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                                    <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                                </div>

                                {/* Tags and buttons row */}
                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 bg-gray-200 rounded-lg w-20"></div>
                                        <div className="h-6 bg-gray-200 rounded-lg w-24"></div>
                                    </div>
                                    <div className="h-8 bg-gray-200 rounded-lg w-20"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination skeleton */}
            <div className="px-6 py-4 border-t border-gray-200/60 bg-gray-50/50">
                <div className="flex items-center justify-between animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="flex items-center gap-2">
                        <div className="h-8 bg-gray-200 rounded w-8"></div>
                        <div className="h-8 bg-gray-200 rounded w-8"></div>
                        <div className="h-8 bg-gray-200 rounded w-8"></div>
                        <div className="h-8 bg-gray-200 rounded w-8"></div>
                        <div className="h-8 bg-gray-200 rounded w-8"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationsSkeleton;
