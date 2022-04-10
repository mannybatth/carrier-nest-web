import React from 'react';

const AccountingStatsSkeleton: React.FC = () => {
    return (
        <dl className="grid grid-cols-1 gap-5 mt-5 sm:grid-cols-3 animate-pulse">
            <div className="px-4 py-2 overflow-hidden bg-white rounded-lg shadow sm:py-5">
                <dt className="text-sm font-medium text-gray-500 truncate">
                    <div className="w-1/2 h-4 rounded bg-slate-200"></div>
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    <div className="w-1/3 h-8 rounded bg-slate-200"></div>
                </dd>
            </div>
            <div className="px-4 py-2 overflow-hidden bg-white rounded-lg shadow sm:py-5">
                <dt className="text-sm font-medium text-gray-500 truncate">
                    <div className="w-1/2 h-4 rounded bg-slate-200"></div>
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    <div className="w-1/3 h-8 rounded bg-slate-200"></div>
                </dd>
            </div>
            <div className="px-4 py-2 overflow-hidden bg-white rounded-lg shadow sm:py-5">
                <dt className="text-sm font-medium text-gray-500 truncate">
                    <div className="w-1/2 h-4 rounded bg-slate-200"></div>
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    <div className="w-1/3 h-8 rounded bg-slate-200"></div>
                </dd>
            </div>
        </dl>
    );
};

export default AccountingStatsSkeleton;
