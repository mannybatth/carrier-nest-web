import React from 'react';

const SettingsPageSkeleton: React.FC = () => {
    return (
        <div className="flex flex-row pt-4">
            <div className="flex animate-pulse">
                <div className="flex-none block w-64 border-0">
                    <div className="flex-none px-4 sm:px-6 lg:px-1">
                        <ul role="list" className="flex gap-x-2 gap-y-1 whitespace-nowrap lg:flex-col">
                            <div className="flex">
                                <div className="flex-1">
                                    <div className="w-full h-10 rounded bg-slate-100"></div>
                                </div>
                            </div>
                            {/* <div className="flex">
                                <div className="flex-1">
                                    <div className="w-full h-10 rounded bg-slate-100"></div>
                                </div>
                            </div> */}
                            {/* <div className="flex">
                                <div className="flex-1">
                                    <div className="w-full h-10 rounded bg-slate-100"></div>
                                </div>
                            </div> */}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPageSkeleton;
