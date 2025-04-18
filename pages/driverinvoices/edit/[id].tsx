'use client';

import React, { useState, useEffect } from 'react';
import {
    UserIcon,
    ClipboardDocumentListIcon,
    CurrencyDollarIcon,
    DocumentCheckIcon,
    PlusIcon,
    MinusIcon,
    TrashIcon,
    ArrowPathIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import Layout from 'components/layout/Layout';
import { getAllDrivers } from 'lib/rest/driver';
import type { Driver } from '@prisma/client';
import { getAllAssignments } from 'lib/rest/assignment';
import type {
    DriverInvoiceLineItem,
    ExpandedDriverAssignment,
    ExpandedDriverInvoice,
    NewDriverInvoice,
} from 'interfaces/models';
import Spinner from 'components/Spinner';
import Link from 'next/link';
import { notify } from 'components/Notification';
import { getDriverInvoiceById, updateDriverInvoice } from 'lib/rest/driverinvoice';
import AssignmentChargeTypeChangeDialog from 'components/driverinvoices/AssignmentChargeChange';
import { useRouter } from 'next/router';
import Decimal from 'decimal.js';

import dayjs from 'dayjs';
import { PageWithAuth } from 'interfaces/auth';

const EditDriverInvoice: PageWithAuth = ({ params }: { params: { id: string } }) => {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [invoice, setInvoice] = useState<ExpandedDriverInvoice>(undefined);
    const [newLineItem, setNewLineItem] = useState<DriverInvoiceLineItem>({ description: '', amount: '' });
    const [totalAmount, setTotalAmount] = useState('0.00');

    const [loading, setLoading] = useState(true);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [driver, setDriver] = useState<Driver | null>(null);
    const [allAssignments, setAllAssignments] = useState<ExpandedDriverAssignment[]>([]);

    const [showAssignmentChargeChangeDialog, setShowAssignmentChargeChangeDialog] = useState(false);
    const [currentAssEditCharge, setCurrentAssEditCharge] = useState<ExpandedDriverAssignment | null>(null);
    const [updatingInvoice, setUpdatingInvoice] = useState(false);
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
                    amount =
                        Number(assignment.billedDistanceMiles || assignment.routeLeg.distanceMiles) *
                        Number(assignment.chargeValue);
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
    }, [invoice, invoice?.assignments, invoice?.lineItems]);

    const loadInvoiceData = async () => {
        setLoading(true);
        try {
            const invoiceData = await getDriverInvoiceById(invoiceId);

            if (invoiceData) {
                setInvoice({
                    ...invoiceData,
                });

                // Load all assignments for this driver
                await loadAssignments(invoiceData.driverId);
            }
        } catch (error) {
            notify({ title: 'Error loading invoice', message: `${error}`, type: 'error' });
            console.error('Error loading invoice:', error);
        }
        setLoading(false);
    };

    const loadAssignments = async (driverId: string) => {
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

        // Update the billed amounts for the selected chargetype
        const updatedAssignments = invoice.assignments.map((assignment) => {
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
            };
        });
        setInvoice((prev) => ({ ...prev, assignments: updatedAssignments }));

        setCurrentStep(2);
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
            const result = await updateDriverInvoice(invoiceId, invoice);
            if (result) {
                notify({ title: 'Invoice updated successfully!', type: 'success' });
                router.push(`/driverinvoices/${invoiceId}`);
            }
        } catch (error) {
            notify({ title: 'Error updating invoice', message: `${error}`, type: 'error' });
            console.error('Error updating invoice:', error);
        }

        setUpdatingInvoice(false);
    };

    const nextStep = () => {
        setCurrentStep((prev) => prev + 1);
    };

    const prevStep = () => {
        setCurrentStep((prev) => prev - 1);
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
            assignments: prev.assignments.map((a) => (a.id === assignment.id ? { ...a, ...assignment } : a)),
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
            <>
                <div className="py-2 mx-auto max-w-7xl">
                    {showAssignmentChargeChangeDialog && (
                        <AssignmentChargeTypeChangeDialog
                            onConfirm={onChargeTypeChange}
                            onClose={() => setShowAssignmentChargeChangeDialog(false)}
                            assignmentDetails={currentAssEditCharge}
                        />
                    )}

                    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-none mt-4 ">
                        <div className="mb-8 static top-0 bg-white py-2 z-0 ">
                            <nav className="flex" aria-label="Breadcrumb">
                                <ol className="flex items-center space-x-2">
                                    <li>
                                        <Link href="/driverinvoices" className="text-gray-500 hover:text-gray-700">
                                            Driver Invoices
                                        </Link>
                                    </li>
                                    <li className="flex items-center">
                                        <svg
                                            className="h-5 w-5 text-gray-400"
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
                                        <span className="ml-2 text-gray-700 font-medium">Edit Driver Invoice</span>
                                    </li>
                                    <li className="flex items-center">
                                        <svg
                                            className="h-5 w-5 text-gray-400"
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
                                        <span className="ml-2 text-gray-700 font-medium">
                                            Invoice #{invoice.invoiceNum}
                                        </span>
                                    </li>
                                </ol>
                            </nav>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center bg-white p-4 rounded-lg">
                            Edit Driver Invoice
                        </h1>

                        {/* Stepper */}
                        <div className="mb-10 mx-6">
                            <div className="flex items-center">
                                {/* Step 1 */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                            currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                                        }`}
                                    >
                                        <ClipboardDocumentListIcon className="w-5 h-5" />
                                    </div>
                                    <span
                                        className={`mt-4 text-sm px-1 ${
                                            currentStep == 1
                                                ? 'border border-blue-200 rounded-md bg-slate-100 font-semibold text-gray-800'
                                                : 'font-medium text-gray-400'
                                        }`}
                                    >
                                        1. Edit Assignments
                                    </span>
                                </div>
                                <div className={`flex-1 h-1 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>

                                {/* Step 2 */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                            currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                                        }`}
                                    >
                                        <CurrencyDollarIcon className="w-5 h-5" />
                                    </div>
                                    <span
                                        className={`mt-4 text-sm px-1 ${
                                            currentStep == 2
                                                ? 'border border-blue-200 rounded-md bg-slate-100 font-semibold text-gray-800'
                                                : 'font-medium text-gray-400'
                                        }`}
                                    >
                                        2. Edit Additional Items
                                    </span>
                                </div>
                                <div className={`flex-1 h-1 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>

                                {/* Step 3 */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                            currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                                        }`}
                                    >
                                        <DocumentCheckIcon className="w-5 h-5" />
                                    </div>
                                    <span
                                        className={`mt-4 text-sm px-1 ${
                                            currentStep == 3
                                                ? 'border border-blue-200 rounded-md bg-slate-100 font-semibold text-gray-800'
                                                : 'font-medium text-gray-400'
                                        }`}
                                    >
                                        3. Review & Update
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Driver Information */}
                        <div className="mb-8 bg-whtie p-5 rounded-lg border border-slate-100">
                            <h2 className="text-lg font-semibold text-gray-800 mb-2">Driver Information</h2>
                            {invoice && (
                                <div className="flex items-center">
                                    <div className="bg-blue-100 rounded-full p-2 mr-3">
                                        <UserIcon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 capitalize">
                                            {invoice.driver.name.toLowerCase()}
                                        </h3>
                                        <p className="text-sm text-gray-500">{invoice.driver.email}</p>
                                        <p className="text-sm text-gray-500">{invoice.driver.phone}</p>
                                    </div>
                                    <div className="ml-auto text-right font-semibold text-gray-900">
                                        <p className="text-sm text-gray-500">Invoice #{invoice.invoiceNum}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border border-gray-100 rounded-lg shadow-sm">
                            {/* Step 1: Edit Assignments */}
                            {currentStep === 1 && (
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <div className="flex flex-row justify-between items-center mb-6">
                                        <div className="flex flex-1 flex-col items-start">
                                            <h2 className="text-xl font-semibold text-gray-800 mb-1">
                                                Edit Assignments
                                            </h2>
                                            <p className="text-gray-400 text-sm font-normal">
                                                Select or deselect assignments for this invoice.
                                            </p>
                                        </div>
                                        <div className="flex flex-1 w-full justify-end">
                                            <button
                                                onClick={() => loadAssignments(invoice.driverId)}
                                                className="flex flex-row items-center justify-center px-2 py-2 border hover:bg-slate-200 border-gray-300 text-gray-700 rounded-lg text-sm transition-colors"
                                            >
                                                <ArrowPathIcon className="w-3 h-3 mr-2" />
                                                Reload Assignments
                                            </button>
                                        </div>
                                    </div>

                                    {loadingAssignments ? (
                                        <div className="flex items-center justify-center w-full p-4">
                                            <Spinner /> Loading Assignments
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                                <thead>
                                                    <tr className="bg-gray-100">
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Select
                                                        </th>
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Ref #
                                                        </th>
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Route
                                                        </th>
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                            Charge Type
                                                        </th>
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Amount
                                                        </th>
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {allAssignments.map((assignment) => {
                                                        let calculatedAmount = 0;
                                                        switch (assignment.chargeType) {
                                                            case 'PER_MILE':
                                                                calculatedAmount =
                                                                    Number(
                                                                        assignment.billedDistanceMiles ||
                                                                            assignment.routeLeg.distanceMiles,
                                                                    ) * Number(assignment.chargeValue);
                                                                break;
                                                            case 'PER_HOUR':
                                                                calculatedAmount =
                                                                    Number(
                                                                        assignment.billedDurationHours ||
                                                                            assignment.routeLeg.durationHours,
                                                                    ) * Number(assignment.chargeValue);
                                                                break;
                                                            case 'PERCENTAGE_OF_LOAD':
                                                                calculatedAmount =
                                                                    (Number(
                                                                        assignment.billedLoadRate ||
                                                                            assignment.load.rate,
                                                                    ) *
                                                                        Number(assignment.chargeValue)) /
                                                                    100;
                                                                break;
                                                            case 'FIXED_PAY':
                                                                calculatedAmount = Number(assignment.chargeValue);
                                                                break;
                                                        }

                                                        // Format the locations
                                                        const formattedLocations = assignment.routeLeg.locations
                                                            .map((loc) => {
                                                                if (loc.loadStop) {
                                                                    return `${loc.loadStop.name.toUpperCase()} (${
                                                                        loc.loadStop.city
                                                                    }, ${loc.loadStop.state.toLocaleUpperCase()})`;
                                                                } else if (loc.location) {
                                                                    return `${loc.location.name.toLocaleUpperCase()} (${
                                                                        loc.location.city
                                                                    }, ${loc.location.state.toLocaleUpperCase()})`;
                                                                }
                                                                return '';
                                                            })
                                                            .join(' -> \n');

                                                        const isSelected = invoice.assignments.some(
                                                            (a) => a.id === assignment.id,
                                                        );

                                                        return (
                                                            <tr
                                                                key={assignment.id}
                                                                className={`hover:bg-gray-50 cursor-pointer ${
                                                                    isSelected ? 'bg-blue-50' : 'bg-white'
                                                                }`}
                                                                onClick={() => handleAssignmentToggle(assignment.id)}
                                                            >
                                                                <td className="py-3 px-4">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() =>
                                                                            handleAssignmentToggle(assignment.id)
                                                                        }
                                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-4 text-sm text-gray-800">
                                                                    <Link
                                                                        href={`/loads/${assignment.load.id}#load-assignments`}
                                                                        target="_blank"
                                                                    >
                                                                        <span className="underline">
                                                                            {assignment.load.refNum}
                                                                        </span>
                                                                    </Link>
                                                                </td>
                                                                <td className="py-3 px-4 text-sm font-medium text-gray-800 whitespace-break-spaces capitalize">
                                                                    {formattedLocations}
                                                                </td>
                                                                <td className="py-3 px-4 text-sm text-gray-800">
                                                                    {assignment.chargeType === 'PER_MILE' &&
                                                                        `$${assignment.chargeValue}/mile`}
                                                                    {assignment.chargeType === 'PER_HOUR' &&
                                                                        `$${assignment.chargeValue}/hour`}
                                                                    {assignment.chargeType === 'PERCENTAGE_OF_LOAD' &&
                                                                        `${assignment.chargeValue}% of load`}
                                                                    {assignment.chargeType === 'FIXED_PAY' &&
                                                                        'Fixed Pay'}
                                                                </td>
                                                                <td className="py-3 px-4 text-sm font-medium text-gray-800 pointer-events-none">
                                                                    <button
                                                                        className="pointer-events-auto"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setShowAssignmentChargeChangeDialog(true);
                                                                            setCurrentAssEditCharge(assignment);
                                                                        }}
                                                                    >
                                                                        <div className="flex flex-row items-center justify-start h-full gap-1 cursor-pointer">
                                                                            {formatCurrency(
                                                                                calculatedAmount.toFixed(2),
                                                                            )}
                                                                            <PencilSquareIcon
                                                                                className="w-4 h-4 ml-1 text-blue-600"
                                                                                color="blue"
                                                                            />
                                                                        </div>
                                                                    </button>
                                                                </td>
                                                                <td className="py-3 px-4 text-sm text-gray-800 capitalize">
                                                                    {assignment.routeLeg.status.toLowerCase()}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <div className="mt-6 flex justify-between">
                                        <Link href={`/driverinvoices/${invoiceId}`}>
                                            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                                Cancel
                                            </button>
                                        </Link>
                                        <button
                                            onClick={handleConfirmAssignments}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Edit Additional Items */}
                            {currentStep === 2 && (
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Edit Additional Items</h2>

                                    <div className="mb-6">
                                        <h3 className="font-medium text-gray-700 mb-2">Invoice Details</h3>
                                        <div className="flex flex-col gap-4 w-full ">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Invoice #{' '}
                                                    <span className="text-gray-400">{invoice.invoiceNum}</span>
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-4 bg">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        From Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={
                                                            invoice.fromDate
                                                                ? dayjs(invoice.fromDate).format('YYYY-MM-DD')
                                                                : ''
                                                        }
                                                        onChange={(e) => {
                                                            // Parse the input as a local date
                                                            const localDate = dayjs(
                                                                e.target.value,
                                                                'YYYY-MM-DD',
                                                            ).toDate();
                                                            setInvoice((prev) => ({
                                                                ...prev,
                                                                fromDate: localDate,
                                                            }));
                                                        }}
                                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        To Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={
                                                            invoice.toDate
                                                                ? dayjs(invoice.toDate).format('YYYY-MM-DD')
                                                                : ''
                                                        }
                                                        onChange={(e) => {
                                                            // Parse the input as a local date
                                                            const localDate = dayjs(
                                                                e.target.value,
                                                                'YYYY-MM-DD',
                                                            ).toDate();
                                                            setInvoice((prev) => ({
                                                                ...prev,
                                                                toDate: localDate,
                                                            }));
                                                        }}
                                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Notes
                                            </label>
                                            <textarea
                                                value={invoice.notes}
                                                onChange={(e) =>
                                                    setInvoice((prev) => ({ ...prev, notes: e.target.value }))
                                                }
                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                rows={3}
                                                placeholder="Add any notes about this invoice..."
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="font-medium text-gray-700 mb-1">Line Items</h3>
                                        <p className="text-sm mb-2 text-gray-500">
                                            Add, edit or remove line items on this invoice.
                                        </p>

                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Description
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Amount
                                                        </th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Action
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {invoice.lineItems.map((item) => (
                                                        <tr key={item.id}>
                                                            <td className="px-4 py-3 text-sm text-gray-800">
                                                                {item.description}
                                                            </td>
                                                            <td
                                                                className={`px-4 py-3 text-sm ${
                                                                    Number(item.amount) >= 0
                                                                        ? 'text-gray-800'
                                                                        : 'text-red-600'
                                                                } `}
                                                            >
                                                                {Number(item.amount) >= 0
                                                                    ? formatCurrency(item.amount.toString())
                                                                    : `(${formatCurrency(
                                                                          Math.abs(Number(item.amount)).toString(),
                                                                      )})`}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right">
                                                                <button
                                                                    onClick={() => handleRemoveLineItem(item.id!)}
                                                                    className="text-red-500 hover:text-red-700"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="text"
                                                                value={newLineItem.description}
                                                                onChange={(e) =>
                                                                    setNewLineItem((prev) => ({
                                                                        ...prev,
                                                                        description: e.target.value,
                                                                    }))
                                                                }
                                                                autoFocus
                                                                placeholder="Description"
                                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setNewLineItem((prev) => ({
                                                                            ...prev,
                                                                            amount: prev.amount.startsWith('-')
                                                                                ? prev.amount.substring(1)
                                                                                : `-${prev.amount}`,
                                                                        }))
                                                                    }
                                                                    className="p-2 text-gray-500 hover:text-gray-700"
                                                                >
                                                                    {newLineItem.amount.startsWith('-') ? (
                                                                        <MinusIcon className="w-4 h-4" />
                                                                    ) : (
                                                                        <PlusIcon className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    value={
                                                                        newLineItem.amount.startsWith('-')
                                                                            ? newLineItem.amount.substring(1)
                                                                            : newLineItem.amount
                                                                    }
                                                                    onChange={(e) =>
                                                                        setNewLineItem((prev) => ({
                                                                            ...prev,
                                                                            amount: prev.amount.startsWith('-')
                                                                                ? `-${e.target.value}`
                                                                                : e.target.value,
                                                                        }))
                                                                    }
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            handleAddLineItem();
                                                                            e.preventDefault();
                                                                        }
                                                                    }}
                                                                    placeholder="Amount"
                                                                    step="0.01"
                                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                onClick={handleAddLineItem}
                                                                disabled={
                                                                    !newLineItem.description || !newLineItem.amount
                                                                }
                                                                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                                            >
                                                                Add
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-between">
                                        <button
                                            onClick={prevStep}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={nextStep}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Review Changes
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Review & Update */}
                            {currentStep === 3 && (
                                <div className="relative">
                                    {updatingInvoice && (
                                        <div className="absolute flex flex-col h-full bg-slate-100/60 items-center justify-center w-full font-semibold ">
                                            <>
                                                <Spinner /> Updating Invoice...
                                            </>
                                        </div>
                                    )}
                                    <div className="bg-gray-50 p-6 rounded-lg ">
                                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                            Review Invoice Changes
                                        </h2>

                                        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h3 className="text-lg font-medium text-gray-800">
                                                        Invoice Summary
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        Period: {new Date(invoice.fromDate).toLocaleDateString()} -{' '}
                                                        {new Date(invoice.toDate).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Invoice #{invoice.invoiceNum}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {formatCurrency(totalAmount)}
                                                    </div>
                                                    <p className="text-sm text-gray-500">Total Amount</p>
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h4 className="font-medium text-gray-700 mb-2">Driver Information</h4>
                                                <div className="bg-gray-50 p-3 rounded-md">
                                                    {invoice && (
                                                        <>
                                                            <p className="text-sm font-semibold text-gray-800 capitalize">
                                                                {invoice.driver.name.toLowerCase()}
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                {invoice.driver.email}
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                {invoice.driver.phone}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {invoice.notes && (
                                                <div className="mb-6">
                                                    <h4 className="font-medium text-gray-700 mb-2">Notes</h4>
                                                    <div className="bg-gray-50 p-3 rounded-md">
                                                        <p className="text-sm text-gray-800">{invoice.notes}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mb-6">
                                                <h4 className="font-medium text-gray-700 mb-2">
                                                    Assignments ({invoice.assignments.length})
                                                </h4>
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                                        <thead>
                                                            <tr className="bg-gray-100">
                                                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Ref #
                                                                </th>
                                                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Route
                                                                </th>
                                                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 whitespace-nowrap uppercase tracking-wider">
                                                                    Charge Type
                                                                </th>
                                                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Amount
                                                                </th>
                                                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Status
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200">
                                                            {invoice.assignments.map((assignment) => {
                                                                let calculatedAmount = 0;
                                                                switch (assignment.chargeType) {
                                                                    case 'PER_MILE':
                                                                        calculatedAmount =
                                                                            Number(
                                                                                assignment.billedDistanceMiles ||
                                                                                    assignment.routeLeg.distanceMiles,
                                                                            ) * Number(assignment.chargeValue);
                                                                        break;
                                                                    case 'PER_HOUR':
                                                                        calculatedAmount =
                                                                            Number(
                                                                                assignment.billedDurationHours ||
                                                                                    assignment.routeLeg.durationHours,
                                                                            ) * Number(assignment.chargeValue);
                                                                        break;
                                                                    case 'PERCENTAGE_OF_LOAD':
                                                                        calculatedAmount =
                                                                            (Number(
                                                                                assignment.billedLoadRate ||
                                                                                    assignment.load.rate,
                                                                            ) *
                                                                                Number(assignment.chargeValue)) /
                                                                            100;
                                                                        break;
                                                                    case 'FIXED_PAY':
                                                                        calculatedAmount = Number(
                                                                            assignment.chargeValue,
                                                                        );
                                                                        break;
                                                                }

                                                                // Format the locations
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
                                                                        className="hover:bg-gray-50"
                                                                    >
                                                                        <td className="py-3 px-4 text-sm text-gray-800">
                                                                            {assignment.load.refNum}
                                                                        </td>
                                                                        <td className="py-3 px-4 text-sm font-medium text-gray-800 whitespace-break-spaces capitalize">
                                                                            {formattedLocations}
                                                                        </td>
                                                                        <td className="py-3 px-4 text-sm text-gray-800">
                                                                            {assignment.chargeType === 'PER_MILE' &&
                                                                                `$${assignment.chargeValue}/mile`}
                                                                            {assignment.chargeType === 'PER_HOUR' &&
                                                                                `$${assignment.chargeValue}/hour`}
                                                                            {assignment.chargeType ===
                                                                                'PERCENTAGE_OF_LOAD' &&
                                                                                `${assignment.chargeValue}% of load`}
                                                                            {assignment.chargeType === 'FIXED_PAY' &&
                                                                                'Fixed Pay'}
                                                                        </td>
                                                                        <td className="py-3 px-4 text-sm font-medium text-gray-800">
                                                                            {formatCurrency(
                                                                                calculatedAmount.toFixed(2),
                                                                            )}
                                                                        </td>
                                                                        <td className="py-3 px-4 text-sm text-gray-800">
                                                                            {'Completed'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h4 className="font-medium text-gray-700 mb-2">
                                                    Additional Line Items ({invoice.lineItems.length})
                                                </h4>
                                                {invoice.lineItems.length > 0 ? (
                                                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                                        <thead>
                                                            <tr className="bg-gray-100">
                                                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Description
                                                                </th>
                                                                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Amount
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200">
                                                            {invoice.lineItems.map((item) => (
                                                                <tr key={item.id}>
                                                                    <td className="py-3 px-4 text-sm text-gray-800">
                                                                        {item.description}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-sm text-right font-medium text-gray-800">
                                                                        {Number(item.amount) >= 0
                                                                            ? formatCurrency(item.amount.toString())
                                                                            : `(${formatCurrency(
                                                                                  Math.abs(
                                                                                      Number(item.amount),
                                                                                  ).toString(),
                                                                              )})`}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <p className="text-sm text-gray-500 italic">
                                                        No additional line items
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-6 flex justify-between">
                                            <button
                                                onClick={prevStep}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={handleUpdateInvoice}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                Update Invoice
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
        </Layout>
    );
};

const InvoiceSkeleton = () => {
    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    {/* Skeleton for header title */}
                    <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-none mt-4">
                    {/* Breadcrumb Skeleton */}
                    <div className="mb-8 static top-0 bg-white py-2 z-0">
                        <nav className="flex space-x-2" aria-label="Breadcrumb">
                            {/** Render three skeleton items for breadcrumb */}
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-6 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
                        </nav>
                    </div>

                    {/* Page Title Skeleton */}
                    <div className="animate-pulse">
                        <div className="h-8 w-64 bg-gray-200 rounded-lg mx-auto mb-6" />
                    </div>

                    {/* Stepper Skeleton */}
                    <div className="mb-10 mx-6 animate-pulse">
                        <div className="flex items-center space-x-2">
                            {/* Three step circles */}
                            <div className="h-10 w-10 bg-gray-200 rounded-full" />
                            <div className="flex-1 h-1 bg-gray-200 rounded" />
                            <div className="h-10 w-10 bg-gray-200 rounded-full" />
                            <div className="flex-1 h-1 bg-gray-200 rounded" />
                            <div className="h-10 w-10 bg-gray-200 rounded-full" />
                        </div>
                        <div className="flex justify-around mt-4">
                            <div className="h-4 w-24 bg-gray-200 rounded" />
                            <div className="h-4 w-24 bg-gray-200 rounded" />
                            <div className="h-4 w-24 bg-gray-200 rounded" />
                        </div>
                    </div>

                    {/* Driver Information Skeleton */}
                    <div className="mb-8 p-5 rounded-lg border border-slate-100 flex items-center animate-pulse">
                        <div className="bg-blue-100 rounded-full p-2 mr-3">
                            <div className="h-6 w-6 bg-gray-200 rounded-full" />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <div className="h-4 w-48 bg-gray-200 rounded" />
                            <div className="h-3 w-32 bg-gray-200 rounded" />
                            <div className="h-3 w-24 bg-gray-200 rounded" />
                        </div>
                        <div className="ml-auto">
                            <div className="h-3 w-20 bg-gray-200 rounded" />
                        </div>
                    </div>

                    {/* Table Skeleton for Assignments */}
                    <div className="mb-6">
                        <div className="h-6 w-40 bg-gray-200 rounded mb-4 animate-pulse" />
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                <thead>
                                    <tr className="bg-gray-100">
                                        {['Select', 'Ref #', 'Route', 'Charge Type', 'Amount', 'Status'].map(
                                            (header) => (
                                                <th key={header} className="py-3 px-4">
                                                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                                                </th>
                                            ),
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {[1, 2, 3, 4, 5].map((row) => (
                                        <tr key={row} className="animate-pulse">
                                            {Array.from({ length: 6 }).map((_, colIndex) => (
                                                <td key={colIndex} className="py-3 px-4">
                                                    <div className="h-4 w-full bg-gray-200 rounded" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Additional Skeleton Sections */}
                    <div className="mb-6 space-y-4">
                        {[1, 2].map((item) => (
                            <div key={item} className="h-6 w-full bg-gray-200 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

EditDriverInvoice.authenticationEnabled = true;

export default EditDriverInvoice;
