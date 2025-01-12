import { SubscriptionPlan } from '@prisma/client';
import { useUserContext } from 'components/context/UserContext';
import React from 'react';
import Layout from '../../components/layout/Layout';

const EquipmentsPage = () => {
    const { defaultCarrier } = useUserContext();
    const currentPlan = defaultCarrier?.subscription?.plan || SubscriptionPlan.BASIC;

    const handlePlanChange = async (plan: SubscriptionPlan) => {
        try {
            const response = await fetch('/api/stripe/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ plan }),
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
        }
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Plans & Billing</h1>
                </div>
            }
        >
            <>
                <div className="py-2 mx-auto max-w-7xl">
                    {process.env.STRIPE_SECRET_KEY}
                    <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                        <div className="flex">
                            <h1 className="flex-1 text-2xl font-semibold text-gray-900">Plans & Billing</h1>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">Manage your plans and billing history here.</p>
                        <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                    </div>
                    <div className="px-5 sm:px-6 md:px-8">
                        <div className="max-w-3xl pb-6">
                            {/* Pricing Plans */}
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="relative p-6 border border-gray-200 rounded-lg">
                                    {currentPlan === SubscriptionPlan.BASIC && (
                                        <div
                                            className="absolute flex items-center justify-center w-5 h-5 text-white bg-green-600 rounded-full top-6 right-6"
                                            data-tooltip-id="tooltip"
                                            data-tooltip-content="Currently on the Basic plan"
                                        >
                                            <svg
                                                className="w-3 h-3"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth={3}
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div>
                                            <h2 className="text-xl font-semibold">Basic Plan</h2>
                                            <p className="text-gray-600">Up to 1 driver</p>
                                        </div>
                                        <div className="flex items-baseline">
                                            <span className="text-3xl font-bold">$0</span>
                                            <span className="ml-1 text-gray-600">per month</span>
                                        </div>
                                        <button
                                            className={`w-full px-4 py-2 text-center rounded-lg font-medium disabled:pointer-events-none ${
                                                currentPlan === SubscriptionPlan.BASIC
                                                    ? 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-200'
                                                    : 'bg-black hover:bg-gray-600 text-white'
                                            }`}
                                            onClick={() => handlePlanChange(SubscriptionPlan.BASIC)}
                                            disabled={currentPlan === SubscriptionPlan.BASIC}
                                        >
                                            {currentPlan === SubscriptionPlan.BASIC
                                                ? 'Current plan'
                                                : 'Switch to Basic'}
                                        </button>
                                    </div>
                                </div>

                                <div className="relative p-6 border border-gray-200 rounded-lg">
                                    {currentPlan === SubscriptionPlan.PRO && (
                                        <div
                                            className="absolute flex items-center justify-center w-5 h-5 text-white bg-green-600 rounded-full top-6 right-6"
                                            data-tooltip-id="tooltip"
                                            data-tooltip-content="Currently on the Pro plan"
                                        >
                                            <svg
                                                className="w-3 h-3"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth={3}
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div>
                                            <h2 className="text-xl font-semibold">Pro Plan</h2>
                                            <p className="text-gray-600">Up to 10 drivers</p>
                                        </div>
                                        <div className="flex items-baseline">
                                            <span className="text-3xl font-bold">$20</span>
                                            <span className="ml-1 text-gray-600">per month</span>
                                        </div>
                                        <button
                                            className={`w-full px-4 py-2 text-center rounded-lg font-medium disabled:pointer-events-none ${
                                                currentPlan === SubscriptionPlan.PRO
                                                    ? 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-200'
                                                    : 'bg-black hover:bg-gray-600 text-white'
                                            }`}
                                            onClick={() => handlePlanChange(SubscriptionPlan.PRO)}
                                            disabled={currentPlan === SubscriptionPlan.PRO}
                                        >
                                            {currentPlan === SubscriptionPlan.PRO ? 'Current plan' : 'Switch to Pro'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Billing History */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Billing history</h2>
                            <div className="space-y-2">
                                {[
                                    { id: '0012', date: '12 Apr' },
                                    { id: '0011', date: '12 Mar' },
                                    { id: '0010', date: '12 Feb' },
                                    { id: '0009', date: '12 Jan' },
                                    { id: '0008', date: '12 Dec' },
                                ].map((invoice) => (
                                    <div
                                        key={invoice.id}
                                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 text-xs text-white bg-orange-500 rounded">PDF</div>
                                            <span className="text-gray-900">Invoice {invoice.id}</span>
                                        </div>
                                        <span className="text-gray-600">{invoice.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        </Layout>
    );
};

EquipmentsPage.authenticationEnabled = true;

export default EquipmentsPage;
