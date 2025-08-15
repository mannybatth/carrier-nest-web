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
        <div className="mb-6">
            {/* Mobile Stepper - Compact and Clean */}
            <div className="block lg:hidden mx-4 sm:mx-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-sm p-4">
                    {/* Progress Info */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                <span className="text-sm font-semibold">{getCurrentStepForDisplay()}</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">{getCurrentStepLabel()}</h3>
                                <p className="text-xs text-gray-500">
                                    Step {getCurrentStepForDisplay()} of {showMileCalculationStep ? 5 : 4}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500">Progress</div>
                            <div className="text-sm font-semibold text-blue-600">
                                {Math.round(
                                    ((currentStep === 2.5 ? 2.5 : currentStep) / (showMileCalculationStep ? 5 : 4)) *
                                        100,
                                )}
                                %
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200/70 rounded-full h-1.5">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${
                                    ((currentStep === 2.5 ? 2.5 : currentStep) / (showMileCalculationStep ? 5 : 4)) *
                                    100
                                }%`,
                            }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Desktop Stepper - Compact Horizontal Flow */}
            <div className="hidden lg:block ">
                <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-sm py-4 px-8">
                    <div className="flex items-center justify-between">
                        {/* Steps Container */}
                        <div className="flex items-center space-x-1 flex-1">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    {/* Step */}
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                                                getStepStatus(step.id) === 'completed'
                                                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm'
                                                    : getStepStatus(step.id) === 'current'
                                                    ? step.id === 4
                                                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm'
                                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                                                    : 'bg-gray-100 text-gray-400'
                                            }`}
                                        >
                                            {getStepStatus(step.id) === 'completed' ? (
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2.5}
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            ) : (
                                                <span className="text-sm font-semibold">{step.id}</span>
                                            )}
                                        </div>
                                        <div className="text-sm">
                                            <div className={`font-medium ${getTextClasses(step.id)}`}>
                                                {getStepTitle(step.id)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mile Calculation Step */}
                                    {((mode === 'edit' && step.id === 1) || (mode === 'create' && step.id === 2)) &&
                                        showMileCalculationStep &&
                                        index < steps.length - 1 && (
                                            <>
                                                {/* Connector */}
                                                <div className="flex-1 h-px bg-gray-200 mx-2 min-w-4"></div>

                                                {/* Mile Step */}
                                                <div className="flex items-center space-x-2">
                                                    <div
                                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                                                            currentStep > 2.5
                                                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm'
                                                                : currentStep === 2.5
                                                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm'
                                                                : 'bg-gray-100 text-gray-400'
                                                        }`}
                                                    >
                                                        {currentStep > 2.5 ? (
                                                            <svg
                                                                className="w-4 h-4"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2.5}
                                                                    d="M5 13l4 4L19 7"
                                                                />
                                                            </svg>
                                                        ) : (
                                                            <svg
                                                                className="w-4 h-4"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7"
                                                                />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="text-sm">
                                                        <div
                                                            className={`font-medium ${
                                                                currentStep > 2.5
                                                                    ? 'text-green-700'
                                                                    : currentStep === 2.5
                                                                    ? 'text-purple-600'
                                                                    : 'text-gray-400'
                                                            }`}
                                                        >
                                                            Calculate Miles
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                    {/* Connector */}
                                    {index < steps.length - 1 &&
                                        !(
                                            ((mode === 'edit' && step.id === 1) ||
                                                (mode === 'create' && step.id === 2)) &&
                                            showMileCalculationStep
                                        ) && <div className="flex-1 h-px bg-gray-200 mx-2 min-w-4"></div>}

                                    {/* Final connector after mile calculation */}
                                    {((mode === 'edit' && step.id === 1) || (mode === 'create' && step.id === 2)) &&
                                        showMileCalculationStep &&
                                        index < steps.length - 1 && (
                                            <div className="flex-1 h-px bg-gray-200 mx-2 min-w-4"></div>
                                        )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceStepper;
