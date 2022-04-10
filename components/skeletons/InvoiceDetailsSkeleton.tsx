import React from 'react';

const InvoiceDetailsSkeleton: React.FC = () => {
    return (
        <>
            <div className="grid grid-cols-2 gap-2 mt-4 md:gap-6 animate-pulse">
                <aside className="col-span-2 overflow-y-auto bg-white border-gray-200 md:col-span-1">
                    <dl className="border-gray-200 divide-y divide-gray-200">
                        <div className="flex flex-col py-3 space-y-3 text-sm font-medium">
                            <dt className="text-gray-500">
                                <div className="block w-2/12 h-4 rounded bg-slate-200"></div>
                            </dt>
                            <dd className="space-y-1 text-gray-900">
                                <div className="block w-4/12 h-3 rounded bg-slate-200"></div>
                                <div className="block w-5/12 h-3 rounded bg-slate-200"></div>
                                <div className="block w-3/12 h-3 rounded bg-slate-200"></div>
                            </dd>
                        </div>
                    </dl>
                </aside>
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
                        </dl>
                    </div>
                </aside>
            </div>
            <div className="w-full">
                <div className="flex space-x-4 animate-pulse">
                    <div className="flex-1">
                        <div className="h-10 rounded bg-slate-200"></div>
                        <div className="divide-y divide-gray-200">
                            {[...Array(1)].map((_, i) => (
                                <div key={i} className="grid items-center grid-cols-12 gap-4 py-5">
                                    <div className="col-span-4 space-y-2">
                                        <div className="w-1/2 h-4 rounded bg-slate-200"></div>
                                    </div>
                                    <div className="col-span-4 space-y-2">
                                        <div className="w-1/2 h-4 rounded bg-slate-200"></div>
                                    </div>
                                    <div className="w-1/3 col-span-4 space-y-2 justify-self-end">
                                        <div className="h-4 rounded bg-slate-200"></div>
                                    </div>
                                </div>
                            ))}
                            <div className="grid items-center grid-cols-12 gap-4 py-5">
                                <div className="col-span-8 space-y-2"></div>
                                <div className="w-full col-span-2 space-y-2 justify-self-end">
                                    <div className="h-4 rounded bg-slate-200"></div>
                                </div>
                                <div className="w-1/2 col-span-2 space-y-2 justify-self-end">
                                    <div className="h-4 rounded bg-slate-200"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default InvoiceDetailsSkeleton;
