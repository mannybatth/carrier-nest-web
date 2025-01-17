import { SubscriptionPlan } from '@prisma/client';
import { useUserContext } from 'components/context/UserContext';
import { notify } from 'components/Notification';
import {
    createBillingPortalSession,
    createCheckoutSession,
    getStripeSubscription,
    getStripeInvoices,
} from 'lib/rest/stripe';
import React, { useEffect, useState } from 'react';
import Stripe from 'stripe';
import Layout from '../../components/layout/Layout';
import SimpleDialog from 'components/dialogs/SimpleDialog';
import { ArrowDownCircleIcon } from '@heroicons/react/24/outline';
import BillingPageSkeleton from 'components/skeletons/BillingPageSkeleton';
import {
    BASIC_PLAN_AI_RATECON_IMPORTS,
    BASIC_PLAN_MAX_DRIVERS,
    BASIC_PLAN_MAX_STORAGE_MB,
    BASIC_PLAN_TOTAL_LOADS,
    PRO_PLAN_AI_RATECON_IMPORTS_PER_DRIVER,
    PRO_PLAN_COST_PER_DRIVER,
    PRO_PLAN_MAX_STORAGE_GB_PER_DRIVER,
} from 'lib/constants';

const BillingPage = () => {
    const { defaultCarrier } = useUserContext();
    const currentPlan = defaultCarrier?.subscription?.plan || SubscriptionPlan.BASIC;
    const stripeCustomerId = defaultCarrier?.subscription?.stripeCustomerId || null;
    const stripeSubscriptionId = defaultCarrier?.subscription?.stripeSubscriptionId || null;
    const [subscriptionDetails, setSubscriptionDetails] = useState<Stripe.Subscription>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
    const [invoices, setInvoices] = useState<Stripe.Invoice[]>([]);
    const [numDrivers, setNumDrivers] = useState<number | null>(1);

    const isSubscriptionCanceling = subscriptionDetails?.cancel_at && currentPlan === SubscriptionPlan.PRO;

    useEffect(() => {
        const loadSubscriptionDetails = async () => {
            try {
                setIsLoading(true);
                if (stripeSubscriptionId) {
                    const subscription = await getStripeSubscription(stripeSubscriptionId);
                    setSubscriptionDetails(subscription);
                    setNumDrivers(subscription.items.data[0]?.quantity || 1);
                }
            } catch (error) {
                console.error('Error loading subscription details:', error);
                notify({ title: 'Error', message: error.message, type: 'error' });
                setNumDrivers(1);
            } finally {
                setIsLoading(false);
            }
        };

        loadSubscriptionDetails();
    }, [stripeSubscriptionId]);

    useEffect(() => {
        const loadInvoices = async () => {
            if (stripeCustomerId) {
                try {
                    const invoiceData = await getStripeInvoices(stripeCustomerId);
                    setInvoices(invoiceData);
                } catch (error) {
                    console.error('Error loading invoices:', error);
                    notify({ title: 'Error', message: 'Failed to load billing history', type: 'error' });
                }
            }
        };

        loadInvoices();
    }, [stripeCustomerId]);

    const handlePlanChange = async (plan: SubscriptionPlan) => {
        try {
            const url = await createCheckoutSession(plan, numDrivers);
            window.location.href = url;
        } catch (error) {
            console.error('Error creating checkout session:', error);
            notify({ title: 'Error', message: error.message, type: 'error' });
        }
    };

    const handleBillingPortal = async () => {
        try {
            const url = await createBillingPortalSession();
            window.location.href = url;
        } catch (error) {
            console.error('Error creating billing portal session:', error);
            notify({ title: 'Error', message: error.message, type: 'error' });
        }
    };

    const handleNumDriversChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        // Allow empty string in the input
        if (value === '') {
            setNumDrivers(null);
            return;
        }
        const numValue = parseInt(value);
        // Only update if it's a valid number
        if (!isNaN(numValue)) {
            setNumDrivers(numValue);
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('en-US', {
            timeZone: 'UTC',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatPeriodDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('en-US', {
            timeZone: 'UTC',
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        });
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800';
            case 'open':
                return 'bg-blue-100 text-blue-800';
            case 'void':
                return 'bg-gray-100 text-gray-800';
            case 'uncollectible':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
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
            <div className="py-2 mx-auto max-w-7xl">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Plans & Billing</h1>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">Manage your plans and billing history here.</p>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>

                {isLoading || !defaultCarrier ? (
                    <BillingPageSkeleton />
                ) : (
                    <>
                        <SimpleDialog
                            show={showDowngradeDialog}
                            onClose={() => setShowDowngradeDialog(false)}
                            title="Confirm Plan Downgrade"
                            description={
                                subscriptionDetails
                                    ? `Switching to Basic plan will cancel your PRO subscription at the end of the current billing period. You'll continue to have PRO features until ${formatDate(
                                          subscriptionDetails.current_period_end,
                                      )}.`
                                    : 'Are you sure you want to downgrade to the Basic plan?'
                            }
                            primaryButtonText="Downgrade Plan"
                            secondaryButtonText="Cancel"
                            primaryButtonAction={() => handlePlanChange(SubscriptionPlan.BASIC)}
                            primaryButtonColor="bg-gray-600 hover:bg-gray-500"
                            icon={() => <ArrowDownCircleIcon className="w-6 h-6" aria-hidden="true" />}
                            iconBgColor="bg-gray-100"
                            iconColor="text-gray-600"
                        />
                        <div className="px-5 sm:px-6 md:px-8">
                            <div className="max-w-3xl pb-6">
                                {/* Subscription Details */}
                                {!isLoading && subscriptionDetails && currentPlan === SubscriptionPlan.PRO && (
                                    <div className="mb-8 overflow-hidden bg-white border border-gray-200 rounded-lg">
                                        <div className="px-4 py-5 sm:p-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-medium leading-6 text-gray-900">
                                                    Plan Details
                                                </h3>
                                                <button
                                                    onClick={handleBillingPortal}
                                                    className="text-sm text-blue-600 hover:text-blue-800"
                                                >
                                                    Manage plan →
                                                </button>
                                            </div>
                                            <div className="mt-5 space-y-4">
                                                <div className="flex justify-between">
                                                    <p className="text-sm font-medium text-gray-500">Status</p>
                                                    <p className="text-sm text-gray-900">
                                                        {subscriptionDetails.status.charAt(0).toUpperCase() +
                                                            subscriptionDetails.status.slice(1)}
                                                    </p>
                                                </div>
                                                <div className="flex justify-between">
                                                    <p className="text-sm font-medium text-gray-500">
                                                        Current Period (UTC)
                                                    </p>
                                                    <p className="text-sm text-gray-900">
                                                        {formatPeriodDate(subscriptionDetails.current_period_start)} -{' '}
                                                        {formatPeriodDate(subscriptionDetails.current_period_end)}
                                                    </p>
                                                </div>
                                                {!subscriptionDetails.cancel_at && (
                                                    <div className="flex justify-between">
                                                        <p className="text-sm font-medium text-gray-500">
                                                            Next Billing Date (UTC)
                                                        </p>
                                                        <p className="text-sm text-gray-900">
                                                            {formatPeriodDate(subscriptionDetails.current_period_end)}
                                                        </p>
                                                    </div>
                                                )}
                                                {subscriptionDetails.cancel_at && (
                                                    <div className="flex justify-between">
                                                        <p className="text-sm font-medium text-gray-500">
                                                            Cancels On (UTC)
                                                        </p>
                                                        <p className="text-sm text-red-600">
                                                            {formatPeriodDate(subscriptionDetails.cancel_at)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Pricing Plans */}
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div
                                        className={`relative p-6 border-2 ${
                                            currentPlan === SubscriptionPlan.BASIC
                                                ? 'border-green-700'
                                                : 'border-gray-200'
                                        } rounded-lg`}
                                    >
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
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="space-y-4">
                                            <div>
                                                <h2 className="text-xl font-semibold">Basic Plan</h2>
                                                <div className="mt-1">
                                                    <p className="text-gray-600">
                                                        Total loads: {BASIC_PLAN_TOTAL_LOADS}
                                                    </p>
                                                    <p className="text-gray-600">
                                                        AI ratecon imports per month: {BASIC_PLAN_AI_RATECON_IMPORTS}
                                                    </p>
                                                    <p className="text-gray-600">
                                                        Max storage: {BASIC_PLAN_MAX_STORAGE_MB}MB
                                                    </p>
                                                    <p className="text-gray-600">
                                                        {BASIC_PLAN_MAX_DRIVERS === 1
                                                            ? 'Only one driver'
                                                            : `Up to ${BASIC_PLAN_MAX_DRIVERS} drivers`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-baseline">
                                                <span className="text-3xl font-bold">$0</span>
                                                <span className="ml-1 text-gray-600">per month</span>
                                            </div>
                                            <button
                                                className={`w-full px-4 py-2 text-center rounded-lg font-medium disabled:pointer-events-none ${
                                                    currentPlan === SubscriptionPlan.BASIC || isSubscriptionCanceling
                                                        ? 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-200'
                                                        : 'bg-black hover:bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black'
                                                }`}
                                                onClick={() => {
                                                    setShowDowngradeDialog(true);
                                                }}
                                                disabled={
                                                    currentPlan === SubscriptionPlan.BASIC || isSubscriptionCanceling
                                                }
                                            >
                                                {currentPlan === SubscriptionPlan.BASIC
                                                    ? 'Current plan'
                                                    : isSubscriptionCanceling
                                                    ? 'Downgrade scheduled'
                                                    : 'Switch to Basic'}
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative p-6 border-2 ${
                                            currentPlan === SubscriptionPlan.PRO
                                                ? 'border-green-700'
                                                : 'border-gray-200'
                                        } rounded-lg`}
                                    >
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
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="space-y-4">
                                            <div>
                                                <h2 className="text-xl font-semibold">Pro Plan</h2>
                                                <div className="mt-1">
                                                    <p className="text-gray-600">Unlimited loads</p>
                                                    <p className="text-gray-600">
                                                        AI ratecon imports per month:{' '}
                                                        {PRO_PLAN_AI_RATECON_IMPORTS_PER_DRIVER * numDrivers}
                                                    </p>
                                                    <p className="text-gray-600">
                                                        Max Storage: {PRO_PLAN_MAX_STORAGE_GB_PER_DRIVER * numDrivers}GB
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <label htmlFor="numDrivers" className="text-gray-600">
                                                    Number of drivers:
                                                </label>
                                                <input
                                                    type="number"
                                                    id="numDrivers"
                                                    value={numDrivers}
                                                    onChange={handleNumDriversChange}
                                                    min="1"
                                                    className="w-16 px-2 py-1 border border-gray-300 rounded-md"
                                                    disabled={currentPlan === SubscriptionPlan.PRO}
                                                />
                                            </div>
                                            <div className="flex items-baseline">
                                                <span className="text-3xl font-bold">
                                                    ${PRO_PLAN_COST_PER_DRIVER * numDrivers}
                                                </span>
                                                <span className="ml-1 text-gray-600">per month</span>
                                            </div>
                                            <button
                                                className={`w-full px-4 py-2 text-center rounded-lg font-medium disabled:opacity-50 disabled:pointer-events-none ${
                                                    currentPlan === SubscriptionPlan.PRO
                                                        ? isSubscriptionCanceling
                                                            ? 'bg-black hover:bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black'
                                                            : 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-200'
                                                        : 'bg-black hover:bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black'
                                                }`}
                                                onClick={() =>
                                                    isSubscriptionCanceling
                                                        ? handleBillingPortal()
                                                        : handlePlanChange(SubscriptionPlan.PRO)
                                                }
                                                disabled={
                                                    (currentPlan === SubscriptionPlan.PRO &&
                                                        !isSubscriptionCanceling) ||
                                                    !numDrivers ||
                                                    numDrivers < 1
                                                }
                                            >
                                                {currentPlan === SubscriptionPlan.PRO
                                                    ? isSubscriptionCanceling
                                                        ? 'Resume Plan'
                                                        : 'Current plan'
                                                    : 'Switch to Pro'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {stripeCustomerId && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-semibold">Billing history</h2>
                                    <div className="space-y-2">
                                        {invoices.length > 0 ? (
                                            <div className="min-w-full">
                                                <div className="text-xs font-medium text-gray-500 uppercase">
                                                    <div className="grid grid-cols-3 gap-4 py-2">
                                                        <div className="w-48">Date</div>
                                                        <div className="w-32">Amount</div>
                                                        <div>Status</div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {invoices.map((invoice) => (
                                                        <div
                                                            key={invoice.id}
                                                            className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100 last:border-0"
                                                        >
                                                            <div className="w-48 text-gray-600">
                                                                {formatDate(invoice.created)}
                                                            </div>
                                                            <div className="w-32 text-gray-900">
                                                                ${(invoice.total / 100).toFixed(2)} USD
                                                            </div>
                                                            <div>
                                                                <span
                                                                    className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeColor(
                                                                        invoice.status,
                                                                    )}`}
                                                                >
                                                                    {invoice.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">No billing history available</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};

BillingPage.authenticationEnabled = true;

export default BillingPage;
