import React, { useState, lazy, Suspense } from 'react';

// Lazy load the LoadActivityLog component to improve initial page load
const LoadActivityLog = lazy(() => import('./LoadActivityLog'));

interface LoadActivitySectionProps {
    loadId: string;
    className?: string;
}

const LoadActivitySection: React.FC<LoadActivitySectionProps> = ({ loadId, className = '' }) => {
    const [showLoadActivity, setShowLoadActivity] = useState(false);

    return (
        <div className={`mt-2 ${className}`}>
            <div className="pb-2 cursor-pointer" onClick={() => setShowLoadActivity(!showLoadActivity)}>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">Load Activity</h3>
                    <button
                        className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        type="button"
                        aria-expanded={showLoadActivity}
                        aria-controls="load-activity-content"
                    >
                        {showLoadActivity ? (
                            <>
                                <span className="mr-1">Hide Activity</span>
                                <svg
                                    className="w-4 h-4 transform transition-transform"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 15l7-7 7 7"
                                    />
                                </svg>
                            </>
                        ) : (
                            <>
                                <span className="mr-1">Show Activity</span>
                                <svg
                                    className="w-4 h-4 transform transition-transform"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </>
                        )}
                    </button>
                </div>
                <p className="text-xs text-slate-500">All changes made on this load are listed below</p>
            </div>
            {showLoadActivity && (
                <div
                    id="load-activity-content"
                    className="w-full gap-1 bg-neutral-50 border border-slate-100 p-3 rounded-lg transition-all duration-200"
                >
                    <Suspense
                        fallback={
                            <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                                <svg
                                    className="animate-spin -ml-1 mr-3 h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Loading activity...
                            </div>
                        }
                    >
                        <LoadActivityLog loadId={loadId} />
                    </Suspense>
                </div>
            )}
        </div>
    );
};

export default React.memo(LoadActivitySection);
