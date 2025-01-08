import React from 'react';
import { ChargeType, Prisma } from '@prisma/client';
import { ExpandedDriverAssignment } from '../../../interfaces/models';

export interface AssignmentDetails {
    assignment: ExpandedDriverAssignment;
    chargeType: ChargeType;
    chargeValue: number;
    billedDistanceMiles: number | null;
    billedDurationHours: number | null;
    billedLoadRate: number | null;
}

interface AssignmentDetailsProps {
    assignmentDetails: AssignmentDetails;
    editMode: boolean;
    allowEditMode: boolean;
    toggleEditMode: (assignmentId: string) => void;
    handleAssignmentDetailChange: (
        assignmentDetail: AssignmentDetails,
        field: keyof AssignmentDetails,
        value: number | Prisma.Decimal | ChargeType | null,
    ) => void;
    resetFieldToAssignmentValue: (assignmentDetail: AssignmentDetails, field: keyof AssignmentDetails) => void;
}

const getStatusStyles = (status: string) => {
    switch (status) {
        case 'paid':
            return { textColor: 'text-green-800', bgColor: 'bg-green-100' };
        case 'not paid':
            return { textColor: 'text-red-800', bgColor: 'bg-red-100' };
        default:
            return { textColor: 'text-gray-800', bgColor: 'bg-gray-100' };
    }
};

const getPayStatus = (assignment: ExpandedDriverAssignment) => {
    if (assignment.assignmentPayments && assignment.assignmentPayments.length > 0) {
        return 'paid';
    } else {
        return 'not paid';
    }
};

