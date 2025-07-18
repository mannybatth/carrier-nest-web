'use client';
/* eslint-disable react/prop-types */

import React, { useRef, useState, useEffect } from 'react';
import Decimal from 'decimal.js';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { ExpandedDriverAssignment } from 'interfaces/models';

// Define the ChargeType enum
enum ChargeType {
    PER_MILE = 'PER_MILE',
    PER_HOUR = 'PER_HOUR',
    FIXED_PAY = 'FIXED_PAY',
    PERCENTAGE_OF_LOAD = 'PERCENTAGE_OF_LOAD',
}

// Define the props for the dialog
export interface AssignmentChargeTypeChangeDialogProps {
    assignmentDetails: ExpandedDriverAssignment;
    onConfirm: (updatedAssignmentDetails: ExpandedDriverAssignment) => void;
    onClose: () => void;
}

// Format currency helper function
const formatCurrency = (value?: number): string => {
    if (value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const AssignmentChargeTypeChangeDialog: React.FC<AssignmentChargeTypeChangeDialogProps> = ({
    assignmentDetails: initialAssignmentDetails,
    onConfirm,
    onClose,
}) => {
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    // Local state is initialized from props and will update if the prop changes
    const [assignmentDetails, setAssignmentDetails] = useState<ExpandedDriverAssignment>(initialAssignmentDetails);

    useEffect(() => {
        setAssignmentDetails(initialAssignmentDetails);
    }, [initialAssignmentDetails]);

    const handleChargeTypeChange = (value: ChargeType) => {
        switch (value) {
            case ChargeType.PER_MILE:
                setAssignmentDetails({
                    ...assignmentDetails,
                    chargeType: value,
                    billedDurationHours: new Decimal(0),
                    billedLoadRate: new Decimal(0),

                    chargeValue: new Decimal(getChargeValue(value)),
                });
                break;
            case ChargeType.PER_HOUR:
                setAssignmentDetails({
                    ...assignmentDetails,
                    chargeType: value,
                    billedDistanceMiles: new Decimal(0),
                    billedLoadRate: new Decimal(0),

                    chargeValue: new Decimal(getChargeValue(value)),
                });
                break;
            case ChargeType.FIXED_PAY:
                setAssignmentDetails({
                    ...assignmentDetails,
                    chargeType: value,
                    billedDistanceMiles: new Decimal(0),
                    billedDurationHours: new Decimal(0),
                    billedLoadRate: new Decimal(0),

                    chargeValue: new Decimal(getChargeValue(value)),
                });
                break;
            case ChargeType.PERCENTAGE_OF_LOAD:
                setAssignmentDetails({
                    ...assignmentDetails,
                    chargeType: value,
                    billedDistanceMiles: new Decimal(0),
                    billedDurationHours: new Decimal(0),

                    chargeValue: new Decimal(getChargeValue(value)),
                });
                break;
            default:
                break;
        }

        setAssignmentDetails({
            ...assignmentDetails,
            chargeType: value,

            chargeValue: new Decimal(getChargeValue(value)),
        });
    };

    const handleAssignmentDetailChange = (field: keyof ExpandedDriverAssignment, value: number) => {
        setAssignmentDetails({
            ...assignmentDetails,
            [field]: value,
        });
    };

    const resetFieldToAssignmentValue = (field: keyof ExpandedDriverAssignment) => {
        // You can adjust these default values or use a value from props if needed

        setAssignmentDetails((prev) => ({
            ...prev,
            billedDistanceMiles: assignmentDetails.routeLeg.distanceMiles,
            billedDurationHours: assignmentDetails.routeLeg.durationHours,
            billedLoadRate: assignmentDetails.load.rate,
        }));
    };

    const handleConfirm = () => {
        // console.log(assignmentDetails);
        onConfirm(assignmentDetails);
    };

    // Calculate total pay based on charge type
    const calculateTotalPay = (): number => {
        if (!assignmentDetails.chargeValue) return 0;
        switch (assignmentDetails.chargeType) {
            case ChargeType.PER_MILE:
                return (
                    (Number(assignmentDetails.chargeValue) || 0) *
                    (Number(assignmentDetails.billedDistanceMiles || assignmentDetails.routeLeg.distanceMiles) || 0)
                );
            case ChargeType.PER_HOUR:
                return (
                    (Number(assignmentDetails.chargeValue) || 0) *
                    (Number(assignmentDetails.billedDurationHours || assignmentDetails.routeLeg.durationHours) || 0)
                );
            case ChargeType.FIXED_PAY:
                return Number(assignmentDetails.chargeValue) || 0;
            case ChargeType.PERCENTAGE_OF_LOAD:
                return (
                    ((Number(assignmentDetails.chargeValue) || 0) / 100) *
                    (Number(assignmentDetails.billedLoadRate || assignmentDetails.load.rate) || 0)
                );
            default:
                return 0;
        }
    };

    const totalPay = calculateTotalPay();

    const getPaymentDescription = () => {
        switch (assignmentDetails.chargeType) {
            case ChargeType.PER_MILE:
                return (
                    <>
                        <b>${Number(assignmentDetails.chargeValue)}/mile</b> for{' '}
                        {assignmentDetails.billedDistanceMiles || assignmentDetails.routeLeg.distanceMiles} miles,
                        totaling {formatCurrency(totalPay)}
                    </>
                );
            case ChargeType.PER_HOUR:
                return (
                    <>
                        <b>${Number(assignmentDetails.chargeValue)}/hr</b> for{' '}
                        {assignmentDetails.billedDurationHours || assignmentDetails.routeLeg.durationHours} hours,
                        totaling {formatCurrency(totalPay)}
                    </>
                );
            case ChargeType.FIXED_PAY:
                return <>Fixed pay of {formatCurrency(Number(assignmentDetails.chargeValue))}</>;
            case ChargeType.PERCENTAGE_OF_LOAD:
                return (
                    <>
                        <b>{Number(assignmentDetails.chargeValue)}%</b> of load rate (
                        {formatCurrency(Number(assignmentDetails.billedLoadRate || assignmentDetails.load.rate))}),
                        totaling {formatCurrency(totalPay)}
                    </>
                );
            default:
                return '';
        }
    };

    const getChargeValueLabel = () => {
        switch (assignmentDetails?.chargeType) {
            case ChargeType.PER_MILE:
                return 'Rate Per Mile';
            case ChargeType.PER_HOUR:
                return 'Rate Per Hour';
            case ChargeType.FIXED_PAY:
                return 'Fixed Pay Amount';
            case ChargeType.PERCENTAGE_OF_LOAD:
                return 'Percentage (%)';
            default:
                return 'Rate';
        }
    };

    const getChargeValuePlaceholder = () => {
        switch (assignmentDetails?.chargeType) {
            case ChargeType.PER_MILE:
                return 'Enter rate per mile';
            case ChargeType.PER_HOUR:
                return 'Enter rate per hour';
            case ChargeType.FIXED_PAY:
                return 'Enter fixed amount';
            case ChargeType.PERCENTAGE_OF_LOAD:
                return 'Enter percentage';
            default:
                return 'Enter rate';
        }
    };

    const chargeValueLabel = getChargeValueLabel();
    const chargeValuePlaceholder = getChargeValuePlaceholder();

    const getChargeValue = (type: ChargeType) => {
        switch (type) {
            case ChargeType.PER_MILE:
                return Number(assignmentDetails?.driver.perMileRate || 0);
            case ChargeType.PER_HOUR:
                return Number(assignmentDetails?.driver.perHourRate || 0);
            case ChargeType.FIXED_PAY:
                return Number(assignmentDetails?.chargeValue || 0);
            case ChargeType.PERCENTAGE_OF_LOAD:
                return Number(assignmentDetails?.driver.takeHomePercent || 0);
            default:
                return 0;
        }
    };

    // Common input classes
    const inputClass =
        'w-full p-3 bg-white/70 backdrop-blur-sm border border-gray-300/60 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all duration-200 text-sm';
    const inputClassWithRoundedLeft =
        'w-full p-3 bg-white/70 backdrop-blur-sm border border-gray-300/60 rounded-l-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all duration-200 text-sm focus:z-10';

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm z-50">
            <div className="relative transform overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                    <button
                        type="button"
                        className="rounded-full bg-white/10 p-2 text-gray-500 hover:bg-white/20 hover:text-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        onClick={onClose}
                    >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
                <div>
                    <div className="mt-3 text-center sm:mt-0 sm:text-left">
                        <h3 className="text-xl font-semibold leading-6 text-gray-900 mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Edit Assignment Charge Details
                        </h3>
                        <div className="text-sm text-gray-600 bg-gray-50/80 backdrop-blur-sm p-3 rounded-lg border border-gray-200/60 mb-6">
                            <div className="grid grid-cols-1 gap-2">
                                <p>
                                    <span className="font-medium">Route Distance:</span>{' '}
                                    {assignmentDetails.routeLeg.distanceMiles.toString()} Miles
                                </p>
                                <p>
                                    <span className="font-medium">Route Duration:</span>{' '}
                                    {assignmentDetails.routeLeg.durationHours.toString()} Hours
                                </p>
                                <p>
                                    <span className="font-medium">Load Rate:</span>{' '}
                                    {formatCurrency(Number(assignmentDetails.load.rate))}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                        htmlFor={`charge-type-${assignmentDetails.id}`}
                                    >
                                        Charge Type
                                    </label>
                                    <select
                                        id={`charge-type-${assignmentDetails.id}`}
                                        value={assignmentDetails?.chargeType || ''}
                                        onChange={(e) => handleChargeTypeChange(e.target.value as ChargeType)}
                                        className={inputClass}
                                    >
                                        <option value="" disabled>
                                            Select Pay Type
                                        </option>
                                        <option value={ChargeType.PER_MILE}>Per Mile</option>
                                        <option value={ChargeType.PER_HOUR}>Per Hour</option>
                                        <option value={ChargeType.FIXED_PAY}>Fixed Pay</option>
                                        <option value={ChargeType.PERCENTAGE_OF_LOAD}>Percentage of Load</option>
                                    </select>
                                </div>
                                <div>
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                        htmlFor={`charge-value-${assignmentDetails.id}`}
                                    >
                                        {chargeValueLabel}
                                    </label>
                                    {assignmentDetails.chargeType && (
                                        <input
                                            id={`charge-value-${assignmentDetails.id}`}
                                            type="number"
                                            value={Number(assignmentDetails.chargeValue) || ''}
                                            onChange={(e) =>
                                                handleAssignmentDetailChange('chargeValue', Number(e.target.value))
                                            }
                                            placeholder={chargeValuePlaceholder}
                                            step="any"
                                            min="0"
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className={inputClass}
                                        />
                                    )}
                                </div>
                            </div>
                            {assignmentDetails?.chargeType === ChargeType.PER_MILE && (
                                <div className="space-y-4">
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                        htmlFor={`billed-distance-${assignmentDetails.id}`}
                                    >
                                        Billed Distance (Miles)
                                    </label>
                                    <div className="flex rounded-lg overflow-hidden bg-white/50 backdrop-blur-sm border border-gray-300/60">
                                        <input
                                            id={`billed-distance-${assignmentDetails.id}`}
                                            type="number"
                                            defaultValue={
                                                Number(
                                                    assignmentDetails.billedDistanceMiles ||
                                                        assignmentDetails?.routeLeg.distanceMiles,
                                                ) || ''
                                            }
                                            onChange={(e) =>
                                                handleAssignmentDetailChange(
                                                    'billedDistanceMiles',
                                                    Number(e.target.value),
                                                )
                                            }
                                            placeholder="Billed Distance"
                                            step="any"
                                            min="0"
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className={inputClassWithRoundedLeft}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => resetFieldToAssignmentValue('billedDistanceMiles')}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50/80 backdrop-blur-sm border-l border-gray-300/60 hover:bg-gray-100/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-200"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            )}
                            {assignmentDetails?.chargeType === ChargeType.PER_HOUR && (
                                <div className="space-y-4">
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                        htmlFor={`billed-duration-${assignmentDetails.id}`}
                                    >
                                        Billed Duration (Hours)
                                    </label>
                                    <div className="flex rounded-lg overflow-hidden bg-white/50 backdrop-blur-sm border border-gray-300/60">
                                        <input
                                            id={`billed-duration-${assignmentDetails.id}`}
                                            type="number"
                                            defaultValue={
                                                Number(
                                                    assignmentDetails.billedDurationHours ||
                                                        assignmentDetails?.routeLeg.durationHours,
                                                ) || ''
                                            }
                                            onChange={(e) =>
                                                handleAssignmentDetailChange(
                                                    'billedDurationHours',
                                                    Number(e.target.value),
                                                )
                                            }
                                            placeholder="Billed Duration"
                                            step="any"
                                            min="0"
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className={inputClassWithRoundedLeft}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => resetFieldToAssignmentValue('billedDurationHours')}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50/80 backdrop-blur-sm border-l border-gray-300/60 hover:bg-gray-100/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-200"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            )}
                            {assignmentDetails?.chargeType === ChargeType.PERCENTAGE_OF_LOAD && (
                                <div className="space-y-4">
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                        htmlFor={`billed-load-rate-${assignmentDetails.id}`}
                                    >
                                        Billed Load Rate
                                    </label>
                                    <div className="flex rounded-lg overflow-hidden bg-white/50 backdrop-blur-sm border border-gray-300/60">
                                        <input
                                            id={`billed-load-rate-${assignmentDetails.id}`}
                                            type="number"
                                            value={
                                                Number(
                                                    assignmentDetails?.billedLoadRate || assignmentDetails.load.rate,
                                                ) || ''
                                            }
                                            onChange={(e) =>
                                                handleAssignmentDetailChange('billedLoadRate', Number(e.target.value))
                                            }
                                            placeholder="Billed Load Rate"
                                            step="any"
                                            min="0"
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className={inputClassWithRoundedLeft}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => resetFieldToAssignmentValue('billedLoadRate')}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50/80 backdrop-blur-sm border-l border-gray-300/60 hover:bg-gray-100/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-200"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payment Description */}
                <div className="mt-6 p-4 bg-green-50/80 backdrop-blur-sm rounded-lg border border-green-200/60">
                    <p className="text-sm text-gray-700 font-medium">Payment: {getPaymentDescription()}</p>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-200"
                        onClick={handleConfirm}
                    >
                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                        Confirm Changes
                    </button>
                    <button
                        type="button"
                        className="flex-1 inline-flex justify-center items-center rounded-lg bg-white/70 backdrop-blur-sm px-4 py-3 text-sm font-medium text-gray-700 border border-gray-300/60 hover:bg-gray-50/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-200"
                        onClick={onClose}
                        ref={cancelButtonRef}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignmentChargeTypeChangeDialog;
