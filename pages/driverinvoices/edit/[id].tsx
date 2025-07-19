'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserIcon } from '@heroicons/react/24/outline';
import Layout from 'components/layout/Layout';
import { getAllDrivers } from 'lib/rest/driver';
import type { Driver } from '@prisma/client';
import { getAllAssignments } from 'lib/rest/assignment';
import type { DriverInvoiceLineItem, ExpandedDriverAssignment, ExpandedDriverInvoice } from 'interfaces/models';
import Spinner from 'components/Spinner';
import Link from 'next/link';
import { notify } from 'components/Notification';
import { getDriverInvoiceById, updateDriverInvoice } from 'lib/rest/driverinvoice';
import AssignmentChargeTypeChangeDialog from 'components/driverinvoices/AssignmentChargeChange';
import { useRouter } from 'next/router';
import { useUserContext } from 'components/context/UserContext';
import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';
import MileCalculation from 'components/driverinvoices/MileCalculation';
import CompensationSummary from 'components/driverinvoices/CompensationSummary';
import { calculateHaversineDistance } from 'lib/helpers/distance';
import { useMileCalculation } from 'hooks/useMileCalculation';
import { PageWithAuth } from 'interfaces/auth';
import InvoiceStepper from 'components/InvoiceStepper';
import { editInvoiceSteps } from 'lib/constants/stepper';
import { InvoiceReview } from 'components/driverinvoices/InvoiceReview';
import AdditionalItems from 'components/driverinvoices/AdditionalItems';
import { LoadingOverlay } from 'components/LoadingOverlay';
import AssignmentSelector from 'components/driverinvoices/AssignmentSelector';
import dayjs from 'dayjs';