const AssignmentDetailsSection: React.FC<AssignmentDetailsProps> = ({
    assignmentDetails,
    editMode,
    allowEditMode,
    toggleEditMode,
    handleAssignmentDetailChange,
    resetFieldToAssignmentValue,
}) => {
    const handleChargeTypeChange = (assignmentDetail: AssignmentDetails, newChargeType: ChargeType) => {
        let newChargeValue = 0;
        if (newChargeType === assignmentDetail.assignment.chargeType) {
            newChargeValue = new Prisma.Decimal(assignmentDetail.assignment.chargeValue).toNumber();
        } else {
            switch (newChargeType) {
                case ChargeType.PER_MILE:
                    newChargeValue = new Prisma.Decimal(
                        assignmentDetail.assignment.driver?.perMileRate || 0,
                    ).toNumber();
                    break;
                case ChargeType.PER_HOUR:
                    newChargeValue = new Prisma.Decimal(
                        assignmentDetail.assignment.driver?.perHourRate || 0,
                    ).toNumber();
                    break;
                case ChargeType.FIXED_PAY:
                    newChargeValue = new Prisma.Decimal(
                        assignmentDetail.assignment.driver?.defaultFixedPay || 0,
                    ).toNumber();
                    break;
                case ChargeType.PERCENTAGE_OF_LOAD:
                    newChargeValue = new Prisma.Decimal(
                        assignmentDetail.assignment.driver?.takeHomePercent || 0,
                    ).toNumber();
                    break;
                default:
                    newChargeValue = 0;
            }
        }
        handleAssignmentDetailChange(assignmentDetail, 'chargeType', newChargeType);
        handleAssignmentDetailChange(assignmentDetail, 'chargeValue', newChargeValue);
    };

    const getPaymentDescription = () => {
        switch (assignmentDetails.chargeType) {
            case ChargeType.PER_MILE:
                return (
                    <>
                        <b>${assignmentDetails.chargeValue}/mile</b> for {assignmentDetails.billedDistanceMiles} miles
                    </>
                );
            case ChargeType.PER_HOUR:
                return (
                    <>
                        <b>${assignmentDetails.chargeValue}/hr</b> for {assignmentDetails.billedDurationHours} hours
                    </>
                );
            case ChargeType.FIXED_PAY:
                return <>fixed pay of ${assignmentDetails.chargeValue}</>;
            case ChargeType.PERCENTAGE_OF_LOAD:
                return (
                    <>
                        <b>{assignmentDetails.chargeValue}%</b> of load rate (${assignmentDetails.billedLoadRate})
                    </>
                );
            default:
                return '';
        }
    };

    return (
        <div className="relative mt-8 border rounded-lg bg-neutral-50">
            <div className="absolute px-2 text-sm font-medium text-gray-700 bg-white -top-3 left-3">
                Load #: {assignmentDetails.assignment.load.refNum}
            </div>
            <div className="absolute px-2 text-sm font-medium -top-3 right-3">
                <PayStatusBadge status={getPayStatus(assignmentDetails.assignment)} />
            </div>
            <div className="p-4">
                {!editMode ? (
                    <div className="text-sm">
                        <p>Driver is paid {getPaymentDescription()}</p>
                        {allowEditMode && (
                            <button
                                type="button"
                                className="mt-2 text-sm text-blue-600 hover:underline"
                                onClick={() => toggleEditMode(assignmentDetails.assignment.id)}
                            >
                                Edit
                            </button>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="flex flex-row items-stretch w-full gap-2 mt-2">
                            <div className="flex-col flex-grow">
                                <label
                                    className="block text-sm font-medium text-gray-700"
                                    htmlFor={`charge-type-${assignmentDetails.assignment.id}`}
                                >
                                    Charge Type
                                </label>
                                <select
                                    id={`charge-type-${assignmentDetails.assignment.id}`}
                                    value={assignmentDetails?.chargeType || ''}
                                    onChange={(e) =>
                                        handleChargeTypeChange(assignmentDetails, e.target.value as ChargeType)
                                    }
                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                                    className="block text-sm font-medium text-gray-700"
                                    htmlFor={`charge-value-${assignmentDetails.assignment.id}`}
                                >
                                    Charge Value
                                </label>
                                <input
                                    id={`charge-value-${assignmentDetails.assignment.id}`}
                                    type="number"
                                    value={assignmentDetails?.chargeValue || ''}
                                    onChange={(e) =>
                                        handleAssignmentDetailChange(
                                            assignmentDetails,
                                            'chargeValue',
                                            Number(e.target.value),
                                        )
                                    }
                                    placeholder="Charge Value"
                                    step="any"
                                    min="0"
                                    max={
                                        assignmentDetails?.chargeType === ChargeType.PERCENTAGE_OF_LOAD
                                            ? 100
                                            : undefined
                                    }
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>
                        {assignmentDetails?.chargeType === ChargeType.PER_MILE && (
                            <div className="mt-4">
                                <label
                                    className="block text-sm font-medium text-gray-700"
                                    htmlFor={`billed-distance-${assignmentDetails.assignment.id}`}
                                >
                                    Billed Distance (Miles)
                                </label>
                                <div className="flex mt-1 rounded-md shadow-sm">
                                    <input
                                        id={`billed-distance-${assignmentDetails.assignment.id}`}
                                        type="number"
                                        value={assignmentDetails?.billedDistanceMiles || ''}
                                        onChange={(e) =>
                                            handleAssignmentDetailChange(
                                                assignmentDetails,
                                                'billedDistanceMiles',
                                                Number(e.target.value),
                                            )
                                        }
                                        placeholder="Billed Distance"
                                        step="any"
                                        min="0"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="block w-full border-gray-300 rounded-none shadow-sm focus-within:z-10 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            resetFieldToAssignmentValue(assignmentDetails, 'billedDistanceMiles')
                                        }
                                        className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <span>Reset</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {assignmentDetails?.chargeType === ChargeType.PER_HOUR && (
                            <div className="mt-4">
                                <label
                                    className="block text-sm font-medium text-gray-700"
                                    htmlFor={`billed-duration-${assignmentDetails.assignment.id}`}
                                >
                                    Billed Duration (Hours)
                                </label>
                                <div className="flex mt-1 rounded-md shadow-sm">
                                    <input
                                        id={`billed-duration-${assignmentDetails.assignment.id}`}
                                        type="number"
                                        value={assignmentDetails?.billedDurationHours || ''}
                                        onChange={(e) =>
                                            handleAssignmentDetailChange(
                                                assignmentDetails,
                                                'billedDurationHours',
                                                Number(e.target.value),
                                            )
                                        }
                                        placeholder="Billed Duration"
                                        step="any"
                                        min="0"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="block w-full border-gray-300 rounded-none shadow-sm focus-within:z-10 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            resetFieldToAssignmentValue(assignmentDetails, 'billedDurationHours')
                                        }
                                        className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <span>Reset</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {assignmentDetails?.chargeType === ChargeType.PERCENTAGE_OF_LOAD && (
                            <div className="mt-4">
                                <label
                                    className="block text-sm font-medium text-gray-700"
                                    htmlFor={`billed-load-rate-${assignmentDetails.assignment.id}`}
                                >
                                    Billed Load Rate
                                </label>
                                <div className="flex mt-1 rounded-md shadow-sm">
                                    <input
                                        id={`billed-load-rate-${assignmentDetails.assignment.id}`}
                                        type="number"
                                        value={assignmentDetails?.billedLoadRate || ''}
                                        onChange={(e) =>
                                            handleAssignmentDetailChange(
                                                assignmentDetails,
                                                'billedLoadRate',
                                                Number(e.target.value),
                                            )
                                        }
                                        placeholder="Billed Load Rate"
                                        step="any"
                                        min="0"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="block w-full border-gray-300 rounded-none shadow-sm focus-within:z-10 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => resetFieldToAssignmentValue(assignmentDetails, 'billedLoadRate')}
                                        className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <span>Reset</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            className="mt-2 text-sm text-blue-600 hover:underline"
                            onClick={() => toggleEditMode(assignmentDetails.assignment.id)}
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const PayStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const { textColor, bgColor } = getStatusStyles(status);
    return (
        <span
            className={`inline-flex px-2 text-xs font-semibold leading-5 ${textColor} uppercase ${bgColor} rounded-full whitespace-nowrap`}
        >
            {status}
        </span>
    );
};

export default AssignmentDetailsSection;
