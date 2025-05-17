import React, { useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function PricingTable() {
    const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro'>('pro');
    const [isCopied, setIsCopied] = useState(false);

    const features = [
        { name: 'Number of Drivers', basic: '1', pro: 'Unlimited' },
        { name: 'Load Imports', basic: '30 loads total', pro: 'Unlimited' },
        { name: 'AI RateCon PDF Imports', basic: '10 loads/month', pro: 'Unlimited' },
        { name: 'Storage Capacity', basic: '100MB', pro: '5GB' },
        { name: 'Driver Mobile App', basic: true, pro: true },
        { name: 'Priority Support', basic: false, pro: true },
    ];

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).catch((err) => {
            console.error('Failed to copy: ', err);
        });
    };

    const handleClaimOffer = () => {
        navigator.clipboard
            .writeText('50OFFVALUE')
            .then(() => {
                setIsCopied(true);
                // Navigate to sign in page after showing feedback
                setTimeout(() => {
                    window.location.href = '/auth/signin';
                }, 1500);
            })
            .catch((err) => {
                console.error('Failed to copy: ', err);
            });
    };

    return (
        <div className="w-full max-w-7xl mx-auto sm:px-4 py-8">
            {/* Limited Time Offer - Mobile */}
            <div className="block md:hidden mb-8">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                Limited Time
                            </span>
                            <span className="text-sm font-medium text-blue-600">Special Offer</span>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Get 50% off for 6 months</h3>

                        <p className="text-sm text-gray-600 mb-4">
                            Sign up today and save up to <span className="font-semibold">$9.50 per driver</span> with
                            our special introductory offer. Upgrade now to unlock all Pro features at half the price.
                        </p>

                        <div className="bg-white border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-medium text-gray-500">Use promo code</span>
                                <p className="text-base font-mono font-bold text-gray-900">50OFFVALUE</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard('50OFFVALUE')}
                                className="text-sm text-blue-600 font-medium"
                            >
                                Copy
                            </button>
                        </div>

                        <button
                            onClick={handleClaimOffer}
                            disabled={isCopied}
                            className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                                isCopied ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            {isCopied ? 'Code Copied! Redirecting...' : 'Claim Your Discount'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Limited Time Offer - Desktop */}
            <div className="hidden md:block mb-8">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl overflow-hidden">
                    <div className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="max-w-xl">
                                <div className="flex items-center space-x-2 mb-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                        Limited Time
                                    </span>
                                    <span className="text-sm font-medium text-blue-600">Special Offer</span>
                                </div>

                                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                                    Get 50% off for your first 6 months
                                </h3>

                                <p className="text-sm text-gray-600">
                                    Take your logistics operation to the next level while saving up to{' '}
                                    <span className="font-semibold">$9.50 per driver</span> with our special
                                    introductory offer. Upgrade now to unlock all Pro features at half the price and
                                    experience the full power of our platform.
                                </p>
                            </div>

                            <div className="bg-white border border-blue-200 rounded-lg p-4 flex flex-col items-center">
                                <span className="text-xs font-medium text-gray-500 mb-1">Use promo code</span>
                                <p className="text-lg font-mono font-bold text-gray-900 mb-2">50OFFVALUE</p>
                                <button
                                    onClick={() => copyToClipboard('50OFFVALUE')}
                                    className="text-sm text-blue-600 font-medium"
                                >
                                    Copy Code
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleClaimOffer}
                                disabled={isCopied}
                                className={`py-3 px-6 rounded-xl font-medium text-sm transition-all ${
                                    isCopied ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                            >
                                {isCopied ? 'Code Copied! Redirecting...' : 'Claim Your Discount'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Mobile View (default) and Desktop View (md:) using responsive classes */}
            <div className="block md:hidden space-y-6">
                {/* Mobile Plan Selector */}
                <div className="flex rounded-xl bg-gray-100 p-1">
                    <button
                        onClick={() => setSelectedPlan('basic')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                            selectedPlan === 'basic' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                        }`}
                    >
                        Basic Plan
                    </button>
                    <button
                        onClick={() => setSelectedPlan('pro')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                            selectedPlan === 'pro' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                        }`}
                    >
                        Pro Plan
                    </button>
                </div>

                {/* Mobile Plan Details */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-900">
                                {selectedPlan === 'basic' ? 'Basic Plan' : 'Pro Plan'}
                            </h3>
                            {selectedPlan === 'pro' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Recommended
                                </span>
                            )}
                        </div>
                        <div className="mt-1">
                            {selectedPlan === 'basic' ? (
                                <p className="text-gray-500">Free</p>
                            ) : (
                                <div className="flex flex-col items-center space-y-2">
                                    <span className="text-xs font-medium text-gray-400 line-through">
                                        $19/month per driver
                                    </span>
                                    <div className="flex items-center">
                                        <span className="text-lg font-bold text-blue-600">$9.50</span>
                                        <span className="text-sm text-gray-600 ml-1">/month per driver</span>
                                    </div>
                                    <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded">
                                        50% OFF
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 space-y-4">
                            {features.map((feature, index) => (
                                <div key={index} className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">{feature.name}</span>
                                    <span className="text-sm text-gray-600">
                                        {typeof feature[selectedPlan] === 'boolean' ? (
                                            feature[selectedPlan] ? (
                                                <CheckIcon className="h-5 w-5 text-blue-500" />
                                            ) : (
                                                <XMarkIcon className="h-5 w-5 text-gray-400" />
                                            )
                                        ) : (
                                            feature[selectedPlan]
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-3">
                    <div className="px-6 py-5 text-sm font-medium text-gray-500">Features</div>
                    <div className="px-6 py-5 border-l border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Basic Plan</h3>
                        <p className="text-sm font-medium text-gray-500 mt-1">Free</p>
                    </div>
                    <div className="px-6 py-5 border-l border-gray-200 bg-blue-50">
                        <div className="flex items-center">
                            <h3 className="text-lg font-semibold text-gray-900">Pro Plan</h3>
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Recommended
                            </span>
                        </div>
                        <div className="mt-1 flex-col items-center space-y-2">
                            <span className="text-xs font-medium text-gray-400 line-through">$19/month per driver</span>
                            <div className="flex items-center">
                                <span className="text-xl font-bold text-blue-600">$9.50</span>
                                <span className="text-sm text-gray-600 ml-1">/month per driver</span>
                            </div>
                            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded">
                                50% OFF
                            </span>
                        </div>
                    </div>
                </div>

                {/* Feature Rows */}
                <div className="divide-y divide-gray-200">
                    {features.map((feature, index) => (
                        <div key={index} className="grid grid-cols-3">
                            <div className="px-6 py-4 text-sm font-medium text-gray-900">{feature.name}</div>
                            <div className="px-6 py-4 border-l border-gray-200 text-sm text-gray-700">
                                {typeof feature.basic === 'boolean' ? (
                                    feature.basic ? (
                                        <CheckIcon className="h-5 w-5 text-blue-500" />
                                    ) : (
                                        <XMarkIcon className="h-5 w-5 text-gray-400" />
                                    )
                                ) : (
                                    feature.basic
                                )}
                            </div>
                            <div className="px-6 py-4 border-l border-gray-200 bg-blue-50 text-sm text-gray-700">
                                {typeof feature.pro === 'boolean' ? (
                                    feature.pro ? (
                                        <CheckIcon className="h-5 w-5 text-blue-500" />
                                    ) : (
                                        <XMarkIcon className="h-5 w-5 text-gray-400" />
                                    )
                                ) : (
                                    feature.pro
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA Row */}
            </div>
        </div>
    );
}