const EditDriverInvoice: PageWithAuth = ({ params }: { params: { id: string } }) => {
    const router = useRouter();
    const { defaultCarrier } = useUserContext();

    const [currentStep, setCurrentStep] = useState(1);
    const [invoice, setInvoice] = useState<ExpandedDriverInvoice>(undefined);
    const [newLineItem, setNewLineItem] = useState<DriverInvoiceLineItem>({ description: '', amount: '' });
    const [totalAmount, setTotalAmount] = useState('0.00');
    const [notifyDriver, setNotifyDriver] = useState(false);

    // Memoize assignments to prevent infinite re-renders in useMileCalculation
    const memoizedAssignments = useMemo(() => {
        return invoice?.assignments || [];
    }, [invoice?.assignments]);

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
        assignments: memoizedAssignments as any,
        calculateHaversineDistance,
    });

    const [showMileCalculationStep, setShowMileCalculationStep] = useState(false);

    const [loading, setLoading] = useState(true);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [driver, setDriver] = useState<Driver | null>(null);
    const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
    const [allAssignments, setAllAssignments] = useState<ExpandedDriverAssignment[]>([]);

    const [showAssignmentChargeChangeDialog, setShowAssignmentChargeChangeDialog] = useState(false);
    const [currentAssEditCharge, setCurrentAssEditCharge] = useState<ExpandedDriverAssignment | null>(null);
    const [updatingInvoice, setUpdatingInvoice] = useState(false);
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date());
    const invoiceId = router.query.id as string;

    useEffect(() => {
        // Load invoice data when the component mounts
        if (invoiceId) loadInvoiceData();
    }, [router.query]);

    // Calculate total amount whenever assignments or line items change
    useEffect(() => {
        if (!invoice) return;

        let total = 0;

        // Add up assignment amounts
        invoice.assignments.forEach((assignment) => {
            let amount = 0;
            switch (assignment.chargeType) {
                case 'PER_MILE':
                    // Get base miles
                    const baseMiles = Number(assignment.billedDistanceMiles || assignment.routeLeg.distanceMiles);

                    // Get empty miles for this assignment
                    let emptyMilesForAssignment = 0;
                    if (assignment.emptyMiles && Number(assignment.emptyMiles) > 0) {
                        // Use the emptyMiles from the assignment object if available
                        emptyMilesForAssignment = Number(assignment.emptyMiles);
                    } else {
                        // Find empty miles for this assignment from state
                        const emptyMilesKey = Object.keys(emptyMiles).find((key) =>
                            key.startsWith(`${assignment.id}-to-`),
                        );
                        emptyMilesForAssignment = emptyMilesKey ? emptyMiles[emptyMilesKey] : 0;
                    }

                    // Total miles including empty miles
                    const totalMiles = baseMiles + emptyMilesForAssignment;
                    amount = totalMiles * Number(assignment.chargeValue);
                    break;
                case 'PER_HOUR':
                    amount =
                        Number(assignment.billedDurationHours || assignment.routeLeg.durationHours) *
                        Number(assignment.chargeValue);
                    break;
                case 'PERCENTAGE_OF_LOAD':
                    amount =
                        (Number(assignment.billedLoadRate || assignment.load.rate) * Number(assignment.chargeValue)) /
                        100;
                    break;
                case 'FIXED_PAY':
                    amount = Number(assignment.chargeValue);
                    break;
            }
            total += amount;
        });

        // Add up line items
        invoice.lineItems.forEach((item) => {
            total += Number(item.amount);
        });

        setTotalAmount(total.toFixed(2));
    }, [invoice, invoice?.assignments, invoice?.lineItems, emptyMiles]);

    // Set mile calculation step visibility based on invoice assignments
    useEffect(() => {
        if (!invoice) return;

        // Check if there are mile-based assignments
        const hasMileBasedAssignments = invoice.assignments.some((assignment) => assignment.chargeType === 'PER_MILE');
        setShowMileCalculationStep(hasMileBasedAssignments);
    }, [invoice?.assignments]);

    const loadInvoiceData = async () => {
        setLoading(true);
        try {
            // Load all drivers first
            const { drivers } = await getAllDrivers({ limit: 999, offset: 0 });
            setAllDrivers(drivers);

            const invoiceData = await getDriverInvoiceById(invoiceId);

            if (invoiceData) {
                // Initialize date range state with invoice period using proper parsing to avoid timezone issues
                const parseDate = (date: string | Date | null | undefined) => {
                    if (!date) return new Date();
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
                    return new Date(date);
                };

                const parsedFromDate = invoiceData.fromDate ? parseDate(invoiceData.fromDate) : null;
                const parsedToDate = invoiceData.toDate ? parseDate(invoiceData.toDate) : null;

                setInvoice({
                    ...invoiceData,
                    fromDate: parsedFromDate,
                    toDate: parsedToDate,
                });

                if (parsedFromDate) {
                    setFromDate(parsedFromDate);
                }
                if (parsedToDate) {
                    setToDate(parsedToDate);
                }

                // Load all assignments for this driver
                await loadAssignments(invoiceData.driverId);
            }
        } catch (error) {
            notify({ title: 'Error loading invoice', message: `${error}`, type: 'error' });
            console.error('Error loading invoice:', error);
        }
        setLoading(false);
    };

    const loadAssignments = async (driverId: string, fromDate?: string, toDate?: string) => {
        setLoadingAssignments(true);

        try {
            const { assignments } = await getAllAssignments({
                limit: 999,
                offset: 0,
                sort: { key: 'routeLeg.endedAt', order: 'asc' },
                showCompletedOnly: true,
                showNotInvoicedOnly: true,
                driverIds: [driverId],
                invoiceId: invoiceId,
                ...(fromDate &&
                    toDate && {
                        fromDate,
                        toDate,
                    }),
            });
            setAllAssignments(assignments);
        } catch (error) {
            notify({ title: 'Error loading assignments', message: `${error}`, type: 'error' });
            console.error('Error loading assignments:', error);
        }

        setLoadingAssignments(false);
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
            // Otherwise, add it to the selectedAssignments array with proper serialization
            const serializedAssignment = {
                ...assignment,
                // Serialize all decimal fields to prevent JSON serialization issues
                chargeValue: assignment.chargeValue ? Number(assignment.chargeValue) : 0,
                billedDistanceMiles: assignment.billedDistanceMiles ? Number(assignment.billedDistanceMiles) : null,
                billedDurationHours: assignment.billedDurationHours ? Number(assignment.billedDurationHours) : null,
                billedLoadRate: assignment.billedLoadRate ? Number(assignment.billedLoadRate) : null,
                emptyMiles: assignment.emptyMiles ? Number(assignment.emptyMiles) : null,
            } as any; // Type assertion to allow serialization
            
            updatedSelectedAssignments = [...invoice.assignments, serializedAssignment];
        }

        // Update the state for selectedAssignments
        setInvoice((prev) => ({ ...prev, assignments: updatedSelectedAssignments }));
    };

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
                        // Store as number (will be serialized properly in handleUpdateInvoice)
                        emptyMiles: assignmentEmptyMiles > 0 ? (assignmentEmptyMiles as any) : null,
                    };
                });

                return { ...prev, assignments: updatedAssignments };
            });
        },
        [handleEmptyMilesUpdate],
    );

    const handleConfirmAssignments = () => {
        // Check if there are mile-based assignments
        const hasMileBasedAssignments = invoice.assignments.some((assignment) => assignment.chargeType === 'PER_MILE');

        // If there are mile-based assignments, show mile calculation step
        if (hasMileBasedAssignments) {
            setShowMileCalculationStep(true);
            setCurrentStep(2.5); // Mile calculation step
        } else {
            setShowMileCalculationStep(false);
            setCurrentStep(3); // Skip to additional items
        }
    };

    // Adds a new line item to the invoice.
    const handleAddLineItem = () => {
        if (newLineItem.description && newLineItem.amount) {
            setInvoice((prev) => ({
                ...prev,
                lineItems: [
                    ...prev.lineItems,
                    {
                        amount: new Decimal(newLineItem.amount),
                        description: newLineItem.description,
                        id: '',
                        createdAt: new Date(),
                    },
                ],
            }));
            setNewLineItem({ description: '', amount: '' });
        }
    };

    // Updates an existing line item. For example, if you want to modify the description
    // or amount of a line item without altering the rest of the invoice.
    const handleUpdateLineItem = (
        id: string,
        field: keyof ExpandedDriverInvoice['lineItems'][number],
        value: string | number,
    ) => {
        setInvoice((prev) => ({
            ...prev,
            lineItems: prev.lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        }));
    };

    const handleRemoveLineItem = (lineItemId: string) => {
        setInvoice((prev) => ({
            ...prev,
            lineItems: prev.lineItems.filter((item) => item.id !== lineItemId),
        }));
    };

    const handleUpdateInvoice = async () => {
        setUpdatingInvoice(true);

        try {
            // Sanitize and serialize the invoice data before sending to API to prevent serialization issues
            const sanitizedInvoice = {
                ...invoice,
                // Serialize totalAmount if it's a Decimal
                totalAmount: invoice.totalAmount ? Number(invoice.totalAmount) : 0,
                // Serialize line items
                lineItems: invoice.lineItems.map((item) => ({
                    ...item,
                    amount: item.amount ? Number(item.amount) : 0,
                })),
                assignments: invoice.assignments.map((assignment) => {
                    // Create a serializable copy of the assignment
                    const serializedAssignment = {
                        ...assignment,
                        // Serialize decimal fields properly
                        chargeValue: assignment.chargeValue ? Number(assignment.chargeValue) : 0,
                        // Ensure decimal fields are properly serialized and null when not relevant to charge type
                        billedDistanceMiles:
                            assignment.chargeType === 'PER_MILE' && assignment.billedDistanceMiles !== null
                                ? Number(assignment.billedDistanceMiles)
                                : null,
                        billedDurationHours:
                            assignment.chargeType === 'PER_HOUR' && assignment.billedDurationHours !== null
                                ? Number(assignment.billedDurationHours)
                                : null,
                        billedLoadRate:
                            assignment.chargeType === 'PERCENTAGE_OF_LOAD' && assignment.billedLoadRate !== null
                                ? Number(assignment.billedLoadRate)
                                : null,
                        // Ensure emptyMiles is handled properly
                        emptyMiles:
                            assignment.emptyMiles && Number(assignment.emptyMiles) > 0
                                ? Number(assignment.emptyMiles)
                                : null,
                    };
                    return serializedAssignment;
                }),
            } as any; // Type assertion to allow serialization

            const result = await updateDriverInvoice(invoiceId, sanitizedInvoice);
            if (result) {
                // Update local state to reflect status change
                setInvoice((prev) => ({
                    ...prev,
                    status: 'PENDING',
                }));

                notify({
                    title: 'Invoice updated successfully!',
                    message: 'Invoice status has been reset to Pending for driver review.',
                    type: 'success',
                });

                // Send notification to driver if enabled
                if (notifyDriver) {
                    await sendDriverNotification(invoiceId);
                }

                router.push(`/driverinvoices/${invoiceId}`);
            }
        } catch (error) {
            notify({ title: 'Error updating invoice', message: `${error}`, type: 'error' });
            console.error('Error updating invoice:', error);
        }

        setUpdatingInvoice(false);
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
                message: 'Failed to notify driver, but invoice was updated successfully',
                type: 'error',
            });
        }
    };

    const nextStep = () => {
        if (currentStep === 1) {
            handleConfirmAssignments();
        } else if (currentStep === 2.5 && showMileCalculationStep) {
            // Update assignments with latest empty miles data before proceeding
            const updatedAssignments = invoice.assignments.map((assignment) => {
                const emptyMilesKey = Object.keys(emptyMiles).find((key) => key.startsWith(`${assignment.id}-to-`));
                const assignmentEmptyMiles = emptyMilesKey ? emptyMiles[emptyMilesKey] : 0;

                return {
                    ...assignment,
                    emptyMiles: assignmentEmptyMiles > 0 ? new Prisma.Decimal(assignmentEmptyMiles) : null,
                };
            });

            setInvoice((prev) => ({ ...prev, assignments: updatedAssignments }));
            setCurrentStep(showMileCalculationStep ? 3 : 2);
        } else {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep === 2.5 && showMileCalculationStep) {
            setCurrentStep(1);
        } else if (currentStep === (showMileCalculationStep ? 3 : 2)) {
            setCurrentStep(showMileCalculationStep ? 2.5 : 1);
        } else if (currentStep === (showMileCalculationStep ? 4 : 3)) {
            setCurrentStep(showMileCalculationStep ? 3 : 2);
        } else {
            setCurrentStep((prev) => prev - 1);
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
            assignments: prev.assignments.map((a) => (a.id === assignment.id ? (assignment as any) : a)),
        }));

        setAllAssignments((prev) => prev.map((a) => (a.id === assignment.id ? assignment : a)));

        setShowAssignmentChargeChangeDialog(false);
    };

    if (loading) {
        return <InvoiceSkeleton />;
    }

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Driver Invoices</h1>
                </div>
            }
        >
            <div className="min-h-screen bg-gray-50/30 relative">
                <div className="max-w-7xl mx-auto p-3 sm:p-6 bg-transparent">
                    {showAssignmentChargeChangeDialog && (
                        <AssignmentChargeTypeChangeDialog
                            onConfirm={onChargeTypeChange}
                            onClose={() => setShowAssignmentChargeChangeDialog(false)}
                            assignmentDetails={currentAssEditCharge}
                        />
                    )}

                    {/* Apple-style Breadcrumb */}
                    <div className="mb-4 sm:mb-8 bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-200/30">
                        <nav className="flex" aria-label="Breadcrumb">
                            <ol className="flex items-center space-x-1 sm:space-x-2">
                                <li>
                                    <Link
                                        href="/driverinvoices"
                                        className="text-gray-500 hover:text-gray-700 text-sm sm:text-base transition-colors"
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
                                        Edit Invoice #{invoice?.invoiceNum}
                                    </span>
                                </li>
                            </ol>
                        </nav>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        {/* Header Card */}
                        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6">
                            <div className="text-center">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                                    Edit Driver Invoice
                                </h1>
                                <p className="text-gray-600">Modify invoice details, assignments, and line items</p>
                            </div>
                        </div>

                        {/* Invoice Stepper Component */}
                        <InvoiceStepper
                            currentStep={currentStep}
                            steps={editInvoiceSteps}
                            showMileCalculationStep={showMileCalculationStep}
                            mode="edit"
                        />

                        {/* Driver Information */}
                        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-blue-100 rounded-xl p-3">
                                        <UserIcon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                                            {invoice.driver.name.toLowerCase()}
                                        </h3>
                                        <p className="text-sm text-gray-600">{invoice.driver.email}</p>
                                        <p className="text-sm text-gray-600">{invoice.driver.phone}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-200/40">
                                        <p className="text-sm font-medium text-blue-700">
                                            Invoice #{invoice.invoiceNum}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl shadow-sm relative">
                            {/* Step 1: Edit Assignments */}
                            {currentStep === 1 && (
                                <AssignmentSelector
                                    driverId={invoice.driverId}
                                    selectedAssignments={invoice.assignments as any}
                                    allAssignments={allAssignments}
                                    loadingAssignments={loadingAssignments}
                                    mode="edit"
                                    invoice={invoice}
                                    setInvoice={setInvoice}
                                    fromDate={fromDate}
                                    toDate={toDate}
                                    navigation={{
                                        showCancelButton: true,
                                        onCancel: () => router.push(`/driverinvoices/${invoiceId}`),
                                        onNext: handleConfirmAssignments,
                                        nextButtonText: 'Next Step',
                                        cancelButtonText: 'Cancel',
                                    }}
                                    onAssignmentToggle={handleAssignmentToggle}
                                    onReloadAssignments={() => loadAssignments(invoice.driverId)}
                                    onAssignmentEdit={(assignment) => {
                                        setShowAssignmentChargeChangeDialog(true);
                                        setCurrentAssEditCharge(assignment);
                                    }}
                                    onPeriodChange={(fromDate, toDate) => {
                                        // Update the invoice period state using proper parsing to avoid timezone issues
                                        const parseDate = (date: string | Date | null | undefined) => {
                                            if (!date) return new Date();
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
                                            return new Date(date);
                                        };

                                        setFromDate(parseDate(fromDate));
                                        setToDate(parseDate(toDate));

                                        // Update the invoice object directly
                                        setInvoice((prev) => ({
                                            ...prev,
                                            fromDate: parseDate(fromDate),
                                            toDate: parseDate(toDate),
                                        }));
                                    }}
                                    formatCurrency={formatCurrency}
                                />
                            )}

                            {/* Step 2.5: Mile Calculation (conditional) */}
                            {currentStep === 2.5 && showMileCalculationStep && (
                                <div>
                                    {/* Header */}
                                    <div className="px-4 py-4 sm:px-6 bg-blue-100/50 backdrop-blur-2xl border-b border-blue-100/40 rounded-tl-xl rounded-tr-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                                                <svg
                                                    className="w-4 h-4 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                                    />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-900">
                                                    Mile Calculation
                                                </h3>
                                                <p className="text-xs text-gray-600">
                                                    Calculate empty miles between assignments
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content - Full screen breaking container */}
                                    <div className="p-4 sm:p-6 relative">
                                        <div className="relative z-0">
                                            <MileCalculation
                                                assignments={invoice.assignments as any}
                                                emptyMiles={emptyMiles}
                                                emptyMilesInput={emptyMilesInput}
                                                selectedAssignmentId={selectedAssignmentId}
                                                onAssignmentSelect={setSelectedAssignmentId}
                                                onEmptyMilesUpdate={handleEmptyMilesUpdateWithInvoice}
                                                setEmptyMilesInput={setEmptyMilesInput}
                                                setEmptyMiles={setEmptyMiles}
                                                calculateHaversineDistance={calculateHaversineDistance}
                                            />
                                        </div>

                                        <CompensationSummary
                                            assignments={invoice.assignments as any}
                                            emptyMiles={emptyMiles}
                                        />

                                        <div className="mt-6 flex justify-between">
                                            <button
                                                onClick={() => setCurrentStep(1)}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                Back to Assignments
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // Update assignments with latest empty miles data
                                                    const updatedAssignments = invoice.assignments.map((assignment) => {
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

                                                    setInvoice((prev) => ({
                                                        ...prev,
                                                        assignments: updatedAssignments,
                                                    }));
                                                    setCurrentStep(3);
                                                }}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                Continue to Additional Items
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2/3: Edit Additional Items */}
                            {currentStep === (showMileCalculationStep ? 3 : 2) && (
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
                                    mode="edit"
                                    nextButtonText="Review Changes"
                                />
                            )}

                            {/* Step 3/4: Review & Update */}
                            {currentStep === (showMileCalculationStep ? 4 : 3) && (
                                <InvoiceReview
                                    invoice={invoice}
                                    allDrivers={allDrivers}
                                    emptyMiles={emptyMiles}
                                    totalAmount={totalAmount}
                                    notifyDriver={notifyDriver}
                                    setNotifyDriver={setNotifyDriver}
                                    isLoading={updatingInvoice}
                                    loadingText="Updating Invoice..."
                                    onPrevStep={prevStep}
                                    onSubmit={handleUpdateInvoice}
                                    submitButtonText="Update Invoice"
                                    mode="edit"
                                    formatCurrency={formatCurrency}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {updatingInvoice && <LoadingOverlay message="Updating Invoice..." />}
        </Layout>
    );
};

