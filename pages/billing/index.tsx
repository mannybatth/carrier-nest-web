'use client';

import { SubscriptionPlan } from '@prisma/client';
import { useUserContext } from 'components/context/UserContext';
import { notify } from 'components/notifications/Notification';
import {
    createBillingPortalSession,
    createCheckoutSession,
    getStripeSubscription,
    getStripeInvoices,
} from 'lib/rest/stripe';
import type React from 'react';
import { useEffect, useState } from 'react';
import type Stripe from 'stripe';
import Layout from '../../components/layout/Layout';
import SimpleDialog from 'components/dialogs/SimpleDialog';
import { ArrowDownCircleIcon, CheckIcon } from '@heroicons/react/24/outline';
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
import { set } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

const BillingPage = () => {
    const { defaultCarrier } = useUserContext();
    // Add useAuth hook to handle session refresh after Stripe checkout
    useAuth();
    const currentPlan = defaultCarrier?.subscription?.plan || SubscriptionPlan.BASIC;
    const stripeCustomerId = defaultCarrier?.subscription?.stripeCustomerId || null;
    const stripeSubscriptionId = defaultCarrier?.subscription?.stripeSubscriptionId || null;
    const [subscriptionDetails, setSubscriptionDetails] = useState<Stripe.Subscription>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
    const [invoices, setInvoices] = useState<Stripe.Invoice[]>([]);
    const [numDrivers, setNumDrivers] = useState<number | null>(1);
    const [isCopied, setIsCopied] = useState(false);
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
        console.log('Attempting to change plan to:', plan, 'with', numDrivers, 'drivers');
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
        const numValue = Number.parseInt(value);
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
                setTimeout(() => {
                    setIsCopied(false);
                }, 1500);
            })
            .catch((err) => {
                console.error('Failed to copy: ', err);
            });
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
                            <div className="max-w-7xl pb-6">
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

                                {/* Limited Time Offer - Mobile */}
                                {currentPlan === SubscriptionPlan.BASIC && (
                                    <div className="block md:hidden mb-8">
                                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl overflow-hidden">
                                            <div className="p-6">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                                        Limited Time
                                                    </span>
                                                    <span className="text-sm font-medium text-blue-600">
                                                        Special Offer
                                                    </span>
                                                </div>

                                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                                    Get 50% off for 6 months
                                                </h3>

                                                <p className="text-sm text-gray-600 mb-4">
                                                    Sign up today and save up to{' '}
                                                    <span className="font-semibold">$9.50 per driver</span> with our
                                                    special introductory offer. Upgrade now to unlock all Pro features
                                                    at half the price.
                                                </p>

                                                <div className="bg-white border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                                                    <div>
                                                        <span className="text-xs font-medium text-gray-500">
                                                            Use promo code
                                                        </span>
                                                        <p className="text-base font-mono font-bold text-gray-900">
                                                            50OFFVALUE
                                                        </p>
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
                                                        isCopied
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                                    }`}
                                                >
                                                    {isCopied ? 'Code Copied!' : 'Claim Your Discount'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Limited Time Offer - Desktop */}
                                {currentPlan === SubscriptionPlan.BASIC && (
                                    <div className="hidden md:block mb-8">
                                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl overflow-hidden">
                                            <div className="p-6">
                                                <div className="flex justify-between items-start">
                                                    <div className="max-w-xl">
                                                        <div className="flex items-center space-x-2 mb-2">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                                                Limited Time
                                                            </span>
                                                            <span className="text-sm font-medium text-blue-600">
                                                                Special Offer
                                                            </span>
                                                        </div>

                                                        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                                                            Get 50% off for your first 6 months
                                                        </h3>

                                                        <p className="text-sm text-gray-600">
                                                            Take your logistics operation to the next level while saving
                                                            up to{' '}
                                                            <span className="font-semibold">$9.50 per driver</span> with
                                                            our special introductory offer. Upgrade now to unlock all
                                                            Pro features at half the price and experience the full power
                                                            of our platform.
                                                        </p>
                                                    </div>

                                                    <div className="bg-white border border-blue-200 rounded-lg p-4 flex flex-col items-center">
                                                        <span className="text-xs font-medium text-gray-500 mb-1">
                                                            Use promo code
                                                        </span>
                                                        <p className="text-lg font-mono font-bold text-gray-900 mb-2">
                                                            50OFFVALUE
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex justify-end">
                                                    <button
                                                        onClick={handleClaimOffer}
                                                        disabled={isCopied}
                                                        className={`py-3 px-6 rounded-xl font-medium text-sm transition-all ${
                                                            isCopied
                                                                ? 'bg-green-500 text-white'
                                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                                        }`}
                                                    >
                                                        {isCopied ? 'Code Copied!' : 'Claim Your Discount'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Pricing Plans - New Card Layout */}
                                <div className="mb-8">
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                            {/* Basic Plan Card */}
                                            <div
                                                className={`rounded-2xl border p-6 text-center transition-all duration-300 flex flex-col h-full ${
                                                    currentPlan === SubscriptionPlan.BASIC
                                                        ? 'border-blue-600 ring-2 ring-blue-600'
                                                        : 'border-gray-200 bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex-grow">
                                                    <h3 className="text-2xl font-bold text-gray-900">Basic</h3>
                                                    <p className="mt-2 text-lg font-medium text-gray-500">Free</p>
                                                    <p className="mt-4 text-sm text-gray-600">
                                                        For individuals and small teams just getting started.
                                                    </p>

                                                    <ul className="mt-8 space-y-4 text-left">
                                                        <li className="flex items-center">
                                                            <CheckIcon className="h-5 w-5 text-green-500" />
                                                            <span className="ml-3 text-sm text-gray-800">
                                                                {BASIC_PLAN_TOTAL_LOADS} loads total
                                                            </span>
                                                        </li>
                                                        <li className="flex items-center">
                                                            <CheckIcon className="h-5 w-5 text-green-500" />
                                                            <span className="ml-3 text-sm text-gray-800">
                                                                {BASIC_PLAN_AI_RATECON_IMPORTS} AI RateCon Imports/month
                                                            </span>
                                                        </li>
                                                        <li className="flex items-center">
                                                            <CheckIcon className="h-5 w-5 text-green-500" />
                                                            <span className="ml-3 text-sm text-gray-800">
                                                                {BASIC_PLAN_MAX_STORAGE_MB}MB Storage
                                                            </span>
                                                        </li>
                                                        <li className="flex items-center">
                                                            <CheckIcon className="h-5 w-5 text-green-500" />
                                                            <span className="ml-3 text-sm text-gray-800">
                                                                {BASIC_PLAN_MAX_DRIVERS} Driver
                                                            </span>
                                                        </li>
                                                    </ul>
                                                </div>

                                                <button
                                                    className={`mt-8 block w-full rounded-lg py-3 text-sm font-semibold transition-colors ${
                                                        currentPlan === SubscriptionPlan.BASIC
                                                            ? 'bg-gray-200 text-gray-800 cursor-default'
                                                            : 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-300'
                                                    }`}
                                                    onClick={() => setShowDowngradeDialog(true)}
                                                    disabled={
                                                        currentPlan === SubscriptionPlan.BASIC ||
                                                        isSubscriptionCanceling
                                                    }
                                                >
                                                    {currentPlan === SubscriptionPlan.BASIC
                                                        ? 'Current Plan'
                                                        : isSubscriptionCanceling
                                                        ? 'Downgrade Scheduled'
                                                        : 'Switch to Basic'}
                                                </button>
                                            </div>

                                            {/* Pro Plan Card */}
                                            <div
                                                className={`rounded-2xl border p-6 text-center transition-all duration-300 flex flex-col h-full ${
                                                    currentPlan === SubscriptionPlan.PRO
                                                        ? 'border-blue-600 ring-2 ring-blue-600'
                                                        : 'border-gray-200 bg-white'
                                                }`}
                                            >
                                                <div className="flex-grow">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <h3 className="text-2xl font-bold text-gray-900">Pro</h3>
                                                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                                            Recommended
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-lg font-medium text-gray-500">
                                                        ${PRO_PLAN_COST_PER_DRIVER}/driver/month
                                                    </p>
                                                    <p className="mt-4 text-sm text-gray-600">
                                                        For growing businesses that need more power and features.
                                                    </p>

                                                    <div className="mt-6">
                                                        <h4 className="text-lg font-semibold text-gray-900 text-left">
                                                            Number of Drivers
                                                        </h4>
                                                        <div className="mt-2 flex items-center space-x-4">
                                                            <input
                                                                type="number"
                                                                id="numDrivers"
                                                                value={numDrivers ?? ''}
                                                                onChange={handleNumDriversChange}
                                                                min="1"
                                                                className="w-24 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                                disabled={
                                                                    currentPlan === SubscriptionPlan.PRO &&
                                                                    !isSubscriptionCanceling
                                                                }
                                                            />
                                                            {numDrivers > 0 && (
                                                                <p className="text-sm font-medium text-gray-800">
                                                                    Total:{' '}
                                                                    <span className="text-lg font-bold text-blue-600">
                                                                        $
                                                                        {(
                                                                            PRO_PLAN_COST_PER_DRIVER * numDrivers
                                                                        ).toFixed(2)}
                                                                    </span>
                                                                    /month
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <ul className="mt-8 space-y-4 text-left">
                                                        <li className="flex items-center">
                                                            <CheckIcon className="h-5 w-5 text-green-500" />
                                                            <span className="ml-3 text-sm text-gray-800">
                                                                Unlimited loads
                                                            </span>
                                                        </li>
                                                        <li className="flex items-center">
                                                            <CheckIcon className="h-5 w-5 text-green-500" />
                                                            <span className="ml-3 text-sm text-gray-800">
                                                                Unlimited AI RateCon Imports
                                                            </span>
                                                        </li>
                                                        <li className="flex items-center">
                                                            <CheckIcon className="h-5 w-5 text-green-500" />
                                                            <span className="ml-3 text-sm text-gray-800">
                                                                {PRO_PLAN_MAX_STORAGE_GB_PER_DRIVER}GB Storage per
                                                                driver
                                                            </span>
                                                        </li>
                                                        <li className="flex items-center">
                                                            <CheckIcon className="h-5 w-5 text-green-500" />
                                                            <span className="ml-3 text-sm text-gray-800">
                                                                Priority Support
                                                            </span>
                                                        </li>
                                                        <li className="flex items-center">
                                                            <CheckIcon className="h-5 w-5 text-green-500" />
                                                            <span className="ml-3 text-sm text-gray-800">
                                                                IFTA Reporting (Coming Soon)
                                                            </span>
                                                        </li>
                                                    </ul>
                                                </div>

                                                <button
                                                    className={`mt-8 block w-full rounded-lg py-3 text-sm font-semibold transition-colors ${
                                                        currentPlan === SubscriptionPlan.PRO && !isSubscriptionCanceling
                                                            ? 'bg-gray-200 text-gray-800 cursor-default'
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    }`}
                                                    onClick={() => handlePlanChange(SubscriptionPlan.PRO)}
                                                    disabled={
                                                        currentPlan === SubscriptionPlan.PRO && !isSubscriptionCanceling
                                                    }
                                                >
                                                    {currentPlan === SubscriptionPlan.PRO
                                                        ? 'Current Plan'
                                                        : 'Upgrade to Pro'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Billing History */}
                                        {invoices.length > 0 && (
                                            <div className="rounded-2xl border border-gray-200 bg-white">
                                                <div className="p-6">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        Billing History
                                                    </h3>
                                                    <p className="mt-1 text-sm text-gray-600">
                                                        View and download your past invoices.
                                                    </p>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200 rounded-lg">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th
                                                                    scope="col"
                                                                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                                                                >
                                                                    Date
                                                                </th>
                                                                <th
                                                                    scope="col"
                                                                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                                                                >
                                                                    Status
                                                                </th>
                                                                <th
                                                                    scope="col"
                                                                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                                                                >
                                                                    Amount
                                                                </th>
                                                                <th scope="col" className="relative px-6 py-3">
                                                                    <span className="sr-only">Download</span>
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200 bg-white">
                                                            {invoices.map((invoice) => (
                                                                <tr key={invoice.id}>
                                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                                        {formatDate(invoice.created)}
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-6 py-4">
                                                                        <span
                                                                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadgeColor(
                                                                                invoice.status,
                                                                            )}`}
                                                                        >
                                                                            {invoice.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                                                        ${(invoice.amount_paid / 100).toFixed(2)}
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                                        <a
                                                                            href={invoice.invoice_pdf}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-blue-600 hover:text-blue-800"
                                                                        >
                                                                            Download
                                                                        </a>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};

BillingPage.authenticationEnabled = true;

export default BillingPage;
