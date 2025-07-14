'use client';

import {
    CheckCircleIcon,
    ArrowDownTrayIcon,
    PhoneIcon,
    MapPinIcon,
    CalendarIcon,
    TruckIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon, MapIcon } from '@heroicons/react/24/solid';
import { notify } from 'components/Notification';
import Spinner from 'components/Spinner';
import DriverInvoiceApprovalSkeleton from 'components/skeletons/DriverInvoiceApprovalSkeleton';
import { ExpandedDriverInvoice } from 'interfaces/models';
import { getDriverInvoiceById, approveDriverInvoice } from 'lib/rest/driverinvoice';
import { downloadDriverInvoice } from 'components/driverinvoices/driverInvoicePdf';
import { formatPhoneNumber } from 'lib/helpers/format';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';

const DriverInvoiceApprovalPage = () => {
    const router = useRouter();
    const [invoice, setInvoice] = useState<ExpandedDriverInvoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showPhoneVerification, setShowPhoneVerification] = useState(false);
    const [phoneVerificationInput, setPhoneVerificationInput] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const invoiceId = router.query.id as string;

    const [assignmentsTotal, setAssignmentsTotal] = useState(0);
    const [lineItemsTotal, setLineItemsTotal] = useState(0);

    useEffect(() => {
        if (!invoice) return;

        // Calculate totals
        let assignmentsTotal = 0;

        // Add up assignment amounts
        invoice.assignments.forEach((assignment) => {
            let amount = 0;
            switch (assignment.chargeType) {
                case 'PER_MILE':
                    amount = Number(assignment.billedDistanceMiles) * Number(assignment.chargeValue);
                    break;
                case 'PER_HOUR':
                    amount = Number(assignment.billedDurationHours) * Number(assignment.chargeValue);
                    break;
                case 'PERCENTAGE_OF_LOAD':
                    amount = (Number(assignment.billedLoadRate) * Number(assignment.chargeValue)) / 100;
                    break;
                case 'FIXED_PAY':
                    amount = Number(assignment.chargeValue);
                    break;
            }
            assignmentsTotal += amount;
        });

        setAssignmentsTotal(Number(assignmentsTotal.toFixed(2)));

        let lineItemsTotal = 0;
        // Add up line items
        invoice.lineItems.forEach((item) => {
            lineItemsTotal += Number(item.amount);
        });

        setLineItemsTotal(Number(lineItemsTotal.toFixed(2)));
    }, [invoice]);

    // Get invoice data on mount
    const getInvoiceData = async () => {
        setLoading(true);
        try {
            const invoiceData = await getDriverInvoiceById(invoiceId);
            setInvoice(invoiceData);
        } catch (error) {
            notify({
                type: 'error',
                title: 'Error fetching invoice data',
                message: error.message,
            });
            router.push('/driverinvoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (invoiceId) {
            getInvoiceData();
        }
    }, [invoiceId]);

    const handleApproveInvoice = async () => {
        if (!invoice) return;

        setApproving(true);
        setShowPhoneVerification(false);
        setShowConfirmModal(false);
        try {
            await approveDriverInvoice(invoice.id);
            setInvoice({ ...invoice, status: 'APPROVED' });
            notify({
                type: 'success',
                title: 'Invoice Approved Successfully! ✅',
                message: 'Your invoice has been approved and your carrier has been automatically notified.',
            });
        } catch (error) {
            notify({
                type: 'error',
                title: 'Error approving invoice',
                message: error.message,
            });
        } finally {
            setApproving(false);
        }
    };

    const handleApproveClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmApproval = () => {
        setShowConfirmModal(false);
        setShowPhoneVerification(true);
        setPhoneVerificationInput('');
        setVerificationError('');
    };

    const validatePhoneAndApprove = () => {
        if (!invoice?.driver.phone) {
            setVerificationError('Driver phone number not available for verification.');
            return;
        }

        // Extract only digits from phone number
        const phoneDigits = invoice.driver.phone.replace(/\D/g, '');
        const lastFourDigits = phoneDigits.slice(-4);

        if (phoneVerificationInput !== lastFourDigits) {
            setVerificationError('The last four digits do not match your phone number. Please try again.');
            return;
        }

        // Phone verification passed, proceed with approval
        handleApproveInvoice();
    };

    const handleDownloadInvoice = () => {
        if (!invoice) return;

        setDownloading(true);
        setTimeout(() => {
            setDownloading(false);
        }, 1000);
        downloadDriverInvoice(
            invoice,
            `${invoice.driver.name}-${invoice.invoiceNum}-${invoice.createdAt.toString().split('T')[0]}.pdf`,
        );
    };

    const formatCurrency = (value: string | number): string => {
        const numValue = typeof value === 'string' ? Number.parseFloat(value) : value;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numValue);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200/50 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1.5 shadow-sm"></div>
                        Pending
                    </span>
                );
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200/50 shadow-sm">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        Approved
                    </span>
                );
            case 'PAID':
                return (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200/50 shadow-sm">
                        <CheckIcon className="w-3 h-3 mr-1" />
                        Paid
                    </span>
                );
            case 'PARTIALLY_PAID':
                return (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border border-indigo-200/50 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mr-1.5 shadow-sm"></div>
                        Partial
                    </span>
                );
            default:
                return null;
        }
    };

    const formatLocations = (assignment: any) => {
        if (!assignment.routeLeg.locations || assignment.routeLeg.locations.length === 0) {
            return 'No locations';
        }

        // Try to find pickup and delivery by type
        let pickup = assignment.routeLeg.locations.find(
            (loc) => loc.loadStop?.type === 'SHIPPER' || loc.loadStop?.type === 'PICKUP',
        );
        let delivery = assignment.routeLeg.locations.find(
            (loc) => loc.loadStop?.type === 'RECEIVER' || loc.loadStop?.type === 'DELIVERY',
        );

        // If no clear types found, use first and last locations
        if (!pickup && !delivery && assignment.routeLeg.locations.length >= 2) {
            pickup = assignment.routeLeg.locations[0];
            delivery = assignment.routeLeg.locations[assignment.routeLeg.locations.length - 1];
        } else if (!pickup && assignment.routeLeg.locations.length > 0) {
            pickup = assignment.routeLeg.locations[0];
        } else if (!delivery && assignment.routeLeg.locations.length > 1) {
            delivery = assignment.routeLeg.locations[assignment.routeLeg.locations.length - 1];
        }

        const getLocationText = (loc: any) => {
            if (!loc) return 'Unknown';
            const city = loc.loadStop?.city || loc.location?.city;
            const state = loc.loadStop?.state || loc.location?.state;
            return city && state ? `${city}, ${state}` : city || 'Unknown';
        };

        const pickupText = getLocationText(pickup);
        const deliveryText = getLocationText(delivery);

        return pickupText === deliveryText ? pickupText : `${pickupText} → ${deliveryText}`;
    };

    const createGoogleMapsUrl = (lat: number, lng: number, label?: string): string => {
        const baseUrl = 'https://www.google.com/maps/search/';
        if (label) {
            return `${baseUrl}?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(label)}`;
        } else {
            return `${baseUrl}?api=1&query=${lat},${lng}`;
        }
    };

    if (loading) {
        return <DriverInvoiceApprovalSkeleton />;
    }

    if (!invoice) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
                {/* Fixed Header Skeleton */}
                <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg shadow-black/5">
                    <div className="px-4 py-3 sm:py-4">
                        <div className="flex items-center justify-between max-w-4xl mx-auto">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center">
                                    <TruckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-base sm:text-xl font-semibold text-gray-400 truncate">
                                        Invoice Not Found
                                    </h1>
                                    <p className="text-xs sm:text-sm text-gray-400 truncate">Driver Invoice Approval</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Not Found Content */}
                <div className="pt-16 sm:pt-20 flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <p className="text-gray-600">Invoice not found</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Fixed Header with Carrier Name */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg shadow-black/5">
                <div className="px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between max-w-4xl mx-auto">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                                <TruckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                                    {invoice.carrier?.name || 'Carrier Name'}
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-600 truncate">
                                    Driver Invoice #{invoice.invoiceNum} • Driver Approval
                                </p>
                            </div>
                        </div>
                        <div className="flex-shrink-0 ml-4">{getStatusBadge(invoice.status)}</div>
                    </div>
                </div>
            </div>

            {/* Main Content with Top Padding */}
            <div className="pt-14 sm:pt-16">
                <div className="max-w-4xl mx-auto px-3 py-4 space-y-4">
                    {/* Driver Information Card */}
                    <div className="bg-white/70 backdrop-blur-xl  mt-4 rounded-xl shadow-lg shadow-black/5 border border-white/50 p-4 hover:shadow-xl hover:shadow-black/10 transition-all duration-300">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Driver Information</h2>
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/25">
                                <span className="text-sm font-semibold text-white uppercase">
                                    {invoice.driver.name.charAt(0)}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-gray-900 capitalize">
                                    {invoice.driver.name.toLowerCase()}
                                </h3>
                                <p className="text-xs text-gray-600">{invoice.driver.email}</p>
                                {/* Phone number hidden for security */}
                            </div>
                        </div>
                    </div>

                    {/* Invoice Summary Card */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg shadow-black/5 border border-white/50 p-4 hover:shadow-xl hover:shadow-black/10 transition-all duration-300">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Invoice Summary</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-100/50">
                                <p className="text-xs font-medium text-gray-500 mb-1">Created Date</p>
                                <p className="text-sm font-semibold text-gray-900">
                                    {dayjs(invoice.createdAt).format('MMM DD, YYYY')}
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100/50">
                                <p className="text-xs font-medium text-green-700 mb-1">Total Amount</p>
                                <p className="text-lg font-bold text-green-600">
                                    {formatCurrency(Number(invoice.totalAmount))}
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100/50">
                                <p className="text-xs font-medium text-blue-700 mb-1">Assignments</p>
                                <p className="text-sm font-semibold text-blue-900">
                                    {invoice.assignments.length} orders
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-100/50">
                                <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                                <div className="scale-75 origin-left">{getStatusBadge(invoice.status)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Notes */}
                    {invoice.notes && (
                        <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg shadow-black/5 border border-white/50 p-4 hover:shadow-xl hover:shadow-black/10 transition-all duration-300">
                            <h2 className="text-base font-semibold text-gray-900 mb-3">Invoice Notes</h2>
                            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-3 border border-amber-100/50">
                                <p className="text-xs text-gray-800 whitespace-pre-wrap">{invoice.notes}</p>
                            </div>
                        </div>
                    )}

                    {/* Assignment Cards */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg shadow-black/5 border border-white/50 p-4 hover:shadow-xl hover:shadow-black/10 transition-all duration-300">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">
                            Order Assignments ({invoice.assignments.length})
                        </h2>
                        <div className="space-y-3">
                            {invoice.assignments.map((assignment, index) => {
                                let calculatedAmount = 0;
                                switch (assignment.chargeType) {
                                    case 'PER_MILE':
                                        calculatedAmount =
                                            Number(
                                                assignment.billedDistanceMiles || assignment.routeLeg.distanceMiles,
                                            ) * Number(assignment.chargeValue);
                                        break;
                                    case 'PER_HOUR':
                                        calculatedAmount =
                                            Number(
                                                assignment.billedDurationHours || assignment.routeLeg.durationHours,
                                            ) * Number(assignment.chargeValue);
                                        break;
                                    case 'PERCENTAGE_OF_LOAD':
                                        calculatedAmount =
                                            (Number(assignment.billedLoadRate || assignment.load.rate) *
                                                Number(assignment.chargeValue)) /
                                            100;
                                        break;
                                    case 'FIXED_PAY':
                                        calculatedAmount = Number(assignment.chargeValue);
                                        break;
                                }

                                return (
                                    <div key={assignment.id}>
                                        <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-white/30 p-3 hover:bg-white/80 hover:border-blue-200/50 hover:shadow-md hover:shadow-black/5 transition-all duration-200">
                                            {/* Header Section - Responsive Layout */}
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 space-y-1 sm:space-y-0">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col xs:flex-row xs:items-center xs:space-x-2 mb-1">
                                                        <h3 className="font-semibold text-gray-900 text-sm">
                                                            Order #{assignment.load.refNum}
                                                        </h3>
                                                    </div>
                                                    <p className="text-xs text-gray-600 truncate">
                                                        {assignment.load.customer?.name || 'Unknown Customer'}
                                                    </p>
                                                </div>
                                                <div className="text-left sm:text-right flex-shrink-0">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 w-fit mb-1">
                                                        Completed
                                                    </span>
                                                    <p className="text-base sm:text-lg font-bold text-gray-900">
                                                        {formatCurrency(calculatedAmount.toFixed(2))}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Location and Date - Stacked on Mobile */}
                                            <div className="space-y-1 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-2 sm:gap-2 mb-2">
                                                <div className="flex items-start text-xs text-gray-600">
                                                    <MapPinIcon className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0 mt-0.5" />
                                                    <span className="break-words">{formatLocations(assignment)}</span>
                                                </div>
                                                <div className="flex items-center text-xs text-gray-600">
                                                    <CalendarIcon className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" />
                                                    <span>
                                                        Completed{' '}
                                                        {dayjs(assignment.routeLeg.endedAt).format('MMM DD, YYYY')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Location Tracking - Show map pins if coordinates are available */}
                                            {(assignment.routeLeg.startLatitude &&
                                                assignment.routeLeg.startLongitude) ||
                                            (assignment.routeLeg.endLatitude && assignment.routeLeg.endLongitude) ? (
                                                <div className="mb-2 p-2 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200/50 backdrop-blur-sm">
                                                    <div className="flex items-center mb-2">
                                                        <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 rounded-md flex items-center justify-center mr-2 shadow-md shadow-blue-500/25">
                                                            <MapIcon className="w-2.5 h-2.5 text-white flex-shrink-0" />
                                                        </div>
                                                        <span className="text-xs font-medium text-gray-700">
                                                            Route Tracking
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col xs:flex-row gap-1.5">
                                                        {assignment.routeLeg.startLatitude &&
                                                            assignment.routeLeg.startLongitude && (
                                                                <a
                                                                    href={createGoogleMapsUrl(
                                                                        Number(assignment.routeLeg.startLatitude),
                                                                        Number(assignment.routeLeg.startLongitude),
                                                                        `Started - Order ${assignment.load.refNum}`,
                                                                    )}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center text-xs text-gray-700 hover:text-green-700 bg-white/80 hover:bg-green-50/80 backdrop-blur-sm border border-white/50 hover:border-green-200/50 px-2 py-1.5 rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
                                                                >
                                                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 flex-shrink-0 shadow-sm"></div>
                                                                    <span>Start Location</span>
                                                                </a>
                                                            )}
                                                        {assignment.routeLeg.endLatitude &&
                                                            assignment.routeLeg.endLongitude && (
                                                                <a
                                                                    href={createGoogleMapsUrl(
                                                                        Number(assignment.routeLeg.endLatitude),
                                                                        Number(assignment.routeLeg.endLongitude),
                                                                        `Completed - Order ${assignment.load.refNum}`,
                                                                    )}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center text-xs text-gray-700 hover:text-red-700 bg-white/80 hover:bg-red-50/80 backdrop-blur-sm border border-white/50 hover:border-red-200/50 px-2 py-1.5 rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
                                                                >
                                                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5 flex-shrink-0 shadow-sm"></div>
                                                                    <span>End Location</span>
                                                                </a>
                                                            )}
                                                    </div>
                                                </div>
                                            ) : null}

                                            {/* Charge Details - Responsive Bottom Section */}
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-gray-100/50 space-y-1 sm:space-y-0">
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-medium">Charge: </span>
                                                    {assignment.chargeType === 'PER_MILE' &&
                                                        `$${assignment.chargeValue}/mile`}
                                                    {assignment.chargeType === 'PER_HOUR' &&
                                                        `$${assignment.chargeValue}/hour`}
                                                    {assignment.chargeType === 'PERCENTAGE_OF_LOAD' &&
                                                        `${assignment.chargeValue}% of load`}
                                                    {assignment.chargeType === 'FIXED_PAY' && 'Fixed Pay'}
                                                </div>
                                                {assignment.chargeType === 'PER_MILE' && (
                                                    <div className="text-xs text-gray-600">
                                                        <span className="font-medium">
                                                            {Number(
                                                                assignment.billedDistanceMiles ||
                                                                    assignment.routeLeg.distanceMiles,
                                                            )}{' '}
                                                            miles
                                                        </span>
                                                    </div>
                                                )}
                                                {assignment.chargeType === 'PER_HOUR' && (
                                                    <div className="text-xs text-gray-600">
                                                        <span className="font-medium">
                                                            {Number(
                                                                assignment.billedDurationHours ||
                                                                    assignment.routeLeg.durationHours,
                                                            )}{' '}
                                                            hours
                                                        </span>
                                                    </div>
                                                )}
                                                {assignment.chargeType === 'PERCENTAGE_OF_LOAD' && (
                                                    <div className="text-xs text-gray-600">
                                                        <span className="font-medium">
                                                            Load Rate:{' '}
                                                            {formatCurrency(
                                                                Number(
                                                                    assignment.billedLoadRate || assignment.load.rate,
                                                                ),
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Separator between assignments */}
                                        {index < invoice.assignments.length - 1 && (
                                            <div className="relative py-2">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-gradient-to-r from-transparent via-gray-300/30 to-transparent"></div>
                                                </div>
                                                <div className="relative flex justify-center">
                                                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-3 py-1 rounded-full">
                                                        <div className="flex items-center space-x-1">
                                                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Line Items (if any) */}
                    {invoice.lineItems.length > 0 && (
                        <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg shadow-black/5 border border-white/50 p-4 hover:shadow-xl hover:shadow-black/10 transition-all duration-300">
                            <h2 className="text-base font-semibold text-gray-900 mb-4">
                                Additional Items ({invoice.lineItems.length})
                            </h2>
                            <div className="space-y-2">
                                {invoice.lineItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between py-3 px-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/30 hover:bg-white/60 transition-all duration-200"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{item.description}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {Number(item.amount) >= 0
                                                    ? formatCurrency(item.amount.toString())
                                                    : `(${formatCurrency(Math.abs(Number(item.amount)).toString())})`}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Total Summary */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg shadow-black/5 border border-white/50 p-4 hover:shadow-xl hover:shadow-black/10 transition-all duration-300">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Payment Summary</h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-2 bg-white/40 backdrop-blur-sm rounded-lg border border-white/30">
                                <span className="text-sm text-gray-600">Assignments Total:</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {formatCurrency(assignmentsTotal)}
                                </span>
                            </div>
                            {lineItemsTotal !== 0 && (
                                <div className="flex items-center justify-between p-2 bg-white/40 backdrop-blur-sm rounded-lg border border-white/30">
                                    <span className="text-sm text-gray-600">Additional Items:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {formatCurrency(lineItemsTotal)}
                                    </span>
                                </div>
                            )}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200/50 shadow-md shadow-green-500/10">
                                <div className="flex items-center justify-between">
                                    <span className="text-base font-semibold text-green-800">Total Amount:</span>
                                    <span className="text-xl font-bold text-green-600">
                                        {formatCurrency(Number(invoice.totalAmount))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg shadow-black/5 border border-white/50 p-4 hover:shadow-xl hover:shadow-black/10 transition-all duration-300">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleDownloadInvoice}
                                disabled={downloading}
                                className="flex-1 inline-flex items-center justify-center px-5 py-2.5 bg-white/60 backdrop-blur-sm border border-white/50 rounded-lg text-sm font-medium text-gray-700 hover:bg-white/80 hover:border-gray-300/50 hover:shadow-md hover:shadow-black/5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                            >
                                {downloading ? (
                                    <Spinner />
                                ) : (
                                    <>
                                        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                                        Download Invoice
                                    </>
                                )}
                            </button>

                            {invoice.status === 'PENDING' && (
                                <button
                                    onClick={handleApproveClick}
                                    disabled={approving}
                                    className="flex-1 inline-flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg text-sm font-medium text-white hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-500/25 hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300"
                                >
                                    {approving ? (
                                        <Spinner />
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="w-4 h-4 mr-2" />
                                            Approve Invoice
                                        </>
                                    )}
                                </button>
                            )}

                            {invoice.status === 'APPROVED' && (
                                <div className="flex-1 inline-flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200/50 rounded-lg text-sm font-medium text-green-700 shadow-md shadow-green-500/10">
                                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                                    Invoice Approved
                                </div>
                            )}
                        </div>

                        {invoice.status === 'APPROVED' && (
                            <div className="mt-3 p-3 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50 rounded-lg shadow-md shadow-green-500/10">
                                <p className="text-xs text-green-800">
                                    <CheckCircleIcon className="w-3 h-3 inline mr-1" />
                                    This invoice has been approved and cannot be changed back to pending status.
                                </p>
                            </div>
                        )}

                        {invoice.status === 'PAID' && (
                            <div className="mt-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 rounded-lg shadow-md shadow-blue-500/10">
                                <p className="text-xs text-blue-800">
                                    <CheckIcon className="w-3 h-3 inline mr-1" />
                                    This invoice has been fully paid.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500/75 backdrop-blur-sm"></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                            &#8203;
                        </span>

                        <div className="inline-block align-bottom bg-white/90 backdrop-blur-xl rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-white/50">
                            <div>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 mb-4">
                                    <CheckCircleIcon className="h-6 w-6 text-amber-600" aria-hidden="true" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Confirm Invoice Approval
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-1">
                                        Are you sure you want to approve this invoice?
                                    </p>
                                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200/50">
                                        <strong>Important:</strong> Once approved, this action cannot be undone and the
                                        invoice status cannot be changed back to pending.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-md px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-sm font-medium text-white hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:col-start-2 transition-all duration-200"
                                    onClick={handleConfirmApproval}
                                    disabled={approving}
                                >
                                    {approving ? <Spinner /> : 'Yes, Approve Invoice'}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 transition-all duration-200"
                                    onClick={() => setShowConfirmModal(false)}
                                    disabled={approving}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Phone Verification Modal */}
            {showPhoneVerification && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500/75 backdrop-blur-sm"></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                            &#8203;
                        </span>

                        <div className="inline-block align-bottom bg-white/90 backdrop-blur-xl rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-white/50">
                            <div>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
                                    <ShieldCheckIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Phone Number Verification
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        For security purposes, please enter the last 4 digits of your phone number to
                                        confirm your identity.
                                    </p>

                                    <div className="mb-4">
                                        <label
                                            htmlFor="phoneVerification"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                            Last 4 digits of your phone number
                                        </label>
                                        <input
                                            type="text"
                                            id="phoneVerification"
                                            maxLength={4}
                                            value={phoneVerificationInput}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                                                setPhoneVerificationInput(value);
                                                setVerificationError(''); // Clear error when user types
                                            }}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="••••"
                                            autoFocus
                                        />
                                        {verificationError && (
                                            <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg p-2 border border-red-200/50">
                                                {verificationError}
                                            </p>
                                        )}
                                    </div>

                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200/50 mb-4">
                                        <p className="text-xs text-blue-800">
                                            <ShieldCheckIcon className="w-3 h-3 inline mr-1" />
                                            This verification ensures only you can approve your invoices.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-md px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-sm font-medium text-white hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={validatePhoneAndApprove}
                                    disabled={phoneVerificationInput.length !== 4 || approving}
                                >
                                    {approving ? <Spinner /> : 'Verify & Approve'}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 transition-all duration-200"
                                    onClick={() => {
                                        setShowPhoneVerification(false);
                                        setPhoneVerificationInput('');
                                        setVerificationError('');
                                    }}
                                    disabled={approving}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverInvoiceApprovalPage;
