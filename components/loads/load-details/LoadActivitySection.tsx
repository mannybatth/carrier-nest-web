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
        <div
            className={`bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100/50 backdrop-blur-sm ${className}`}
        >
            <div
                className="px-6 py-6 border-b border-gray-100/80 bg-gradient-to-r from-gray-50/50 to-white cursor-pointer"
                onClick={() => setShowLoadActivity(!showLoadActivity)}
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Load Activity</h3>
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
                <p className="text-sm text-gray-500 mt-1">All changes made on this load are listed below</p>
            </div>
            {showLoadActivity && (
                <div id="load-activity-content" className="px-6 py-6 bg-gray-50/30">
                    <Suspense
                        fallback={
                            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                                <svg
                                    className="animate-spin -ml-1 mr-3 h-5 w-5"
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
