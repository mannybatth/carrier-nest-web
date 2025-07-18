import React from 'react';
import {
    UserIcon,
    ClipboardDocumentListIcon,
    CurrencyDollarIcon,
    DocumentCheckIcon,
} from '@heroicons/react/24/outline';

export interface StepperStep {
    id: number;
    title: string;
    description: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    isCompleted?: boolean;
}

export interface StepperProps {
    currentStep: number;
    steps: StepperStep[];
    showMileCalculationStep?: boolean;
    mode?: 'create' | 'edit';
}

const InvoiceStepper: React.FC<StepperProps> = ({
    currentStep,
    steps,
    showMileCalculationStep = false,
    mode = 'create',
}) => {
    const getStepStatus = (stepId: number) => {
        if (currentStep > stepId) {
            return 'completed';
        } else if (currentStep === stepId) {
            return 'current';
        } else {
            return 'pending';
        }
    };

    const getStepClasses = (stepId: number) => {
        const status = getStepStatus(stepId);

        switch (status) {
            case 'completed':
                return 'bg-blue-600 text-white shadow-lg scale-110';
            case 'current':
                return stepId === 4
                    ? 'bg-green-600 text-white shadow-lg scale-110 ring-4 ring-green-200 ring-opacity-50'
                    : 'bg-blue-600 text-white shadow-lg scale-110 ring-4 ring-blue-200 ring-opacity-50';
            default:
                return 'bg-gray-100 text-gray-400';
        }
    };

    const getTextClasses = (stepId: number) => {
        const status = getStepStatus(stepId);

        switch (status) {
            case 'completed':
                return 'text-gray-900';
            case 'current':
                return stepId === 4 ? 'text-green-600 font-semibold' : 'text-blue-600 font-semibold';
            default:
                return 'text-gray-400';
        }
    };

    const getConnectorClasses = (stepId: number) => {
        return currentStep > stepId ? 'w-full' : 'w-0';
    };

    const renderMileCalculationStep = () => {
        if (!showMileCalculationStep) return null;

        return (
            <>
                {/* Connector 2.5 */}
                <div className="flex-1 mx-4 h-0.5 bg-gray-200 relative">
                    <div
                        className={`absolute left-0 top-0 h-full bg-blue-600 transition-all duration-500 ${
                            currentStep >= 2.5 ? 'w-full' : 'w-0'
                        }`}
                    ></div>
                </div>

                {/* Step 2.5 */}
                <div className="flex flex-col items-center group">
                    <div className="relative">
                        <div
                            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                                currentStep >= 2.5
                                    ? currentStep === 2.5
                                        ? 'bg-blue-600 text-white shadow-lg scale-110 ring-4 ring-blue-200 ring-opacity-50'
                                        : 'bg-blue-600 text-white shadow-lg scale-110'
                                    : 'bg-gray-100 text-gray-400'
                            }`}
                        >
                            {currentStep > 2.5 ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                    />
                                </svg>
                            )}
                        </div>
                    </div>
                    <div className="mt-3 text-center">
                        <div
                            className={`text-sm font-medium transition-colors duration-300 ${
                                currentStep === 2.5
                                    ? 'text-blue-600 font-semibold'
                                    : currentStep > 2.5
                                    ? 'text-gray-900'
                                    : 'text-gray-400'
                            }`}
                        >
                            Calculate Miles
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Route & empty miles</div>
                    </div>
                </div>

                {/* Connector after mile calculation step */}
                <div className="flex-1 mx-4 h-0.5 bg-gray-200 relative">
                    <div
                        className={`absolute left-0 top-0 h-full bg-blue-600 transition-all duration-500 ${
                            currentStep > 2.5 ? 'w-full' : 'w-0'
                        }`}
                    ></div>
                </div>
            </>
        );
    };

    const getStepTitle = (stepId: number) => {
        if (mode === 'edit') {
            switch (stepId) {
                case 1:
                    return 'Edit Assignments';
                case 2:
                    return 'Calculate Miles';
                case 3:
                    return 'Additional Items';
                case 4:
                    return 'Review & Update';
                default:
                    return steps.find((s) => s.id === stepId)?.title || '';
            }
        } else {
            return steps.find((s) => s.id === stepId)?.title || '';
        }
    };

    const getStepDescription = (stepId: number) => {
        if (mode === 'edit') {
            switch (stepId) {
                case 1:
                    return 'Modify assignments';
                case 2:
                    return 'Route & empty miles';
                case 3:
                    return 'Add line items';
                case 4:
                    return 'Final review';
                default:
                    return steps.find((s) => s.id === stepId)?.description || '';
            }
        } else {
            return steps.find((s) => s.id === stepId)?.description || '';
        }
    };

    const getCurrentStepForDisplay = () => {
        if (currentStep === 2.5) return 3;
        return Math.ceil(currentStep);
    };

    const getCurrentStepLabel = () => {
        if (mode === 'edit') {
            switch (currentStep) {
                case 1:
                    return 'Edit Assignments';
                case 2.5:
                    return 'Calculate Miles';
                case 3:
                    return 'Additional Items';
                case 4:
                    return 'Review & Update';
                default:
                    return '';
            }
        } else {
            switch (currentStep) {
                case 1:
                    return 'Select Driver';
                case 2:
                    return 'Select Assignments';
                case 2.5:
                    return 'Calculate Miles';
                case 3:
                    return 'Additional Items';
                case 4:
                    return 'Review & Create';
                default:
                    return '';
            }
        }
    };

    return (
        <div className="mb-4 sm:mb-8 mx-2 sm:mx-4 lg:mx-6">
            {/* Mobile Progress Bar */}
            <div className="sm:hidden mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-900">
                        Step {getCurrentStepForDisplay()} of 4
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500">{getCurrentStepLabel()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div
                        className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-500 ease-out"
                        style={{
                            width: `${((currentStep === 2.5 ? 2.5 : currentStep) / 4) * 100}%`,
                        }}
                    ></div>
                </div>
            </div>

            {/* Desktop Stepper */}
            <div className="hidden sm:flex items-center justify-center">
                {steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                        {/* Step */}
                        <div className="flex flex-col items-center group">
                            <div className="relative">
                                <div
                                    className={`flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-full transition-all duration-300 ${getStepClasses(
                                        step.id,
                                    )}`}
                                >
                                    {getStepStatus(step.id) === 'completed' ? (
                                        <svg
                                            className="w-4 h-4 lg:w-6 lg:h-6"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    ) : (
                                        <step.icon className="w-6 h-6" />
                                    )}
                                </div>
                            </div>
                            <div className="mt-3 text-center">
                                <div
                                    className={`text-sm font-medium transition-colors duration-300 ${getTextClasses(
                                        step.id,
                                    )}`}
                                >
                                    {getStepTitle(step.id)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{getStepDescription(step.id)}</div>
                            </div>
                        </div>

                        {/* Connector */}
                        {index < steps.length - 1 && (
                            <>
                                {/* Mile Calculation Step after step 1 in edit mode or step 2 in create mode */}
                                {((mode === 'edit' && step.id === 1) || (mode === 'create' && step.id === 2)) &&
                                    renderMileCalculationStep()}

                                {/* Regular connector - but skip it after step 1 in edit mode or step 2 in create mode if mile calculation is shown */}
                                {!(
                                    ((mode === 'edit' && step.id === 1) || (mode === 'create' && step.id === 2)) &&
                                    showMileCalculationStep
                                ) && (
                                    <div className="flex-1 mx-4 h-0.5 bg-gray-200 relative">
                                        <div
                                            className={`absolute left-0 top-0 h-full bg-blue-600 transition-all duration-500 ${getConnectorClasses(
                                                step.id,
                                            )}`}
                                        ></div>
                                    </div>
                                )}
                            </>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default InvoiceStepper;
