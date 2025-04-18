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
        console.log(assignmentDetails);
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
        'block w-full mt-1 border-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2.5 h-11';
    const inputClassWithRoundedLeft =
        'block w-full border-2 border-gray-300 rounded-none shadow-sm focus-within:z-10 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2.5 h-11';

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
            <div className="relative transform overflow-hidden rounded-lg bg-white px-5 pb-5 pt-6 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                    <button
                        type="button"
                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        onClick={onClose}
                    >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>
                <div>
                    <div className="mt-3 text-center sm:mt-0 sm:text-left">
                        <h3 className="text-xl font-bold leading-6 text-gray-900 mb-3">
                            Edit Assignment Charge Details
                        </h3>
                        <div className="text-xs text-gray-500 bg-slate-50 p-2 rounded-md border border-gray-100">
                            <p>Route Distance: {assignmentDetails.routeLeg.distanceMiles.toString()} Miles</p>
                            <p>Route Duration: {assignmentDetails.routeLeg.durationHours.toString()} Hours</p>
                            <p>Load Rate: {formatCurrency(Number(assignmentDetails.load.rate))}</p>
                        </div>
                        <div className="mt-5">
                            <div className="space-y-6">
                                <div className="flex flex-row items-stretch w-full gap-4">
                                    <div className="flex-col flex-grow">
                                        <label
                                            className="block text-sm font-medium text-gray-700 mb-1.5"
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
                                    <div className="flex-col flex-grow">
                                        <label
                                            className="block text-sm font-medium text-gray-700 mb-1.5"
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
                                                max={
                                                    assignmentDetails?.chargeType === ChargeType.PERCENTAGE_OF_LOAD
                                                        ? 100
                                                        : undefined
                                                }
                                                onWheel={(e) => e.currentTarget.blur()}
                                                className={inputClass}
                                            />
                                        )}
                                    </div>
                                </div>
                                {assignmentDetails?.chargeType === ChargeType.PER_MILE && (
                                    <div className="mt-5">
                                        <label
                                            className="block text-sm font-medium text-gray-700 mb-1.5"
                                            htmlFor={`billed-distance-${assignmentDetails.id}`}
                                        >
                                            Billed Distance (Miles)
                                        </label>
                                        <div className="flex rounded-md shadow-sm">
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
                                                className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border-2 border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-11"
                                            >
                                                <span>Reset</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {assignmentDetails?.chargeType === ChargeType.PER_HOUR && (
                                    <div className="mt-5">
                                        <label
                                            className="block text-sm font-medium text-gray-700 mb-1.5"
                                            htmlFor={`billed-duration-${assignmentDetails.id}`}
                                        >
                                            Billed Duration (Hours)
                                        </label>
                                        <div className="flex rounded-md shadow-sm">
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
                                                className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border-2 border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-11"
                                            >
                                                <span>Reset</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {assignmentDetails?.chargeType === ChargeType.PERCENTAGE_OF_LOAD && (
                                    <div className="mt-5">
                                        <label
                                            className="block text-sm font-medium text-gray-700 mb-1.5"
                                            htmlFor={`billed-load-rate-${assignmentDetails.id}`}
                                        >
                                            Billed Load Rate
                                        </label>
                                        <div className="flex rounded-md shadow-sm">
                                            <input
                                                id={`billed-load-rate-${assignmentDetails.id}`}
                                                type="number"
                                                value={
                                                    Number(
                                                        assignmentDetails?.billedLoadRate ||
                                                            assignmentDetails.load.rate,
                                                    ) || ''
                                                }
                                                onChange={(e) =>
                                                    handleAssignmentDetailChange(
                                                        'billedLoadRate',
                                                        Number(e.target.value),
                                                    )
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
                                                className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border-2 border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-11"
                                            >
                                                <span>Reset</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Description */}
                <div className="mt-8 p-4 bg-green-50 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-700 font-medium">Payment: {getPaymentDescription()}</p>
                </div>

                <div className="mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-4">
                    <button
                        type="button"
                        className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:col-start-2"
                        onClick={handleConfirm}
                    >
                        <CheckIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                        Confirm
                    </button>
                    <button
                        type="button"
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
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
