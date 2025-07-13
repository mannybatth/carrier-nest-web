import React from 'react';

const CustomerEditSkeleton: React.FC = () => {
    // Modern skeleton styles consistent with the form design
    const skeletonBaseStyles = 'animate-pulse bg-gray-200 rounded';
    const cardStyles = 'bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm';
    const sectionHeaderStyles = 'flex items-start gap-3 mb-4 sm:mb-6';

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Customer Name Section */}
            <div className={cardStyles}>
                <div className="space-y-4">
                    {/* Label */}
                    <div className="flex items-center gap-2">
                        <div className={`${skeletonBaseStyles} w-4 h-4`} />
                        <div className={`${skeletonBaseStyles} h-4 w-32`} />
                    </div>

                    {/* Input field */}
                    <div className={`${skeletonBaseStyles} h-12 w-full rounded-lg`} />
                </div>
            </div>

            {/* Contact Information Section */}
            <div className={cardStyles}>
                <div className={sectionHeaderStyles}>
                    <div className={`${skeletonBaseStyles} w-8 h-8 rounded-lg`} />
                    <div className="space-y-2 flex-1">
                        <div className={`${skeletonBaseStyles} h-6 w-40`} />
                        <div className={`${skeletonBaseStyles} h-4 w-56`} />
                    </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                    {/* Contact Email */}
                    <div className="space-y-2">
                        <div className={`${skeletonBaseStyles} h-4 w-24`} />
                        <div className={`${skeletonBaseStyles} h-12 w-full rounded-lg`} />
                    </div>

                    {/* Billing and Payment Status Emails */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                            <div className={`${skeletonBaseStyles} h-4 w-20`} />
                            <div className={`${skeletonBaseStyles} h-12 w-full rounded-lg`} />
                        </div>
                        <div className="space-y-2">
                            <div className={`${skeletonBaseStyles} h-4 w-32`} />
                            <div className={`${skeletonBaseStyles} h-12 w-full rounded-lg`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Address Information Section */}
            <div className={cardStyles}>
                <div className={sectionHeaderStyles}>
                    <div className={`${skeletonBaseStyles} w-8 h-8 rounded-lg`} />
                    <div className="space-y-2 flex-1">
                        <div className={`${skeletonBaseStyles} h-6 w-36`} />
                        <div className={`${skeletonBaseStyles} h-4 w-48`} />
                    </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                    {/* Street Address */}
                    <div className="space-y-2">
                        <div className={`${skeletonBaseStyles} h-4 w-24`} />
                        <div className={`${skeletonBaseStyles} h-12 w-full rounded-lg`} />
                    </div>

                    {/* City and State */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                            <div className={`${skeletonBaseStyles} h-4 w-12`} />
                            <div className={`${skeletonBaseStyles} h-12 w-full rounded-lg`} />
                        </div>
                        <div className="space-y-2">
                            <div className={`${skeletonBaseStyles} h-4 w-20`} />
                            <div className={`${skeletonBaseStyles} h-12 w-full rounded-lg`} />
                        </div>
                    </div>

                    {/* Zip and Country */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                            <div className={`${skeletonBaseStyles} h-4 w-16`} />
                            <div className={`${skeletonBaseStyles} h-12 w-full rounded-lg`} />
                        </div>
                        <div className="space-y-2">
                            <div className={`${skeletonBaseStyles} h-4 w-16`} />
                            <div className={`${skeletonBaseStyles} h-12 w-full rounded-lg`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200 rounded-lg">
                <div className="flex-1"></div>
                <div className={`${skeletonBaseStyles} h-10 w-32 rounded-md`} />
            </div>
        </div>
    );
};

export default CustomerEditSkeleton;
