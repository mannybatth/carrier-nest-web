import React from 'react';

const LoadDetailsSkeleton: React.FC = () => {
    return (
        <div className="relative max-w-7xl py-2 mx-auto animate-pulse">
            {/* Breadcrumb */}
            <div className="sm:px-6 md:px-8">
                <div className="hidden text-sm md:block">
                    <div className="flex items-center">
                        <div className="h-4 bg-slate-200 rounded w-12"></div>
                        <div className="w-4 h-4 mx-1 bg-slate-200 rounded"></div>
                        <div className="h-4 bg-slate-200 rounded w-16"></div>
                    </div>
                </div>
            </div>

            {/* Header with Title and Actions */}
            <div className="hidden px-5 mt-4 mb-3 md:block sm:px-6 md:px-8">
                <div className="flex">
                    <div className="h-8 bg-slate-200 rounded w-32 flex-1"></div>
                    <div className="h-8 bg-slate-200 rounded w-20"></div>
                </div>
                <div className="w-full mt-2 mb-1 border-t border-gray-300" />
            </div>

            {/* Toolbar */}
            <div className="px-5 py-2 mb-1 bg-white sm:px-6 md:px-8">
                <div className="flex items-center justify-between">
                    <div className="flex space-x-3">
                        <div className="h-8 bg-slate-200 rounded w-20"></div>
                        <div className="h-8 bg-slate-200 rounded w-24"></div>
                        <div className="h-8 bg-slate-200 rounded w-28"></div>
                    </div>
                    <div className="h-8 bg-slate-200 rounded w-32"></div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 gap-4 px-5 sm:gap-6 lg:gap-6 sm:px-6 md:px-8">
                {/* Load Details Info Section */}
                <div>
                    {/* Load Info Card */}
                    <div className="px-4 sm:px-6 mt-2 bg-gray-50 mb-6 rounded-xl overflow-hidden border border-gray-100">
                        {/* Header */}
                        <div className="p-0 py-4 pb-2 border-b border-gray-100">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <div className="h-6 bg-slate-200 rounded w-32 mb-2"></div>
                                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                                </div>
                                <div className="h-8 bg-slate-200 rounded-full w-20"></div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left column */}
                                <div className="space-y-4">
                                    {/* Customer */}
                                    <div>
                                        <div className="h-3 bg-slate-200 rounded w-16 mb-1"></div>
                                        <div className="h-4 bg-slate-200 rounded w-32"></div>
                                    </div>
                                    {/* Drivers */}
                                    <div>
                                        <div className="h-3 bg-slate-200 rounded w-12 mb-1"></div>
                                        <div className="h-4 bg-slate-200 rounded w-40"></div>
                                    </div>
                                    {/* Created */}
                                    <div>
                                        <div className="h-3 bg-slate-200 rounded w-14 mb-1"></div>
                                        <div className="h-4 bg-slate-200 rounded w-48"></div>
                                    </div>
                                </div>

                                {/* Right column */}
                                <div className="space-y-4">
                                    {/* Rate */}
                                    <div>
                                        <div className="h-3 bg-slate-200 rounded w-8 mb-1"></div>
                                        <div className="h-6 bg-slate-200 rounded w-24"></div>
                                    </div>
                                    {/* Invoice */}
                                    <div>
                                        <div className="h-3 bg-slate-200 rounded w-14 mb-1"></div>
                                        <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
                                        <div className="h-8 bg-slate-200 rounded w-32"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Documents Section */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
                            <div className="h-5 bg-slate-200 rounded w-24"></div>
                        </div>
                        <div className="px-4 sm:px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Document Type Cards */}
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                                        <div className="h-4 bg-slate-200 rounded w-16 mb-3"></div>
                                        <div className="h-3 bg-slate-200 rounded w-20 mb-2"></div>
                                        <div className="h-8 bg-slate-200 rounded w-full"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Route Section */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="h-5 bg-slate-200 rounded w-20"></div>
                            <div className="h-8 bg-slate-200 rounded w-32"></div>
                        </div>
                    </div>
                    <div className="px-4 sm:px-6 py-4">
                        {/* Route Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="text-center">
                                    <div className="h-3 bg-slate-200 rounded w-16 mx-auto mb-1"></div>
                                    <div className="h-5 bg-slate-200 rounded w-12 mx-auto"></div>
                                </div>
                            ))}
                        </div>

                        {/* Map placeholder */}
                        <div className="h-64 bg-slate-200 rounded-lg mb-4"></div>

                        {/* Route locations */}
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg"
                                >
                                    <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-slate-200 rounded w-32 mb-1"></div>
                                        <div className="h-3 bg-slate-200 rounded w-48"></div>
                                    </div>
                                    <div className="h-3 bg-slate-200 rounded w-20"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Assignments Section */}
                <div className="bg-white rounded-xl border-0 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b-0">
                        <div className="flex items-center justify-between">
                            <div className="h-6 bg-slate-200 rounded w-32"></div>
                            <div className="h-10 bg-slate-200 rounded-xl w-36"></div>
                        </div>
                    </div>
                    <div className="px-6 pb-6">
                        <div className="space-y-8">
                            {[1, 2].map((i) => (
                                <div key={i} className="bg-white rounded-2xl shadow-sm">
                                    {/* Assignment Header */}
                                    <div className="px-6 py-5 bg-white">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
                                                <div>
                                                    <div className="h-5 bg-slate-200 rounded w-32 mb-2"></div>
                                                    <div className="h-3 bg-slate-200 rounded w-40"></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <div className="h-8 bg-slate-200 rounded-full w-20"></div>
                                                <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Main Content - Two Column Layout */}
                                    <div className="px-6 py-5">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Left Column - Route Details */}
                                            <div className="space-y-6">
                                                {/* Route Stops */}
                                                <div>
                                                    <div className="h-4 bg-slate-200 rounded w-24 mb-4"></div>
                                                    <div className="space-y-4">
                                                        {[1, 2, 3].map((j) => (
                                                            <div key={j} className="flex items-start space-x-4">
                                                                <div className="h-10 w-10 bg-slate-200 rounded-xl mt-1"></div>
                                                                <div className="flex-1">
                                                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <div className="h-4 bg-slate-200 rounded w-36"></div>
                                                                            <div className="h-7 w-7 bg-slate-200 rounded-lg"></div>
                                                                        </div>
                                                                        <div className="h-4 bg-slate-200 rounded w-32 mb-1"></div>
                                                                        <div className="h-3 bg-slate-200 rounded w-52 mb-1"></div>
                                                                        <div className="h-3 bg-slate-200 rounded w-40"></div>
                                                                        {j === 1 && (
                                                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                                                <div className="h-3 bg-slate-200 rounded w-32 mb-1"></div>
                                                                                <div className="h-3 bg-slate-200 rounded w-28"></div>
                                                                            </div>
                                                                        )}
                                                                        {j === 3 && (
                                                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                                                <div className="h-3 bg-slate-200 rounded w-36 mb-1"></div>
                                                                                <div className="h-3 bg-slate-200 rounded w-32"></div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column - Drivers, Payment, Instructions */}
                                            <div className="space-y-6">
                                                {/* Distance and Duration Overview */}
                                                <div className="bg-gray-50/50 rounded-2xl p-5">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
                                                            <div>
                                                                <div className="h-3 bg-slate-200 rounded w-14 mb-1"></div>
                                                                <div className="h-4 bg-slate-200 rounded w-16"></div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-3">
                                                            <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
                                                            <div>
                                                                <div className="h-3 bg-slate-200 rounded w-16 mb-1"></div>
                                                                <div className="h-4 bg-slate-200 rounded w-12"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Assigned Drivers */}
                                                <div>
                                                    <div className="h-4 bg-slate-200 rounded w-32 mb-4"></div>
                                                    <div className="space-y-3">
                                                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="h-12 w-12 bg-slate-200 rounded-xl"></div>
                                                                    <div>
                                                                        <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                                                                        <div className="h-3 bg-slate-200 rounded w-32"></div>
                                                                    </div>
                                                                </div>
                                                                <div className="h-7 bg-slate-200 rounded-xl w-20"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Instructions */}
                                                <div>
                                                    <div className="h-4 bg-slate-200 rounded w-24 mb-4"></div>
                                                    <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100">
                                                        <div className="flex items-start space-x-3">
                                                            <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
                                                            <div className="flex-1">
                                                                <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                                                                <div className="h-3 bg-slate-200 rounded w-4/5"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>{' '}
                {/* Activity Section */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
                        <div className="h-5 bg-slate-200 rounded w-20"></div>
                    </div>
                    <div className="px-4 sm:px-6 py-4">
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex space-x-4">
                                    <div className="w-8 h-8 bg-slate-200 rounded-full flex-shrink-0"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-slate-200 rounded w-40 mb-2"></div>
                                        <div className="h-3 bg-slate-200 rounded w-32 mb-1"></div>
                                        <div className="h-3 bg-slate-200 rounded w-24"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadDetailsSkeleton;
