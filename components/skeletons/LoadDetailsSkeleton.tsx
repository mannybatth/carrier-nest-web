import React from 'react';

const LoadDetailsSkeleton: React.FC = () => {
    return (
        <>
            <div className="col-span-8 sm:col-span-3 md:col-span-8 lg:col-span-3 animate-pulse">
                <aside className="bg-white border-gray-200">
                    <div className="pb-0 space-y-6 lg:pb-10">
                        <dl className="border-gray-200 divide-y divide-gray-200">
                            <div className="flex justify-between py-4 text-sm font-medium">
                                <div className="block w-1/2 h-3 rounded bg-slate-200"></div>
                                <div className="block w-3/12 h-3 rounded bg-slate-200"></div>
                            </div>
                            <div className="flex justify-between py-4 text-sm font-medium">
                                <div className="block w-4/12 h-3 rounded bg-slate-200"></div>
                                <div className="block w-1/3 h-3 rounded bg-slate-200"></div>
                            </div>
                            <div className="flex justify-between py-4 text-sm font-medium">
                                <div className="block w-5/12 h-3 rounded bg-slate-200"></div>
                                <div className="block w-1/3 h-3 rounded bg-slate-200"></div>
                            </div>
                            <div className="flex justify-between py-4 text-sm font-medium">
                                <div className="block w-3/12 h-3 rounded bg-slate-200"></div>
                                <div className="block w-1/3 h-3 rounded bg-slate-200"></div>
                            </div>
                            <div className="flex justify-between py-4 text-sm font-medium">
                                <div className="block w-2/12 h-3 rounded bg-slate-200"></div>
                                <div className="block w-2/12 h-3 rounded bg-slate-200"></div>
                            </div>
                            <div className="flex justify-between py-4 text-sm font-medium">
                                <div className="block w-3/12 h-3 rounded bg-slate-200"></div>
                                <div className="block w-1/3 h-3 rounded bg-slate-200"></div>
                            </div>
                            <div className="flex justify-between py-4 text-sm font-medium">
                                <div className="block w-5/12 h-3 rounded bg-slate-200"></div>
                                <div className="block w-1/3 h-3 rounded bg-slate-200"></div>
                            </div>
                        </dl>
                    </div>
                </aside>
            </div>

            <div className="col-span-8 sm:col-span-5 md:col-span-8 lg:col-span-5">
                <div className="flex flex-col mt-4 ml-1 space-y-6 animate-pulse">
                    <div className="flex space-x-4">
                        <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                        <div className="w-48 py-1 space-y-3">
                            <div className="h-5 rounded bg-slate-200"></div>
                            <div className="space-y-2">
                                <div className="w-7/12 h-2 rounded bg-slate-200"></div>
                                <div className="h-2 rounded bg-slate-200"></div>
                                <div className="h-2 rounded bg-slate-200"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex space-x-4">
                        <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                        <div className="w-48 py-1 space-y-3">
                            <div className="h-5 rounded bg-slate-200"></div>
                            <div className="space-y-2">
                                <div className="w-7/12 h-2 rounded bg-slate-200"></div>
                                <div className="h-2 rounded bg-slate-200"></div>
                                <div className="h-2 rounded bg-slate-200"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoadDetailsSkeleton;
