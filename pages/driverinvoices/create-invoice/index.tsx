'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircleIcon, ChevronRightIcon, UserIcon } from '@heroicons/react/24/outline';
import Layout from 'components/layout/Layout';
import { getAllDrivers } from 'lib/rest/driver';
import React from 'react';
import { Driver, Prisma } from '@prisma/client';
import { getAllAssignments } from 'lib/rest/assignment';
import { DriverInvoiceLineItem, ExpandedDriverAssignment, NewDriverInvoice } from 'interfaces/models';
import Spinner from 'components/Spinner';
import Link from 'next/link';
import { notify } from 'components/Notification';
import { createDriverInvoice, getNextDriverInvoiceNum } from 'lib/rest/driverinvoice';
import AssignmentChargeTypeChangeDialog from 'components/driverinvoices/AssignmentChargeChange';
import DriverRouteMap from 'components/DriverRouteMap';
import { useRouter } from 'next/navigation';
import { useUserContext } from 'components/context/UserContext';
import { calculateHaversineDistance } from 'lib/helpers/distance';
import { useMileCalculation } from 'hooks/useMileCalculation';
import InvoiceStepper from 'components/InvoiceStepper';
import { createInvoiceSteps } from 'lib/constants/stepper';
import { InvoiceReview } from 'components/driverinvoices/InvoiceReview';
import { financialCalculation, financialAdd, calculateAssignmentAmount, safeNumber } from 'lib/financial-utils';
import AdditionalItems from 'components/driverinvoices/AdditionalItems';
import { LoadingOverlay } from 'components/LoadingOverlay';
import AssignmentSelector from 'components/driverinvoices/AssignmentSelector';