const InvoiceSkeleton = () => {
    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    {/* Skeleton for header title */}
                    <div className="h-6 w-48 bg-gray-200/80 rounded-lg animate-pulse" />
                </div>
            }
        >
            <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20">
                <div className="py-4 sm:py-6 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                        {/* Breadcrumb Skeleton */}
                        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/30 rounded-xl p-4">
                            <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
                                <div className="h-4 w-20 bg-gray-200/80 rounded animate-pulse" />
                                <div className="h-3 w-3 bg-gray-200/60 rounded animate-pulse" />
                                <div className="h-4 w-24 bg-gray-200/80 rounded animate-pulse" />
                                <div className="h-3 w-3 bg-gray-200/60 rounded animate-pulse" />
                                <div className="h-4 w-32 bg-gray-200/80 rounded animate-pulse" />
                            </nav>
                        </div>

                        {/* Header Card Skeleton */}
                        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 animate-pulse">
                            <div className="text-center">
                                <div className="h-8 w-64 bg-gray-200/80 rounded-lg mx-auto mb-2" />
                                <div className="h-4 w-48 bg-gray-200/60 rounded mx-auto" />
                            </div>
                        </div>

                        {/* Stepper Skeleton */}
                        <div className="mb-4 sm:mb-8 mx-2 sm:mx-4 lg:mx-6">
                            {/* Mobile Progress Bar Skeleton */}
                            <div className="sm:hidden mb-4 animate-pulse">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="h-4 w-16 bg-gray-200/80 rounded" />
                                    <div className="h-4 w-24 bg-gray-200/80 rounded" />
                                </div>
                                <div className="w-full bg-gray-200/60 rounded-full h-2">
                                    <div className="bg-blue-300/60 h-2 rounded-full w-1/3" />
                                </div>
                            </div>

                            {/* Desktop Stepper Skeleton */}
                            <div className="hidden sm:flex items-center justify-center animate-pulse">
                                {/* Step 1 */}
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-200/80 rounded-full" />
                                    <div className="mt-3 text-center">
                                        <div className="h-4 w-20 bg-gray-200/80 rounded mb-1" />
                                        <div className="h-3 w-16 bg-gray-200/60 rounded" />
                                    </div>
                                </div>

                                {/* Connector 1 */}
                                <div className="flex-1 mx-4 h-0.5 bg-gray-200/60 relative">
                                    <div className="absolute left-0 top-0 h-full bg-blue-300/60 w-full" />
                                </div>

                                {/* Mile Calculation Step Skeleton */}
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-200/80 rounded-full" />
                                    <div className="mt-3 text-center">
                                        <div className="h-4 w-24 bg-gray-200/80 rounded mb-1" />
                                        <div className="h-3 w-20 bg-gray-200/60 rounded" />
                                    </div>
                                </div>

                                {/* Connector 2 */}
                                <div className="flex-1 mx-4 h-0.5 bg-gray-200/60" />

                                {/* Step 3 */}
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-200/60 rounded-full" />
                                    <div className="mt-3 text-center">
                                        <div className="h-4 w-20 bg-gray-200/80 rounded mb-1" />
                                        <div className="h-3 w-16 bg-gray-200/60 rounded" />
                                    </div>
                                </div>

                                {/* Connector 3 */}
                                <div className="flex-1 mx-4 h-0.5 bg-gray-200/60" />

                                {/* Step 4 */}
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-200/60 rounded-full" />
                                    <div className="mt-3 text-center">
                                        <div className="h-4 w-24 bg-gray-200/80 rounded mb-1" />
                                        <div className="h-3 w-16 bg-gray-200/60 rounded" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Driver Information Skeleton */}
                        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 animate-pulse">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-blue-100/80 rounded-xl p-3">
                                        <div className="h-6 w-6 bg-gray-200/80 rounded" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-5 w-36 bg-gray-200/80 rounded" />
                                        <div className="h-3 w-28 bg-gray-200/60 rounded" />
                                        <div className="h-3 w-32 bg-gray-200/60 rounded" />
                                    </div>
                                </div>
                                <div className="hidden sm:block">
                                    <div className="h-4 w-20 bg-gray-200/60 rounded" />
                                </div>
                            </div>
                        </div>

                        {/* Main Content Skeleton */}
                        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl shadow-sm animate-pulse">
                            {/* Header */}
                            <div className="px-4 py-4 sm:px-6 bg-blue-50/30 backdrop-blur-2xl border-b border-blue-100/40 rounded-tl-xl rounded-tr-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-200/80 rounded-xl" />
                                    <div className="space-y-1">
                                        <div className="h-4 w-32 bg-gray-200/80 rounded" />
                                        <div className="h-3 w-40 bg-gray-200/60 rounded" />
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 sm:p-6 space-y-6">
                                {/* Assignment Cards Skeleton */}
                                {[1, 2, 3].map((item) => (
                                    <div
                                        key={item}
                                        className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/40"
                                    >
                                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                                            <div className="lg:col-span-2 space-y-2">
                                                <div className="h-4 w-20 bg-gray-200/80 rounded" />
                                                <div className="h-5 w-32 bg-gray-200/80 rounded" />
                                                <div className="h-3 w-28 bg-gray-200/60 rounded" />
                                            </div>
                                            <div className="lg:col-span-2 space-y-2">
                                                <div className="h-4 w-24 bg-gray-200/80 rounded" />
                                                <div className="h-5 w-36 bg-gray-200/80 rounded" />
                                            </div>
                                            <div className="lg:col-span-1 space-y-2">
                                                <div className="h-4 w-16 bg-gray-200/80 rounded" />
                                                <div className="h-5 w-20 bg-gray-200/80 rounded" />
                                            </div>
                                            <div className="lg:col-span-1">
                                                <div className="h-6 w-16 bg-green-200/80 rounded ml-auto" />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Navigation Buttons Skeleton */}
                                <div className="mt-6 flex justify-between">
                                    <div className="h-10 w-20 bg-gray-200/80 rounded-lg" />
                                    <div className="h-10 w-24 bg-blue-200/80 rounded-lg" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

EditDriverInvoice.authenticationEnabled = true;

export default EditDriverInvoice;
