import React from 'react';

const BillingPageSkeleton: React.FC = () => {
    return (
        <div className="px-5 sm:px-6 md:px-8">
            <div className="max-w-7xl pb-6">
                {/* Subscription Details Skeleton */}
                <div className="mb-8 h-48 w-full rounded-lg bg-gray-200 animate-pulse" />

                {/* Plans Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Plan Card Skeleton */}
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 animate-pulse">
                        <div className="h-8 w-2/4 rounded bg-gray-300 mx-auto" />
                        <div className="h-6 w-1/4 rounded bg-gray-300 mx-auto mt-2" />
                        <div className="h-4 w-3/4 rounded bg-gray-300 mx-auto mt-4" />
                        <div className="mt-8 space-y-4">
                            <div className="h-5 w-full rounded bg-gray-300" />
                            <div className="h-5 w-full rounded bg-gray-300" />
                            <div className="h-5 w-full rounded bg-gray-300" />
                            <div className="h-5 w-full rounded bg-gray-300" />
                        </div>
                        <div className="mt-8 h-12 w-full rounded-lg bg-gray-300" />
                    </div>
                    {/* Plan Card Skeleton */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 animate-pulse">
                        <div className="h-8 w-2/4 rounded bg-gray-300 mx-auto" />
                        <div className="h-6 w-1/4 rounded bg-gray-300 mx-auto mt-2" />
                        <div className="h-4 w-3/4 rounded bg-gray-300 mx-auto mt-4" />
                        <div className="mt-8 space-y-4">
                            <div className="h-5 w-full rounded bg-gray-300" />
                            <div className="h-5 w-full rounded bg-gray-300" />
                            <div className="h-5 w-full rounded bg-gray-300" />
                            <div className="h-5 w-full rounded bg-gray-300" />
                        </div>
                        <div className="mt-8 h-12 w-full rounded-lg bg-gray-300" />
                    </div>
                </div>

                {/* Billing History Skeleton */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 animate-pulse">
                    <div className="h-8 w-1/3 rounded bg-gray-300" />
                    <div className="h-4 w-1/2 rounded bg-gray-300 mt-2" />
                    <div className="mt-6">
                        <div className="h-10 w-full rounded-t-lg bg-gray-50" />
                        <div className="space-y-2 p-4">
                            <div className="h-8 w-full rounded bg-gray-200" />
                            <div className="h-8 w-full rounded bg-gray-200" />
                            <div className="h-8 w-full rounded bg-gray-200" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingPageSkeleton;
