'use client';

import React from 'react';
import { Driver } from '@prisma/client';
import {
    DriverInvoiceLineItem,
    ExpandedDriverAssignment,
    ExpandedDriverInvoice,
    NewDriverInvoice,
} from 'interfaces/models';
import Spinner from 'components/Spinner';

interface InvoiceReviewProps {
    invoice: NewDriverInvoice | ExpandedDriverInvoice;
    allDrivers: Driver[];
    emptyMiles: { [key: string]: number };
    totalAmount: string;
    notifyDriver: boolean;
    setNotifyDriver: (notify: boolean) => void;
    isLoading?: boolean;
    loadingText?: string;
    onPrevStep: () => void;
    onSubmit: () => void;
    submitButtonText: string;
    mode: 'create' | 'edit';
    formatCurrency: (amount: string | number) => string;
}

export const InvoiceReview: React.FC<InvoiceReviewProps> = ({
    invoice,
    allDrivers,
    emptyMiles,
    totalAmount,
    notifyDriver,
    setNotifyDriver,
    isLoading = false,
    loadingText = 'Processing...',
    onPrevStep,
    onSubmit,
    submitButtonText,
    mode,
    formatCurrency,
}) => {
    return (
        <div className="bg-gray-50 p-3 sm:p-6 rounded-lg relative">
            {/* Loading Overlay */}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-6 gap-3 sm:gap-0">
                <div className="flex flex-1 flex-col items-start">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1">
                        {mode === 'create' ? 'Review & Create Invoice' : 'Review & Update Invoice'}
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm font-normal">
                        {mode === 'create'
                            ? 'Review all details before creating the invoice for the driver.'
                            : 'Review all details before updating the invoice.'}
                    </p>
                </div>
            </div>

            {/* Invoice Summary Card */}
            <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4 sm:gap-0">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Invoice Summary</h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                            Period:{' '}
                            {(() => {
                                // Parse date correctly to avoid timezone issues
                                const parseDate = (date: string | Date | null | undefined) => {
                                    if (!date) return null;
                                    if (typeof date === 'string') {
                                        const parts = date.split('-');
                                        if (parts.length === 3) {
                                            const year = parseInt(parts[0], 10);
                                            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                                            const day = parseInt(parts[2], 10);
                                            return new Date(year, month, day);
                                        }
                                        return new Date(date);
                                    }
                                    return date;
                                };

                                const fromDate = parseDate(invoice.fromDate);
                                const toDate = parseDate(invoice.toDate);

                                return `${fromDate?.toLocaleDateString()} - ${toDate?.toLocaleDateString()}`;
                            })()}
                        </p>
                    </div>
                    <div className="text-right bg-green-50/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-green-200/30">
                        <div className="text-xl sm:text-2xl font-bold text-green-600">
                            {formatCurrency(totalAmount)}
                        </div>
                        <p className="text-xs sm:text-sm text-green-600 font-medium">Total Amount</p>
                    </div>
                </div>

                {/* Driver Information */}
                <div className="mb-4 sm:mb-6">
                    <h4 className="font-semibold text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base">
                        Driver Information
                    </h4>
                    <div className="bg-blue-50/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-blue-200/30">
                        <p className="text-sm sm:text-base font-semibold text-blue-900 capitalize mb-1">
                            {allDrivers.find((d) => d.id === invoice.driverId)?.name.toLocaleLowerCase()}
                        </p>
                        <p className="text-xs sm:text-sm text-blue-700">
                            {allDrivers.find((d) => d.id === invoice.driverId)?.email}
                        </p>
                        <p className="text-xs sm:text-sm text-blue-700">
                            {allDrivers.find((d) => d.id === invoice.driverId)?.phone}
                        </p>
                    </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                    <div className="mb-4 sm:mb-6">
                        <h4 className="font-semibold text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base">Notes</h4>
                        <div className="bg-amber-50/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-amber-200/30">
                            <p className="text-xs sm:text-sm text-amber-800">{invoice.notes}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Assignments Table */}
            <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl shadow-sm mb-4 sm:mb-6">
                <div className="p-4 sm:p-6 border-b border-gray-200/30">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Assignments ({invoice.assignments.length})
                    </h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-200/30">
                                <th className="py-3 sm:py-4 px-4 sm:px-6 text-left text-xs font-semibold text-gray-600 tracking-wide">
                                    Order #
                                </th>
                                <th className="py-3 sm:py-4 px-4 sm:px-6 text-left text-xs font-semibold text-gray-600 tracking-wide">
                                    Route
                                </th>
                                <th className="py-3 sm:py-4 px-4 sm:px-6 text-left text-xs font-semibold text-gray-600 tracking-wide whitespace-nowrap">
                                    Charge
                                </th>
                                <th className="py-3 sm:py-4 px-4 sm:px-6 text-left text-xs font-semibold text-gray-600 tracking-wide">
                                    Amount
                                </th>
                                <th className="py-3 sm:py-4 px-4 sm:px-6 text-left text-xs font-semibold text-gray-600 tracking-wide">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/50 backdrop-blur-sm divide-y divide-gray-100/60">
                            {invoice.assignments.map((assignment) => {
                                // Calculate base amount for the assignment
                                let calculatedAmount = 0;
                                let billedMiles = 0;
                                let emptyMilesForAssignment = 0;

                                // Get empty miles for this assignment
                                if (assignment.chargeType === 'PER_MILE') {
                                    billedMiles = Number(
                                        assignment.billedDistanceMiles || assignment.routeLeg.distanceMiles,
                                    );

                                    // Use the emptyMiles from the assignment object if available,
                                    // otherwise fall back to the state
                                    if (assignment.emptyMiles && Number(assignment.emptyMiles) > 0) {
                                        emptyMilesForAssignment = Number(assignment.emptyMiles);
                                    } else {
                                        // Find empty miles for this assignment from state
                                        const emptyMilesKey = Object.keys(emptyMiles).find((key) =>
                                            key.startsWith(`${assignment.id}-to-`),
                                        );
                                        emptyMilesForAssignment = emptyMilesKey ? emptyMiles[emptyMilesKey] : 0;
                                    }

                                    // Total miles including empty miles
                                    const totalMiles = billedMiles + emptyMilesForAssignment;
                                    calculatedAmount = totalMiles * Number(assignment.chargeValue);
                                } else {
                                    // Non-mile based calculations remain the same
                                    switch (assignment.chargeType) {
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
                                }

                                // Format the locations. For each location in the routeLeg, we check if loadStop exists;
                                // if not, we use the nested location object.
                                const formattedLocations = assignment.routeLeg.locations
                                    .map((loc) => {
                                        if (loc.loadStop) {
                                            return `${loc.loadStop.name} (${loc.loadStop.city}, ${loc.loadStop.state})`;
                                        } else if (loc.location) {
                                            return `${loc.location.name} (${loc.location.city}, ${loc.location.state})`;
                                        }
                                        return '';
                                    })
                                    .join(' -> \n');

                                return (
                                    <tr
                                        key={assignment.id}
                                        className="group hover:bg-blue-50/80 transition-all duration-200"
                                    >
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-medium text-gray-900">
                                            {assignment.load.refNum}
                                        </td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm text-gray-700 whitespace-break-spaces leading-relaxed">
                                            {formattedLocations}
                                        </td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm text-gray-700">
                                            <div className="space-y-1">
                                                {assignment.chargeType === 'PER_MILE' && (
                                                    <div>
                                                        <div className="font-medium">
                                                            {billedMiles}mi @ ${String(assignment.chargeValue)}/m
                                                        </div>
                                                        {emptyMilesForAssignment > 0 && (
                                                            <div className="text-amber-600 text-xs">
                                                                + {emptyMilesForAssignment}mi empty miles
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {assignment.chargeType === 'PER_HOUR' && (
                                                    <div className="font-medium">
                                                        ${String(assignment.chargeValue)}/hour
                                                    </div>
                                                )}
                                                {assignment.chargeType === 'PERCENTAGE_OF_LOAD' && (
                                                    <div>
                                                        <div className="font-medium">
                                                            ${String(assignment.billedLoadRate || assignment.load.rate)}{' '}
                                                            @ {String(assignment.chargeValue)}% of load
                                                        </div>
                                                    </div>
                                                )}
                                                {assignment.chargeType === 'FIXED_PAY' && (
                                                    <div className="font-medium">Fixed Pay</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-green-600">
                                            {formatCurrency(calculatedAmount.toFixed(2))}
                                        </td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm text-gray-700">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Completed
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Additional Line Items */}
            <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl shadow-sm mb-4 sm:mb-6">
                <div className="p-4 sm:p-6 border-b border-gray-200/30">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        Additional Line Items ({invoice.lineItems.length})
                    </h4>
                </div>
                {invoice.lineItems.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-200/30">
                                    <th className="py-3 sm:py-4 px-4 sm:px-6 text-left text-xs font-semibold text-gray-600 tracking-wide">
                                        Description
                                    </th>
                                    <th className="py-3 sm:py-4 px-4 sm:px-6 text-right text-xs font-semibold text-gray-600 tracking-wide">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white/50 backdrop-blur-sm divide-y divide-gray-100/60">
                                {invoice.lineItems.map((item) => (
                                    <tr key={item.id} className="group hover:bg-blue-50/80 transition-all duration-200">
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm text-gray-900">
                                            {item.description}
                                        </td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm text-right font-semibold">
                                            <span
                                                className={
                                                    Number.parseFloat(item.amount) >= 0
                                                        ? 'text-green-600'
                                                        : 'text-red-600'
                                                }
                                            >
                                                {Number.parseFloat(item.amount) >= 0
                                                    ? formatCurrency(item.amount)
                                                    : `(${formatCurrency(
                                                          Math.abs(Number.parseFloat(item.amount)).toString(),
                                                      )})`}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-4 sm:p-6 text-center">
                        <p className="text-xs sm:text-sm text-gray-500 italic">No additional line items</p>
                    </div>
                )}
            </div>

            {/* Driver Notification Toggle */}
            <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                    <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">Driver Notification</h4>
                        <p className="text-xs sm:text-sm text-blue-700">
                            {mode === 'create'
                                ? 'Automatically notify the driver about this invoice for approval.'
                                : 'Automatically notify the driver about the invoice update.'}
                            {(() => {
                                const selectedDriver = allDrivers.find((d) => d.id === invoice.driverId);
                                if (selectedDriver?.email) {
                                    return ` Email will be sent to ${selectedDriver.email}.`;
                                } else if (selectedDriver?.phone) {
                                    return ` SMS will be sent to ${selectedDriver.phone}.`;
                                } else {
                                    return ' No contact method available for this driver.';
                                }
                            })()}
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifyDriver}
                                onChange={(e) => setNotifyDriver(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
                <button
                    onClick={onPrevStep}
                    className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                    Back
                </button>
                <button
                    onClick={onSubmit}
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
                >
                    {submitButtonText}
                </button>
            </div>
        </div>
    );
};
