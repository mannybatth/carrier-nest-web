import React from 'react';

const DriverEditSkeleton: React.FC = () => {
    // Modern skeleton styles consistent with Apple design principles
    const skeletonBaseStyles = 'animate-pulse bg-gray-200 rounded-xl';
    const cardStyles = 'bg-white rounded-3xl border-2 border-gray-200 p-8 shadow-xl';
    const inputStyles = 'h-16 w-full rounded-2xl';
    const labelStyles = 'h-4 w-24';
    const descriptionStyles = 'h-3 w-48';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
            <div className="max-w-4xl py-6 mx-auto px-4 sm:px-6 lg:px-8">
                {/* Breadcrumb Skeleton */}
                <div className="mb-6">
                    <div className="flex items-center space-x-2">
                        <div className={`${skeletonBaseStyles} h-4 w-16`} />
                        <div className={`${skeletonBaseStyles} h-4 w-4 rounded-full`} />
                        <div className={`${skeletonBaseStyles} h-4 w-24`} />
                        <div className={`${skeletonBaseStyles} h-4 w-4 rounded-full`} />
                        <div className={`${skeletonBaseStyles} h-4 w-20`} />
                    </div>
                </div>

                {/* Page Header Skeleton */}
                <div className="mb-8 space-y-3">
                    <div className={`${skeletonBaseStyles} h-9 w-40`} />
                    <div className={`${skeletonBaseStyles} h-5 w-96`} />
                </div>

                <div className="space-y-6">
                    {/* Personal Information Section */}
                    <div className={cardStyles}>
                        <div className="mb-8 space-y-3">
                            <div className={`${skeletonBaseStyles} h-7 w-48`} />
                            <div className={`${skeletonBaseStyles} h-5 w-80`} />
                        </div>

                        <div className="space-y-6">
                            {/* Full Name Field */}
                            <div className="space-y-3">
                                <div className={`${skeletonBaseStyles} ${labelStyles}`} />
                                <div className={`${skeletonBaseStyles} ${descriptionStyles}`} />
                                <div className={`${skeletonBaseStyles} ${inputStyles}`} />
                            </div>

                            {/* Email and Phone Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className={`${skeletonBaseStyles} ${labelStyles}`} />
                                    <div className={`${skeletonBaseStyles} ${descriptionStyles}`} />
                                    <div className={`${skeletonBaseStyles} ${inputStyles}`} />
                                </div>
                                <div className="space-y-3">
                                    <div className={`${skeletonBaseStyles} ${labelStyles}`} />
                                    <div className={`${skeletonBaseStyles} ${descriptionStyles}`} />
                                    <div className={`${skeletonBaseStyles} ${inputStyles}`} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Default Pay Configuration Section */}
                    <div className={cardStyles}>
                        <div className="mb-8 space-y-3">
                            <div className={`${skeletonBaseStyles} h-7 w-56`} />
                            <div className={`${skeletonBaseStyles} h-5 w-96`} />
                        </div>

                        <div className="space-y-6">
                            {/* Pay Type Dropdown */}
                            <div className="space-y-3">
                                <div className={`${skeletonBaseStyles} ${labelStyles}`} />
                                <div className={`${skeletonBaseStyles} ${descriptionStyles}`} />
                                <div className={`${skeletonBaseStyles} ${inputStyles}`} />
                            </div>

                            {/* Rate Fields Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[...Array(4)].map((_, index) => (
                                    <div key={index} className="space-y-3">
                                        <div className={`${skeletonBaseStyles} ${labelStyles}`} />
                                        <div className={`${skeletonBaseStyles} ${descriptionStyles}`} />
                                        <div className={`${skeletonBaseStyles} ${inputStyles}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Pay Configuration Tips Section */}
                    <div className="bg-gray-50 rounded-3xl border-2 border-gray-200 p-4 shadow-lg">
                        <div className="space-y-2">
                            <div className={`${skeletonBaseStyles} h-5 w-48`} />
                            {[...Array(4)].map((_, index) => (
                                <div key={index} className="flex items-start space-x-2">
                                    <div className={`${skeletonBaseStyles} w-2 h-2 rounded-full mt-2`} />
                                    <div className={`${skeletonBaseStyles} h-3 w-${32 + index * 8}`} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Save Button Section */}
                    <div className={cardStyles}>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex-1 space-y-3">
                                <div className={`${skeletonBaseStyles} h-6 w-40`} />
                                <div className={`${skeletonBaseStyles} h-5 w-72`} />
                            </div>
                            <div className="flex gap-4">
                                <div className={`${skeletonBaseStyles} h-14 w-24 rounded-2xl`} />
                                <div className={`${skeletonBaseStyles} h-14 w-32 rounded-2xl`} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverEditSkeleton;
