import React from 'react';

const BillingPageSkeleton: React.FC = () => {
    return (
        <div className="px-5 sm:px-6 md:px-8 animate-pulse">
            <div className="max-w-3xl pb-6">
                {/* Subscription Details Skeleton */}
                <div className="mb-8 overflow-hidden bg-white border border-gray-200 rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="w-40 h-6 rounded bg-slate-200"></div>
                        <div className="mt-5 space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex justify-between">
                                    <div className="w-24 h-4 rounded bg-slate-200"></div>
                                    <div className="w-32 h-4 rounded bg-slate-200"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pricing Plans Skeleton */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="p-6 border-2 border-gray-200 rounded-lg">
                            <div className="space-y-4">
                                <div>
                                    <div className="w-32 h-6 rounded bg-slate-200"></div>
                                    <div className="w-24 h-4 mt-1 rounded bg-slate-200"></div>
                                </div>
                                <div className="flex items-baseline">
                                    <div className="w-20 h-8 rounded bg-slate-200"></div>
                                </div>
                                <div className="w-full h-10 rounded-lg bg-slate-200"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BillingPageSkeleton;
