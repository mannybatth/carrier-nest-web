import React from 'react';
import { TruckIcon } from '@heroicons/react/24/outline';

const DriverInvoiceApprovalSkeleton: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Fixed Header Skeleton */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg shadow-black/5">
                <div className="px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between max-w-4xl mx-auto">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg animate-pulse flex-shrink-0"></div>
                            <div className="min-w-0 flex-1">
                                <div className="h-4 sm:h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse mb-1 w-3/4"></div>
                                <div className="h-3 sm:h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse w-1/2"></div>
                            </div>
                        </div>
                        <div className="w-20 h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full animate-pulse flex-shrink-0 ml-4"></div>
                    </div>
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="pt-14 sm:pt-16">
                <div className="max-w-4xl mx-auto px-3 py-4 space-y-4">
                    {/* Driver Information Card Skeleton */}
                    <div className="bg-white/70 backdrop-blur-xl mt-4 rounded-xl shadow-lg shadow-black/5 border border-white/50 p-4 animate-pulse">
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-4 w-1/3"></div>
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex-shrink-0"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-2 w-2/3"></div>
                                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-1 w-1/2"></div>
                                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3"></div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Summary Card Skeleton */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg shadow-black/5 border border-white/50 p-4 animate-pulse">
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-4 w-1/3"></div>
                        <div className="grid grid-cols-2 gap-3">
                            {[...Array(4)].map((_, i) => (
                                <div
                                    key={i}
                                    className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-3 border border-gray-200/50"
                                >
                                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-2 w-2/3"></div>
                                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Assignment Cards Skeleton */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg shadow-black/5 border border-white/50 p-4 animate-pulse">
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-4 w-1/2"></div>
                        <div className="space-y-3">
                            {[...Array(2)].map((_, i) => (
                                <div
                                    key={i}
                                    className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200/50"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/3"></div>
                                        <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/4"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4"></div>
                                        <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3"></div>
                                        <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                                        <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3"></div>
                                    </div>
                                    <div className="space-y-2">
                                        {[...Array(2)].map((_, j) => (
                                            <div key={j} className="flex items-center space-x-2">
                                                <div className="w-4 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex-shrink-0"></div>
                                                <div className="flex-1">
                                                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-1 w-full"></div>
                                                    <div className="h-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Line Items Card Skeleton */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg shadow-black/5 border border-white/50 p-4 animate-pulse">
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-4 w-1/3"></div>
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex justify-between items-center py-2">
                                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3"></div>
                                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/4"></div>
                                </div>
                            ))}
                            <div className="border-t border-gray-200 pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/4"></div>
                                    <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/3"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons Skeleton */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg shadow-black/5 border border-white/50 p-4 animate-pulse">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
                            <div className="flex-1 h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading Indicator */}
            <div className="fixed bottom-6 right-6 bg-white/90 backdrop-blur-xl rounded-full p-3 shadow-lg shadow-black/10 border border-white/50">
                <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600 font-medium">Loading invoice...</span>
                </div>
            </div>
        </div>
    );
};

export default DriverInvoiceApprovalSkeleton;
