import React from 'react';

const CustomerDetailsSkeleton: React.FC = () => {
    return (
        <div className="col-span-12 animate-pulse">
            <div role="list" className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ">
                        <div className="h-2 rounded bg-slate-200"></div>
                    </div>
                    <div className="flex-1 ml-3 space-y-1">
                        <div className="w-full h-3 rounded bg-slate-200"></div>
                        <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                    </div>
                </div>
                <div className="flex">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ">
                        <div className="h-2 rounded bg-slate-200"></div>
                    </div>
                    <div className="flex-1 ml-3 space-y-1">
                        <div className="w-full h-3 rounded bg-slate-200"></div>
                        <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                    </div>
                </div>
                <div className="flex">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ">
                        <div className="h-2 rounded bg-slate-200"></div>
                    </div>
                    <div className="flex-1 ml-3 space-y-1">
                        <div className="w-full h-3 rounded bg-slate-200"></div>
                        <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                    </div>
                </div>
                <div className="flex">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ">
                        <div className="h-2 rounded bg-slate-200"></div>
                    </div>
                    <div className="flex-1 ml-3 space-y-1">
                        <div className="w-full h-3 rounded bg-slate-200"></div>
                        <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                    </div>
                </div>
                <div className="flex">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ">
                        <div className="h-2 rounded bg-slate-200"></div>
                    </div>
                    <div className="flex-1 ml-3 space-y-1">
                        <div className="w-full h-3 rounded bg-slate-200"></div>
                        <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerDetailsSkeleton;