const CreateDriverInvoicePage = () => {
    const router = useRouter();
    const { defaultCarrier } = useUserContext();

    const [currentStep, setCurrentStep] = useState(1);
    const [invoice, setInvoice] = useState<NewDriverInvoice>({
        notes: '',
        fromDate: null,
        toDate: null,
        driverId: '',
        assignments: [],
        lineItems: [],
    });
    const [newLineItem, setNewLineItem] = useState<DriverInvoiceLineItem>({ description: '', amount: '' });
    const [totalAmount, setTotalAmount] = useState('0.00');

    // Mile calculation state using shared hook
    const {
        emptyMiles,
        setEmptyMiles,
        emptyMilesInput,
        setEmptyMilesInput,
        totalEmptyMiles,
        selectedAssignmentId,
        setSelectedAssignmentId,
        handleEmptyMilesUpdate,
        restoreEmptyMilesFromAssignments,
    } = useMileCalculation({
        assignments: invoice.assignments,
        calculateHaversineDistance,
    });

    const [showMileCalculationStep, setShowMileCalculationStep] = useState(false);

    const [loadingAllDrivers, setLoadingAllDrivers] = useState(true);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [allDrivers, setAllDrivers] = React.useState<Driver[]>([]);
    const [allAssignments, setAllAssignments] = React.useState<ExpandedDriverAssignment[]>([]);

    const [showAssignmentChargeChangeDialog, setShowAssignmentChargeChangeDialog] = useState(false);
    const [currentAssEditCharge, setCurrentAssEditCharge] = useState<ExpandedDriverAssignment | null>(null);
    const [creatingInvoice, setCreatingInvoice] = useState(false);
    const [notifyDriver, setNotifyDriver] = useState(true);

    // Custom empty miles update handler that also updates invoice assignments
    const handleEmptyMilesUpdateWithInvoice = useCallback(
        (updatedEmptyMiles: { [key: string]: number }) => {
            handleEmptyMilesUpdate(updatedEmptyMiles);

            // Update assignment objects with empty miles
            setInvoice((prev) => {
                const updatedAssignments = prev.assignments.map((assignment) => {
                    // Find matching empty miles for this assignment
                    const emptyMilesKey = Object.keys(updatedEmptyMiles).find((key) =>
                        key.startsWith(`${assignment.id}-to-`),
                    );
                    const assignmentEmptyMiles = emptyMilesKey ? updatedEmptyMiles[emptyMilesKey] : 0;

                    return {
                        ...assignment,
                        emptyMiles: assignmentEmptyMiles > 0 ? new Prisma.Decimal(assignmentEmptyMiles) : null,
                    };
                });

                return { ...prev, assignments: updatedAssignments };
            });
        },
        [handleEmptyMilesUpdate],
    );

    useEffect(() => {
        // Load drivers when the component mounts
        loadDrivers();
    }, []);

    // Calculate total amount whenever assignments, line items, or empty miles change
    useEffect(() => {
        let total = 0;

        // Add up assignment amounts with financial precision
        invoice.assignments.forEach((assignment) => {
            // Get empty miles for this assignment
            let emptyMilesForAssignment = 0;
            if (assignment.emptyMiles && Number(assignment.emptyMiles) > 0) {
                // Use the emptyMiles from the assignment object if available
                emptyMilesForAssignment = safeNumber(assignment.emptyMiles);
            } else {
                // Find empty miles for this assignment from state
                const emptyMilesKey = Object.keys(emptyMiles).find((key) => key.startsWith(`${assignment.id}-to-`));
                emptyMilesForAssignment = emptyMilesKey ? emptyMiles[emptyMilesKey] : 0;
            }

            const amount = calculateAssignmentAmount(assignment, emptyMilesForAssignment);
            total = financialAdd(total, amount);
        });

        // Add up line items with financial precision
        invoice.lineItems.forEach((item) => {
            const itemAmount = safeNumber(item.amount);
            total = financialAdd(total, itemAmount);
        });

        setTotalAmount(financialCalculation(total).toFixed(2));
    }, [invoice.assignments, invoice.lineItems, emptyMiles]);

    // Calculate empty miles when mile-based assignments change
    useEffect(() => {
        const mileBasedAssignments = invoice.assignments.filter((a) => a.chargeType === 'PER_MILE');
        if (mileBasedAssignments.length < 1) {
            setEmptyMiles({});
            return;
        }

        // Sort assignments by date
        const sortedAssignments = mileBasedAssignments.sort((a, b) => {
            const dateA = new Date(a.routeLeg.startedAt || a.routeLeg.createdAt);
            const dateB = new Date(b.routeLeg.startedAt || b.routeLeg.createdAt);
            return dateA.getTime() - dateB.getTime();
        });

        const newEmptyMiles: { [key: string]: number } = {};
        let totalEmpty = 0;

        // Calculate empty miles between assignments
        for (let i = 0; i < sortedAssignments.length - 1; i++) {
            const currentAssignment = sortedAssignments[i];
            const nextAssignment = sortedAssignments[i + 1];

            // Get end location of current assignment
            const currentEndLocation =
                currentAssignment.routeLeg.locations[currentAssignment.routeLeg.locations.length - 1];
            const currentEndLat = currentEndLocation.loadStop?.latitude || currentEndLocation.location?.latitude;
            const currentEndLng = currentEndLocation.loadStop?.longitude || currentEndLocation.location?.longitude;

            // Get start location of next assignment
            const nextStartLocation = nextAssignment.routeLeg.locations[0];
            const nextStartLat = nextStartLocation.loadStop?.latitude || nextStartLocation.location?.latitude;
            const nextStartLng = nextStartLocation.loadStop?.longitude || nextStartLocation.location?.longitude;

            if (currentEndLat && currentEndLng && nextStartLat && nextStartLng) {
                const distance = calculateHaversineDistance(currentEndLat, currentEndLng, nextStartLat, nextStartLng);
                const emptyMilesKey = `${currentAssignment.id}-to-${nextAssignment.id}`;
                newEmptyMiles[emptyMilesKey] = Math.round(distance * 100) / 100;
                totalEmpty += newEmptyMiles[emptyMilesKey];
            }
        }

        // Add empty miles entry for the last assignment (return to base/deadhead)
        if (sortedAssignments.length > 0) {
            const lastAssignment = sortedAssignments[sortedAssignments.length - 1];
            const emptyMilesKey = `${lastAssignment.id}-to-end`;
            // Initialize with 0 miles - user can modify this as needed
            newEmptyMiles[emptyMilesKey] = 0;
        }

        setEmptyMiles(newEmptyMiles);
    }, [invoice.assignments]);

    const loadDrivers = async () => {
        setLoadingAllDrivers(true);
        const { drivers } = await getAllDrivers({
            limit: 999,
            offset: 0,
        });
        setAllDrivers(drivers);
        setLoadingAllDrivers(false);
    };

    const getNextInvoiceNum = async () => {
        await getNextDriverInvoiceNum().then((num) => {
            setInvoice((prev) => ({ ...prev, invoiceNum: num }));
            // console.log('Next invoice number:', num);
        });
    };

    const loadAssignments = async (driverId: string, fromDate?: string, toDate?: string) => {
        setLoadingAssignments(true);

        const requestParams: any = {
            limit: 999,
            offset: 0,
            sort: { key: 'routeLeg.endedAt', order: 'asc' },
            showCompletedOnly: true,
            showNotInvoicedOnly: true,
            driverIds: [driverId],
        };

        // Add date filters if provided (for period-based loading)
        if (fromDate && toDate) {
            requestParams.fromDate = fromDate;
            requestParams.toDate = toDate;
        }

        const { assignments, metadata: metadataResponse } = await getAllAssignments(requestParams);

        setInvoice((prev) => ({
            ...prev,
            assignments: [],
            lineItems: [],
            notes: '',
            invoiceNum: undefined,
            totalAmount: '0.00',
        }));
        setLoadingAssignments(false);
        setAllAssignments(assignments);
    };

    const handleDriverSelect = (driverId: string) => {
        if (invoice.driverId === driverId) return;

        setInvoice((prev) => ({ ...prev, driverId, assignments: [], lineItems: [], notes: '', invoiceNum: undefined }));
        setAllAssignments([]);
    };

    const handleAssignmentToggle = (assignmentId: string) => {
        // Find the assignment from allAssignments
        const assignment = allAssignments.find((a) => a.id === assignmentId);
        if (!assignment) return;

        // Check if the assignment is already selected
        const isSelected = invoice.assignments.some((a) => a.id === assignmentId);

        let updatedSelectedAssignments = [];
        if (isSelected) {
            // If it's already selected, remove it from the selectedAssignments array
            updatedSelectedAssignments = invoice.assignments.filter((a) => a.id !== assignmentId);
        } else {
            // Otherwise, add it to the selectedAssignments array
            updatedSelectedAssignments = [...invoice.assignments, assignment];
        }

        // Update the state for selectedAssignments
        setInvoice((prev) => ({ ...prev, assignments: updatedSelectedAssignments }));
    };

    const handleConfirmAssignments = () => {
        if (invoice.assignments.length === 0) {
            return notify({ title: 'Please select at least one assignment', type: 'error' });
        }
        if (invoice.invoiceNum === undefined) {
            // console.log('Getting next invoice number');
            getNextInvoiceNum();
        }

        // Check if any assignment has PER_MILE charge type
        const hasMileBasedAssignments = invoice.assignments.some((assignment) => assignment.chargeType === 'PER_MILE');

        // Update the billed amounts for the selected chargetype
        const updatedAssignments = invoice.assignments.map((assignment) => {
            // Find matching empty miles for this assignment
            const emptyMilesKey = Object.keys(emptyMiles).find((key) => key.startsWith(`${assignment.id}-to-`));
            const assignmentEmptyMiles = emptyMilesKey ? emptyMiles[emptyMilesKey] : 0;

            return {
                ...assignment,
                billedDistanceMiles:
                    assignment.chargeType === 'PER_MILE'
                        ? assignment.billedDistanceMiles || assignment.routeLeg.distanceMiles
                        : undefined,
                billedDurationHours:
                    assignment.chargeType === 'PER_HOUR'
                        ? assignment.billedDurationHours || assignment.routeLeg.durationHours
                        : undefined,
                billedLoadRate:
                    assignment.chargeType === 'PERCENTAGE_OF_LOAD'
                        ? assignment.billedLoadRate || assignment.load.rate
                        : undefined,
                emptyMiles: assignmentEmptyMiles > 0 ? new Prisma.Decimal(assignmentEmptyMiles) : null, // Include empty miles data
            };
        });
        setInvoice((prev) => ({ ...prev, assignments: updatedAssignments }));

        // If there are mile-based assignments, show mile calculation step
        if (hasMileBasedAssignments) {
            setShowMileCalculationStep(true);
            setCurrentStep(2.5); // Mile calculation step
        } else {
            setShowMileCalculationStep(false);
            setCurrentStep(3); // Skip to additional items
        }
    };

    const handleAddLineItem = () => {
        if (newLineItem.description && newLineItem.amount) {
            setInvoice((prev) => ({
                ...prev,
                lineItems: [
                    ...prev.lineItems,
                    {
                        ...newLineItem,
                        id: `line_${Date.now()}`,
                        createdAt: new Date().toISOString(),
                    },
                ],
            }));
            setNewLineItem({ description: '', amount: '' });
        }
    };

    const handleRemoveLineItem = (lineItemId: string) => {
        setInvoice((prev) => ({
            ...prev,
            lineItems: prev.lineItems.filter((item) => item.id !== lineItemId),
        }));
    };

    const handleCreateInvoice = async () => {
        setCreatingInvoice(true);

        try {
            const invoiceId = await createDriverInvoice(invoice);
            if (invoiceId) {
                notify({ title: 'Invoice created successfully!', type: 'success' });

                // Send notification to driver if enabled
                if (notifyDriver) {
                    await sendDriverNotification(invoiceId.toString());
                }

                // Small delay to ensure invoice is properly saved in database
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Reset creating state before navigation
                setCreatingInvoice(false);

                // Navigate to the created invoice page
                router.push(`/driverinvoices/${invoiceId}`);
            }
            // console.log('Invoice created successfully:', invoiceId);
        } catch (error) {
            notify({ title: 'Error creating invoice', message: `${error}`, type: 'error' });
            console.error('Error creating invoice:', error);
            setCreatingInvoice(false);
        }
    };

    const sendDriverNotification = async (invoiceId: string) => {
        try {
            const selectedDriver = allDrivers.find((d) => d.id === invoice.driverId);
            if (!selectedDriver) {
                console.error('Driver not found for notification');
                return;
            }

            const approvalUrl = `${window.location.origin}/driverinvoices/approval/${invoiceId}`;

            // Prefer email if available, otherwise use SMS
            if (selectedDriver.email && selectedDriver.email.trim() !== '') {
                await fetch('/api/notifications/driver-invoice-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        driverEmail: selectedDriver.email,
                        driverName: selectedDriver.name,
                        invoiceNum: invoice.invoiceNum,
                        approvalUrl: approvalUrl,
                        invoiceAmount: formatCurrency(totalAmount),
                        carrierName: defaultCarrier?.name || 'CarrierNest',
                    }),
                });
                notify({
                    title: 'Driver notified via email',
                    message: `Notification sent to ${selectedDriver.email}`,
                    type: 'success',
                });
            } else if (selectedDriver.phone && selectedDriver.phone.trim() !== '') {
                await fetch('/api/notifications/driver-invoice-sms', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        driverPhone: selectedDriver.phone,
                        driverName: selectedDriver.name,
                        invoiceNum: invoice.invoiceNum,
                        approvalUrl: approvalUrl,
                        invoiceAmount: formatCurrency(totalAmount),
                        carrierName: defaultCarrier?.name || 'CarrierNest',
                    }),
                });
                notify({
                    title: 'Driver notified via SMS',
                    message: `Text message sent to ${selectedDriver.phone}`,
                    type: 'success',
                });
            } else {
                notify({
                    title: 'No contact method available',
                    message: 'Driver has no email or phone number for notifications',
                    type: 'error',
                });
            }
        } catch (error) {
            console.error('Error sending driver notification:', error);
            notify({
                title: 'Notification failed',
                message: 'Failed to notify driver, but invoice was created successfully',
                type: 'error',
            });
        }
    };

    const nextStep = () => {
        if (currentStep === 1 && (!invoice.driverId || invoice.driverId === '')) {
            notify({ title: 'Please select a driver', type: 'error' });
            return;
        }

        if (currentStep === 1) {
            loadAssignments(invoice.driverId);
        }

        // Handle step progression with mile calculation step
        if (currentStep === 2.5) {
            setCurrentStep(3);
        } else if (currentStep === 1) {
            setCurrentStep(2);
        } else if (currentStep === 2) {
            setCurrentStep(3);
        } else if (currentStep === 3) {
            setCurrentStep(4);
        }
    };

    const prevStep = () => {
        if (currentStep === 3 && showMileCalculationStep) {
            // When going back from additional items to mile calculation, restore user-entered empty miles
            restoreEmptyMilesFromAssignments();
            setCurrentStep(2.5);
        } else if (currentStep === 2.5) {
            setCurrentStep(2);
        } else if (currentStep === 2) {
            setCurrentStep(1);
        } else if (currentStep === 3) {
            setCurrentStep(2);
        } else if (currentStep === 4) {
            // When going back from review, always go to additional items step
            setCurrentStep(3);
        }
    };

    const formatCurrency = (amount: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(Number.parseFloat(amount));
    };

    const onChargeTypeChange = (assignment: ExpandedDriverAssignment) => {
        setInvoice((prev) => ({
            ...prev,
            assignments: prev.assignments.map((a) => (a.id === assignment.id ? assignment : a)),
        }));
        setAllAssignments((prev) => prev.map((a) => (a.id === assignment.id ? assignment : a)));

        setShowAssignmentChargeChangeDialog(false);
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Driver Invoices</h1>
                </div>
            }
        >
            <>
                <div className="py-1 sm:py-2 mx-auto max-w-full px-2 sm:px-4">
                    {' '}
                    {/* Changed from max-w-7xl to max-w-full for wider layout */}
                    {showAssignmentChargeChangeDialog && (
                        <div className="fixed inset-0 z-50">
                            <AssignmentChargeTypeChangeDialog
                                onConfirm={onChargeTypeChange}
                                onClose={() => setShowAssignmentChargeChangeDialog(false)}
                                assignmentDetails={currentAssEditCharge}
                            />
                        </div>
                    )}
                    <div className="max-w-full mx-auto p-3 sm:p-6 bg-white rounded-lg shadow-none mt-2 sm:mt-4">
                        {' '}
                        {/* Changed from max-w-6xl to max-w-full */}
                        <div className="mb-4 sm:mb-8 static top-0 bg-white py-1 sm:py-2">
                            <nav className="flex" aria-label="Breadcrumb">
                                <ol className="flex items-center space-x-1 sm:space-x-2">
                                    <li>
                                        <Link
                                            href="/driverinvoices"
                                            className="text-gray-500 hover:text-gray-700 text-sm sm:text-base"
                                        >
                                            Driver Invoices
                                        </Link>
                                    </li>
                                    <li className="flex items-center">
                                        <svg
                                            className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span className="ml-1 sm:ml-2 text-gray-700 font-medium text-sm sm:text-base">
                                            Create Driver Invoice
                                        </span>
                                    </li>
                                </ol>
                            </nav>
                        </div>
                        <h1 className="text-lg sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-10 text-center bg-white p-2 sm:p-4 rounded-lg">
                            Create Driver Invoice
                        </h1>
                        {/* Invoice Stepper Component */}
                        <InvoiceStepper
                            currentStep={currentStep}
                            steps={createInvoiceSteps}
                            showMileCalculationStep={showMileCalculationStep}
                            mode="create"
                        />
                        <div className="border border-gray-100 rounded-lg shadow-sm">
                            {/* Step 1: Select Driver */}
                            {currentStep === 1 && (
                                <div className="bg-gray-50 p-3 sm:p-6 rounded-lg">
                                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
                                        Select Driver
                                    </h2>

                                    {loadingAllDrivers ? (
                                        <div className="flex items-center justify-center w-full p-2 sm:p-4 font-bold text-sm sm:text-base">
                                            <Spinner /> Loading Drivers
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                            {allDrivers.map((driver) => (
                                                <div
                                                    key={driver.id}
                                                    className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-all ${
                                                        invoice.driverId === driver.id
                                                            ? 'border-blue-400 bg-blue-50 shadow-md'
                                                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                                    }`}
                                                    onClick={() => handleDriverSelect(driver.id)}
                                                >
                                                    <div className="flex items-center">
                                                        <div className="bg-gray-200 rounded-full p-1.5 sm:p-2 mr-2 sm:mr-3">
                                                            <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-medium text-gray-800 capitalize text-sm sm:text-base truncate">
                                                                {driver.name.toLowerCase()}
                                                            </h3>
                                                            <p className="text-xs sm:text-sm text-gray-500 truncate">
                                                                {driver.email}
                                                            </p>
                                                            <p className="text-xs sm:text-sm text-gray-500">
                                                                {driver.phone}
                                                            </p>
                                                        </div>
                                                        {invoice.driverId === driver.id && (
                                                            <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 ml-auto flex-shrink-0" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-4 sm:mt-6 flex justify-end">
                                        <button
                                            onClick={nextStep}
                                            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm sm:text-base"
                                        >
                                            Next <ChevronRightIcon className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* Step 2: Select Assignments */}
                            {currentStep === 2 && (
                                <div className=" relative">
                                    <AssignmentSelector
                                        driverId={invoice.driverId}
                                        selectedAssignments={invoice.assignments}
                                        allAssignments={allAssignments}
                                        loadingAssignments={loadingAssignments}
                                        driverName={
                                            allAssignments.length > 0
                                                ? allAssignments.find((ass) => ass.driverId == invoice.driverId)?.driver
                                                      .name
                                                : undefined
                                        }
                                        mode="create"
                                        invoice={invoice}
                                        setInvoice={setInvoice}
                                        navigation={{
                                            showBackButton: true,
                                            onBack: prevStep,
                                            onNext: handleConfirmAssignments,
                                            nextButtonText: 'Next',
                                            backButtonText: 'Back',
                                        }}
                                        onAssignmentToggle={handleAssignmentToggle}
                                        onReloadAssignments={() => {
                                            if (invoice.fromDate && invoice.toDate) {
                                                loadAssignments(invoice.driverId, invoice.fromDate, invoice.toDate);
                                            } else {
                                                loadAssignments(invoice.driverId);
                                            }
                                        }}
                                        onAssignmentEdit={(assignment) => {
                                            setShowAssignmentChargeChangeDialog(true);
                                            setCurrentAssEditCharge(assignment);
                                        }}
                                        onPeriodChange={(fromDate, toDate) => {
                                            if (fromDate && toDate) {
                                                loadAssignments(invoice.driverId, fromDate, toDate);
                                            }
                                        }}
                                        formatCurrency={formatCurrency}
                                    />
                                </div>
                            )}
                            {/* Step 2.5: Mile Calculation (conditional) */}
                            {(currentStep as number) === 2.5 && showMileCalculationStep && (
                                <div className="bg-gray-50 p-3 sm:p-6 rounded-lg">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-6 gap-3 sm:gap-0">
                                        <div className="flex flex-1 flex-col items-start">
                                            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1">
                                                Calculate Mile-Based Compensation
                                            </h2>
                                            <p className="text-gray-400 text-xs sm:text-sm font-normal">
                                                Review assignment routes and calculate empty miles between assignments
                                                for accurate compensation.
                                            </p>
                                        </div>
                                    </div>
                                    {/* Split layout: Map on left, Details on right */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 mb-3 sm:mb-6">
                                        {/* Interactive Mapbox Route Map - Left Side */}
                                        <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl min-h-[400px] lg:min-h-[600px]">
                                            <DriverRouteMap
                                                assignments={invoice.assignments.filter(
                                                    (a) => a.chargeType === 'PER_MILE',
                                                )}
                                                emptyMiles={emptyMiles}
                                                selectedAssignmentId={selectedAssignmentId}
                                                onAssignmentSelect={setSelectedAssignmentId}
                                                onEmptyMilesUpdate={handleEmptyMilesUpdateWithInvoice}
                                            />
                                        </div>

                                        {/* Assignment Details - Right Side */}
                                        <div className="space-y-3 sm:space-y-4">
                                            {/* Assignment Route Summary */}
                                            <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm lg:min-h-[600px]">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                        Assignment Routes Summary
                                                        {selectedAssignmentId && (
                                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                                                                Filtered
                                                            </span>
                                                        )}
                                                    </h3>
                                                    {selectedAssignmentId && (
                                                        <button
                                                            onClick={() => setSelectedAssignmentId(null)}
                                                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg transition-colors whitespace-nowrap"
                                                        >
                                                            Show All
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="space-y-3 lg:overflow-y-auto lg:max-h-[480px]">
                                                    {/* Sort assignments by date/time */}
                                                    {invoice.assignments
                                                        .filter((assignment) => assignment.chargeType === 'PER_MILE')
                                                        .sort((a, b) => {
                                                            const dateA = new Date(
                                                                a.routeLeg.startedAt || a.routeLeg.createdAt,
                                                            );
                                                            const dateB = new Date(
                                                                b.routeLeg.startedAt || b.routeLeg.createdAt,
                                                            );
                                                            return dateA.getTime() - dateB.getTime();
                                                        })
                                                        .map((assignment, index, sortedAssignments) => {
                                                            const routeLocations = assignment.routeLeg.locations;
                                                            const startLocation = routeLocations[0];
                                                            const endLocation =
                                                                routeLocations[routeLocations.length - 1];

                                                            // Calculate empty miles to next assignment
                                                            let emptyMilesToNext = 0;
                                                            let nextAssignment = null;

                                                            if (index < sortedAssignments.length - 1) {
                                                                nextAssignment = sortedAssignments[index + 1];
                                                                const nextStartLocation =
                                                                    nextAssignment.routeLeg.locations[0];

                                                                // Calculate distance between current end and next start
                                                                const endLat =
                                                                    endLocation.loadStop?.latitude ||
                                                                    endLocation.location?.latitude;
                                                                const endLon =
                                                                    endLocation.loadStop?.longitude ||
                                                                    endLocation.location?.longitude;
                                                                const nextStartLat =
                                                                    nextStartLocation.loadStop?.latitude ||
                                                                    nextStartLocation.location?.latitude;
                                                                const nextStartLon =
                                                                    nextStartLocation.loadStop?.longitude ||
                                                                    nextStartLocation.location?.longitude;

                                                                if (endLat && endLon && nextStartLat && nextStartLon) {
                                                                    const distance = calculateHaversineDistance(
                                                                        endLat,
                                                                        endLon,
                                                                        nextStartLat,
                                                                        nextStartLon,
                                                                    );
                                                                    emptyMilesToNext = Math.round(distance * 100) / 100;
                                                                }
                                                            }

                                                            const assignmentMiles = Number(
                                                                assignment.billedDistanceMiles ||
                                                                    assignment.routeLeg.distanceMiles,
                                                            );
                                                            const emptyMilesKey = `${assignment.id}-to-${
                                                                nextAssignment?.id || 'end'
                                                            }`;

                                                            // Assignment colors (same as map)
                                                            const assignmentColors = [
                                                                '#3b82f6',
                                                                '#10b981',
                                                                '#f59e0b',
                                                                '#ef4444',
                                                                '#8b5cf6',
                                                                '#06b6d4',
                                                                '#84cc16',
                                                                '#f97316',
                                                                '#ec4899',
                                                                '#6366f1',
                                                            ];
                                                            const color =
                                                                assignmentColors[index % assignmentColors.length];

                                                            return (
                                                                <div key={`assignment-${assignment.id}`}>
                                                                    {/* Assignment Card */}
                                                                    <div
                                                                        className={`bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 border transition-all duration-200 cursor-pointer ${
                                                                            selectedAssignmentId === assignment.id
                                                                                ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                                                                                : 'border-gray-200/40 hover:border-blue-200/60'
                                                                        }`}
                                                                        onClick={() => {
                                                                            if (
                                                                                selectedAssignmentId === assignment.id
                                                                            ) {
                                                                                // If clicking the same assignment, deselect it
                                                                                setSelectedAssignmentId(null);
                                                                            } else {
                                                                                // Select this assignment
                                                                                setSelectedAssignmentId(assignment.id);
                                                                            }
                                                                        }}
                                                                    >
                                                                        {/* Assignment Header with Total Earnings */}
                                                                        <div className="flex items-start justify-between mb-3">
                                                                            <div className="flex items-center gap-2 sm:gap-3">
                                                                                <div
                                                                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-sm"
                                                                                    style={{ backgroundColor: color }}
                                                                                >
                                                                                    <span className="text-white text-xs sm:text-sm font-bold">
                                                                                        {index + 1}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <h4 className="font-semibold text-gray-900 text-xs sm:text-sm">
                                                                                        Assignment #{index + 1}
                                                                                    </h4>
                                                                                    <p className="text-xs text-gray-500 truncate">
                                                                                        {assignment.load.refNum}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            {/* Total Earnings - Moved to Top Right */}
                                                                            <div className="text-right">
                                                                                <div className="text-xs text-gray-600 mb-1">
                                                                                    Total
                                                                                </div>
                                                                                <div className="text-sm font-bold text-green-600">
                                                                                    $
                                                                                    {(() => {
                                                                                        const emptyMilesForThisAssignment =
                                                                                            emptyMiles[emptyMilesKey] ||
                                                                                            0;
                                                                                        const totalMiles =
                                                                                            assignmentMiles +
                                                                                            emptyMilesForThisAssignment;
                                                                                        return (
                                                                                            totalMiles *
                                                                                            Number(
                                                                                                assignment.chargeValue,
                                                                                            )
                                                                                        ).toFixed(2);
                                                                                    })()}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Route Information */}
                                                                        <div className="space-y-2 sm:space-y-3">
                                                                            {/* Distance & Rate */}
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                                                <div className="bg-gray-50/80 rounded-xl p-2 sm:p-3">
                                                                                    <div className="text-xs text-gray-600 mb-1">
                                                                                        Distance
                                                                                    </div>
                                                                                    <div className="text-xs sm:text-sm font-semibold text-gray-900">
                                                                                        {assignmentMiles.toFixed(2)}{' '}
                                                                                        miles
                                                                                    </div>
                                                                                </div>
                                                                                <div className="bg-gray-50/80 rounded-xl p-2 sm:p-3">
                                                                                    <div className="text-xs text-gray-600 mb-1">
                                                                                        Rate
                                                                                    </div>
                                                                                    <div className="text-xs sm:text-sm font-semibold text-green-600">
                                                                                        $
                                                                                        {String(assignment.chargeValue)}
                                                                                        /mile
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Route Details */}
                                                                            <div className="space-y-2">
                                                                                <div className="text-xs font-medium text-gray-700">
                                                                                    Route
                                                                                </div>
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                                                    <div className="bg-green-50/80 p-2 rounded-lg">
                                                                                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                                                                            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 flex items-center justify-center">
                                                                                                <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-white rounded-full"></div>
                                                                                            </div>
                                                                                            <span className="font-medium text-green-800">
                                                                                                Pickup
                                                                                            </span>
                                                                                        </div>
                                                                                        <p className="text-green-700 truncate font-medium text-xs sm:text-sm">
                                                                                            {startLocation.loadStop
                                                                                                ?.name ||
                                                                                                startLocation.location
                                                                                                    ?.name}
                                                                                        </p>
                                                                                        <p className="text-green-600 text-xs">
                                                                                            {startLocation.loadStop
                                                                                                ?.city ||
                                                                                                startLocation.location
                                                                                                    ?.city}
                                                                                            ,{' '}
                                                                                            {startLocation.loadStop
                                                                                                ?.state ||
                                                                                                startLocation.location
                                                                                                    ?.state}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className="bg-red-50/80 p-2 rounded-lg">
                                                                                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                                                                            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 flex items-center justify-center">
                                                                                                <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-white rounded-full"></div>
                                                                                            </div>
                                                                                            <span className="font-medium text-red-800">
                                                                                                Delivery
                                                                                            </span>
                                                                                        </div>
                                                                                        <p className="text-red-700 truncate font-medium text-xs sm:text-sm">
                                                                                            {endLocation.loadStop
                                                                                                ?.name ||
                                                                                                endLocation.location
                                                                                                    ?.name}
                                                                                        </p>
                                                                                        <p className="text-red-600 text-xs">
                                                                                            {endLocation.loadStop
                                                                                                ?.city ||
                                                                                                endLocation.location
                                                                                                    ?.city}
                                                                                            ,{' '}
                                                                                            {endLocation.loadStop
                                                                                                ?.state ||
                                                                                                endLocation.location
                                                                                                    ?.state}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Start Time */}
                                                                            <div className="bg-blue-50/80 rounded-xl p-2">
                                                                                <div className="text-xs text-blue-600 mb-1">
                                                                                    Started
                                                                                </div>
                                                                                <div className="text-xs font-medium text-blue-800">
                                                                                    {new Date(
                                                                                        assignment.routeLeg.startedAt ||
                                                                                            assignment.routeLeg
                                                                                                .createdAt,
                                                                                    ).toLocaleString()}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Empty Miles Card (positioned between assignments) */}
                                                                    {index < sortedAssignments.length - 1 && (
                                                                        <div className="my-3">
                                                                            <div className="bg-amber-50/80 backdrop-blur-sm rounded-xl p-4 border border-amber-200/30">
                                                                                <div className="flex items-center gap-3 mb-2">
                                                                                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                                                                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                                                                    </div>
                                                                                    <h4 className="text-sm font-medium text-amber-800">
                                                                                        Empty Miles to Next Assignment
                                                                                    </h4>
                                                                                </div>
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-amber-700 text-sm">
                                                                                        Distance:
                                                                                    </span>
                                                                                    <div className="flex items-center space-x-2">
                                                                                        <input
                                                                                            type="number"
                                                                                            step="0.01"
                                                                                            min="0"
                                                                                            value={
                                                                                                emptyMilesInput[
                                                                                                    emptyMilesKey
                                                                                                ] !== undefined
                                                                                                    ? emptyMilesInput[
                                                                                                          emptyMilesKey
                                                                                                      ]
                                                                                                    : (emptyMiles[
                                                                                                          emptyMilesKey
                                                                                                      ] !== undefined
                                                                                                          ? emptyMiles[
                                                                                                                emptyMilesKey
                                                                                                            ]
                                                                                                          : emptyMilesToNext ||
                                                                                                            0
                                                                                                      ).toString()
                                                                                            }
                                                                                            onChange={(e) => {
                                                                                                // Store the raw input value as string
                                                                                                setEmptyMilesInput(
                                                                                                    (prev) => ({
                                                                                                        ...prev,
                                                                                                        [emptyMilesKey]:
                                                                                                            e.target
                                                                                                                .value,
                                                                                                    }),
                                                                                                );
                                                                                            }}
                                                                                            onBlur={(e) => {
                                                                                                // Convert to number when input loses focus
                                                                                                const inputValue =
                                                                                                    e.target.value.trim();
                                                                                                const value =
                                                                                                    inputValue === ''
                                                                                                        ? 0
                                                                                                        : parseFloat(
                                                                                                              inputValue,
                                                                                                          );

                                                                                                // Only update if it's a valid number
                                                                                                if (!isNaN(value)) {
                                                                                                    setEmptyMiles(
                                                                                                        (prev) => ({
                                                                                                            ...prev,
                                                                                                            [emptyMilesKey]:
                                                                                                                value,
                                                                                                        }),
                                                                                                    );
                                                                                                }

                                                                                                // Clear the string input state
                                                                                                setEmptyMilesInput(
                                                                                                    (prev) => {
                                                                                                        const updated =
                                                                                                            { ...prev };
                                                                                                        delete updated[
                                                                                                            emptyMilesKey
                                                                                                        ];
                                                                                                        return updated;
                                                                                                    },
                                                                                                );
                                                                                            }}
                                                                                            onKeyDown={(e) => {
                                                                                                // Handle Enter key to trigger blur
                                                                                                if (e.key === 'Enter') {
                                                                                                    e.currentTarget.blur();
                                                                                                }
                                                                                            }}
                                                                                            className="w-20 px-2 py-1 border border-amber-300 rounded-lg text-sm bg-white/80 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                                                        />
                                                                                        <span className="text-amber-700 text-sm font-medium">
                                                                                            miles
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                <p className="text-xs text-amber-600 mt-2 truncate">
                                                                                    To:{' '}
                                                                                    {nextAssignment?.routeLeg
                                                                                        .locations[0].loadStop?.name ||
                                                                                        nextAssignment?.routeLeg
                                                                                            .locations[0].location
                                                                                            ?.name}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}

                                                    {/* Empty Miles Card for Last Assignment (Return to Base) */}
                                                    {invoice.assignments.filter((a) => a.chargeType === 'PER_MILE')
                                                        .length > 0 &&
                                                        (() => {
                                                            const mileBasedAssignments = invoice.assignments.filter(
                                                                (a) => a.chargeType === 'PER_MILE',
                                                            );
                                                            const sortedAssignments = mileBasedAssignments.sort(
                                                                (a, b) => {
                                                                    const dateA = new Date(
                                                                        a.routeLeg.startedAt || a.routeLeg.createdAt,
                                                                    );
                                                                    const dateB = new Date(
                                                                        b.routeLeg.startedAt || b.routeLeg.createdAt,
                                                                    );
                                                                    return dateA.getTime() - dateB.getTime();
                                                                },
                                                            );
                                                            const lastAssignment =
                                                                sortedAssignments[sortedAssignments.length - 1];
                                                            const emptyMilesKey = `${lastAssignment.id}-to-end`;

                                                            return (
                                                                <div className="mt-3">
                                                                    <div className="bg-orange-50/80 backdrop-blur-sm rounded-xl p-4 border border-orange-200/30">
                                                                        <div className="flex items-center gap-3 mb-2">
                                                                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                                                            </div>
                                                                            <h4 className="text-sm font-medium text-orange-800">
                                                                                Empty Miles After Last Assignment
                                                                            </h4>
                                                                        </div>
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-orange-700 text-sm">
                                                                                Distance (Return/Deadhead):
                                                                            </span>
                                                                            <div className="flex items-center space-x-2">
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    min="0"
                                                                                    value={
                                                                                        emptyMilesInput[
                                                                                            emptyMilesKey
                                                                                        ] !== undefined
                                                                                            ? emptyMilesInput[
                                                                                                  emptyMilesKey
                                                                                              ]
                                                                                            : (emptyMiles[
                                                                                                  emptyMilesKey
                                                                                              ] !== undefined
                                                                                                  ? emptyMiles[
                                                                                                        emptyMilesKey
                                                                                                    ]
                                                                                                  : 0
                                                                                              ).toString()
                                                                                    }
                                                                                    onChange={(e) => {
                                                                                        setEmptyMilesInput((prev) => ({
                                                                                            ...prev,
                                                                                            [emptyMilesKey]:
                                                                                                e.target.value,
                                                                                        }));
                                                                                    }}
                                                                                    onBlur={(e) => {
                                                                                        const inputValue =
                                                                                            e.target.value.trim();
                                                                                        const value =
                                                                                            inputValue === ''
                                                                                                ? 0
                                                                                                : parseFloat(
                                                                                                      inputValue,
                                                                                                  );

                                                                                        if (!isNaN(value)) {
                                                                                            setEmptyMiles((prev) => ({
                                                                                                ...prev,
                                                                                                [emptyMilesKey]: value,
                                                                                            }));
                                                                                        }

                                                                                        setEmptyMilesInput((prev) => {
                                                                                            const updated = { ...prev };
                                                                                            delete updated[
                                                                                                emptyMilesKey
                                                                                            ];
                                                                                            return updated;
                                                                                        });
                                                                                    }}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') {
                                                                                            e.currentTarget.blur();
                                                                                        }
                                                                                    }}
                                                                                    className="w-20 px-2 py-1 border border-orange-300 rounded-lg text-sm bg-white/80 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                                                />
                                                                                <span className="text-orange-700 text-sm font-medium">
                                                                                    miles
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-xs text-orange-600 mt-2">
                                                                            Empty miles after completing final
                                                                            assignment (return to base, deadhead, etc.)
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>{' '}
                                    {/* Compensation Summary - Moved to Bottom */}
                                    <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-2xl p-6 shadow-sm mt-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            Compensation Summary
                                        </h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                                            <div className="bg-green-50/90 backdrop-blur-sm p-3 sm:p-4 rounded-xl text-center border border-green-200/30">
                                                <p className="text-xs sm:text-sm font-semibold text-green-800 mb-2">
                                                    Assignment Miles
                                                </p>
                                                <p className="text-xl sm:text-2xl font-bold text-green-900">
                                                    {invoice.assignments
                                                        .filter((a) => a.chargeType === 'PER_MILE')
                                                        .reduce(
                                                            (total, a) =>
                                                                total +
                                                                Number(
                                                                    a.billedDistanceMiles || a.routeLeg.distanceMiles,
                                                                ),
                                                            0,
                                                        )
                                                        .toFixed(1)}
                                                </p>
                                                <p className="text-xs text-green-600 mt-1">Total Distance</p>
                                            </div>
                                            <div className="bg-amber-50/90 backdrop-blur-sm p-3 sm:p-4 rounded-xl text-center border border-amber-200/30">
                                                <p className="text-xs sm:text-sm font-semibold text-amber-800 mb-2">
                                                    Empty Miles
                                                </p>
                                                <p className="text-xl sm:text-2xl font-bold text-amber-900">
                                                    {Object.values(emptyMiles)
                                                        .reduce((total, miles) => total + miles, 0)
                                                        .toFixed(1)}
                                                </p>
                                                <p className="text-xs text-amber-600 mt-1">Total Empty Miles</p>
                                            </div>
                                            <div className="bg-blue-50/90 backdrop-blur-sm p-3 sm:p-4 rounded-xl text-center border border-blue-200/30">
                                                <p className="text-xs sm:text-sm font-semibold text-blue-800 mb-2">
                                                    Total Pay
                                                </p>
                                                <p className="text-xl sm:text-2xl font-bold text-blue-900">
                                                    $
                                                    {invoice.assignments
                                                        .filter((a) => a.chargeType === 'PER_MILE')
                                                        .reduce((total, a) => {
                                                            const billedMiles = Number(
                                                                a.billedDistanceMiles || a.routeLeg.distanceMiles,
                                                            );

                                                            // Find empty miles that come AFTER this assignment
                                                            const emptyMilesKey = Object.keys(emptyMiles).find((key) =>
                                                                key.startsWith(`${a.id}-to-`),
                                                            );
                                                            const emptyMilesForAssignment = emptyMilesKey
                                                                ? emptyMiles[emptyMilesKey]
                                                                : 0;

                                                            const totalMiles = billedMiles + emptyMilesForAssignment;
                                                            return total + totalMiles * Number(a.chargeValue);
                                                        }, 0)
                                                        .toFixed(2)}
                                                </p>
                                                <p className="text-xs text-blue-600 mt-1">Including Empty Miles</p>
                                            </div>
                                        </div>

                                        {/* Empty Miles Compensation Options */}
                                        <div className="bg-gray-50/80 backdrop-blur-sm p-5 rounded-xl border border-gray-200/30">
                                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                Empty Miles Information
                                            </h4>

                                            <div className="space-y-3">
                                                <div className="text-sm text-gray-700">
                                                    Empty miles are automatically included in assignment calculations.
                                                    Each assignment&apos;s compensation now includes both billed miles
                                                    and empty miles.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 sm:mt-6 flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
                                        <button
                                            onClick={() => setCurrentStep(2)}
                                            className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                                        >
                                            Back to Assignments
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Update assignments with latest empty miles data
                                                const updatedAssignments = invoice.assignments.map((assignment) => {
                                                    // Find matching empty miles for this assignment
                                                    // Check both inter-assignment keys and last assignment key
                                                    const emptyMilesKey = Object.keys(emptyMiles).find((key) =>
                                                        key.startsWith(`${assignment.id}-to-`),
                                                    );
                                                    const assignmentEmptyMiles = emptyMilesKey
                                                        ? emptyMiles[emptyMilesKey]
                                                        : 0;

                                                    return {
                                                        ...assignment,
                                                        emptyMiles:
                                                            assignmentEmptyMiles > 0
                                                                ? new Prisma.Decimal(assignmentEmptyMiles)
                                                                : null,
                                                    };
                                                });

                                                setInvoice((prev) => ({ ...prev, assignments: updatedAssignments }));
                                                setCurrentStep(3);
                                            }}
                                            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                                        >
                                            Continue to Additional Items
                                        </button>
                                    </div>
                                </div>
                            )}{' '}
                            {/* Step 3: Additional Items */}
                            {(currentStep as number) === 3 && (
                                <AdditionalItems
                                    invoice={invoice}
                                    setInvoice={setInvoice}
                                    newLineItem={newLineItem}
                                    setNewLineItem={setNewLineItem}
                                    handleAddLineItem={handleAddLineItem}
                                    handleRemoveLineItem={handleRemoveLineItem}
                                    formatCurrency={formatCurrency}
                                    onPrevStep={prevStep}
                                    onNextStep={nextStep}
                                    mode="create"
                                    nextButtonText="Review Invoice"
                                    emptyMiles={emptyMiles}
                                />
                            )}
                            {/* Step 4: Review & Create */}
                            {(currentStep as number) === 4 && (
                                <InvoiceReview
                                    invoice={invoice}
                                    allDrivers={allDrivers}
                                    emptyMiles={emptyMiles}
                                    totalAmount={totalAmount}
                                    notifyDriver={notifyDriver}
                                    setNotifyDriver={setNotifyDriver}
                                    isLoading={creatingInvoice}
                                    loadingText="Creating Invoice..."
                                    onPrevStep={prevStep}
                                    onSubmit={handleCreateInvoice}
                                    submitButtonText="Create Invoice"
                                    mode="create"
                                    formatCurrency={formatCurrency}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </>
            {creatingInvoice && <LoadingOverlay message="Creating Invoice..." />}
        </Layout>
    );
};

CreateDriverInvoicePage.authenticationEnabled = true;
export default CreateDriverInvoicePage;
