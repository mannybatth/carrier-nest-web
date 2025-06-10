'use client';

import React, { useState } from 'react';
import { CheckIcon, XMarkIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

export default function PricingTable() {
    const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro'>('basic');
    const [isCopied, setIsCopied] = useState(false);

    const features = [
        { name: 'Drivers', basic: 'Up to 2', pro: 'Unlimited' },
        { name: 'Load Imports', basic: '30 loads', pro: 'Unlimited' },
        { name: 'AI PDF Imports', basic: '30/month', pro: '60/month' },
        { name: 'Storage', basic: '100MB', pro: '5GB' },
        { name: 'Mobile App', basic: false, pro: true },
        { name: 'Priority Support', basic: false, pro: true },
    ];

    const copyToClipboard = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            })
            .catch((err) => {
                console.error('Failed to copy: ', err);
            });
    };

    const handleClaimOffer = () => {
        navigator.clipboard
            .writeText('50OFFVALUE')
            .then(() => {
                setIsCopied(true);
                setTimeout(() => {
                    window.location.href = '/auth/signup';
                }, 1500);
            })
            .catch((err) => {
                console.error('Failed to copy: ', err);
            });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br  py-6 sm:py-12">
            <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
                {/* Main Pricing Card */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl sm:rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-gray-200/50 overflow-hidden">
                    {/* Plan Slider */}
                    <div className="p-4 sm:p-8 pb-4 sm:pb-6 text-center border-b border-gray-100">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Choose Your Plan</h2>

                        <div className="relative inline-flex bg-gray-100 rounded-xl sm:rounded-2xl p-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]">
                            <div
                                className={`absolute top-1 bottom-1 w-1/2 bg-gradient-to-r from-white to-blue-50 rounded-lg sm:rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out ${
                                    selectedPlan === 'pro' ? 'transform translate-x-full' : ''
                                }`}
                            />
                            <button
                                onClick={() => setSelectedPlan('basic')}
                                className={`relative z-10 px-4 sm:px-8 py-2 sm:py-3 text-sm font-semibold rounded-lg sm:rounded-xl transition-colors duration-300 ${
                                    selectedPlan === 'basic' ? 'text-gray-800' : 'text-gray-500'
                                }`}
                            >
                                Basic Plan
                            </button>
                            <button
                                onClick={() => setSelectedPlan('pro')}
                                className={`relative z-10 px-4 sm:px-8 py-2 sm:py-3 text-sm font-semibold rounded-lg sm:rounded-xl transition-colors duration-300 ${
                                    selectedPlan === 'pro' ? 'text-gray-800' : 'text-gray-500'
                                }`}
                            >
                                Pro Plan
                            </button>
                        </div>
                    </div>

                    {/* Plan Details */}
                    <div className="p-4 sm:p-8">
                        <div className="text-center mb-6 sm:mb-8">
                            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 mb-4">
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
                                    {selectedPlan === 'basic' ? 'Basic Plan' : 'Pro Plan'}
                                </h3>
                                {selectedPlan === 'pro' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700">
                                        Recommended
                                    </span>
                                )}
                            </div>

                            <div className="mb-4 sm:mb-6">
                                {selectedPlan === 'basic' ? (
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-800">Free</p>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-center space-x-2">
                                            <span className="text-xs sm:text-sm text-gray-400 line-through">
                                                $19/month per driver
                                            </span>
                                            <span className="bg-red-50 text-red-600 text-xs font-medium px-2 py-1 rounded">
                                                50% OFF
                                            </span>
                                        </div>
                                        <div className="flex items-baseline justify-center space-x-1">
                                            <span className="text-3xl sm:text-4xl font-bold text-gray-800">$9.50</span>
                                            <span className="text-base sm:text-lg text-gray-600">
                                                /month per driver
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Integrated Offer - Only shown for Pro Plan */}
                            {selectedPlan === 'pro' && (
                                <div className="mb-4 sm:mb-6 max-w-sm sm:max-w-md mx-auto">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] border border-blue-100/50">
                                        <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                                Limited Time
                                            </span>
                                            <span className="text-xs font-medium text-gray-600">Special Offer</span>
                                        </div>

                                        <p className="text-xs sm:text-sm text-gray-600 mb-3">
                                            Get 50% off for your first 6 months:
                                        </p>

                                        <div className="flex items-center justify-between bg-white rounded-lg p-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100">
                                            <p className="text-sm sm:text-base font-mono font-semibold text-gray-800 ml-1 sm:ml-2">
                                                50OFFVALUE
                                            </p>
                                            <button
                                                onClick={() => copyToClipboard('50OFFVALUE')}
                                                className="flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors"
                                            >
                                                <ClipboardDocumentIcon className="h-3 w-3" />
                                                <span className="hidden sm:inline">
                                                    {isCopied ? 'Copied!' : 'Copy'}
                                                </span>
                                                <span className="sm:hidden">{isCopied ? '✓' : 'Copy'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleClaimOffer}
                                disabled={isCopied}
                                className={`w-full sm:w-auto px-6 sm:px-8 py-3 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300 ${
                                    isCopied
                                        ? 'bg-green-100 text-green-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.25)] hover:from-blue-700 hover:to-indigo-700'
                                }`}
                            >
                                {isCopied ? 'Code Copied! Redirecting...' : 'Get Started'}
                            </button>
                        </div>

                        {/* Features List */}
                        <div className="space-y-2 sm:space-y-3">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
                                What&apos;s included:
                            </h4>
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className="flex justify-between items-center p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-xl sm:rounded-2xl shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]"
                                >
                                    <span className="text-sm sm:text-base font-medium text-gray-700 flex-shrink-0">
                                        {feature.name}
                                    </span>
                                    <span className="text-sm sm:text-base font-medium ml-2 flex-shrink-0">
                                        {typeof feature[selectedPlan] === 'boolean' ? (
                                            feature[selectedPlan] ? (
                                                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full">
                                                    <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 rounded-full">
                                                    <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                                                </div>
                                            )
                                        ) : (
                                            <span className="text-gray-600 bg-gradient-to-r from-gray-200 to-gray-100 px-2 sm:px-3 py-1 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
                                                {feature[selectedPlan]}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
