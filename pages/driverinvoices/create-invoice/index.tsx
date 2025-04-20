'use client';

import { useState, useEffect } from 'react';
import {
    CheckCircleIcon,
    ChevronRightIcon,
    UserIcon,
    ClipboardDocumentListIcon,
    CurrencyDollarIcon,
    DocumentCheckIcon,
    PlusIcon,
    MinusIcon,
    TrashIcon,
    ArrowPathIcon,
    PencilIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import Layout from 'components/layout/Layout';
import { getAllDrivers } from 'lib/rest/driver';
import React from 'react';
import { Driver } from '@prisma/client';
import { getAllAssignments } from 'lib/rest/assignment';
import { set } from 'date-fns';
import { DriverInvoiceLineItem, ExpandedDriverAssignment, NewDriverInvoice } from 'interfaces/models';
import Spinner from 'components/Spinner';
import Link from 'next/link';
import { notify } from 'components/Notification';
import { ta } from 'date-fns/locale';
import { createDriverInvoice, getNextDriverInvoiceNum } from 'lib/rest/driverinvoice';
import AssignmentChargeTypeChangeDialog from 'components/driverinvoices/AssignmentChargeChange';
import { useRouter } from 'next/navigation';
import { PageWithAuth } from 'interfaces/auth';

const CreateDriverInvoicePage: PageWithAuth = () => {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [invoice, setInvoice] = useState<NewDriverInvoice>({
        notes: '',
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        driverId: '',
        assignments: [],
        lineItems: [],
    });
    const [newLineItem, setNewLineItem] = useState<DriverInvoiceLineItem>({ description: '', amount: '' });
    const [totalAmount, setTotalAmount] = useState('0.00');

    const [loadingAllDrivers, setLoadingAllDrivers] = useState(true);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [allDrivers, setAllDrivers] = React.useState<Driver[]>([]);
    const [allAssignments, setAllAssignments] = React.useState<ExpandedDriverAssignment[]>([]);

    const [showAssignmentChargeChangeDialog, setShowAssignmentChargeChangeDialog] = useState(false);
    const [currentAssEditCharge, setCurrentAssEditCharge] = useState<ExpandedDriverAssignment | null>(null);
    const [creatingInvoice, setCreatingInvoice] = useState(false);

    useEffect(() => {
        // Load drivers when the component mounts
        loadDrivers();
    }, []);

    // Calculate total amount whenever assignments or line items change
    useEffect(() => {
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
            total += Number.parseFloat(item.amount);
        });

        setTotalAmount(total.toFixed(2));
    }, [invoice.assignments, invoice.lineItems]);

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
            console.log('Next invoice number:', num);
        });
    };

    const loadAssignments = async (driverId: string) => {
        setLoadingAssignments(true);

        const { assignments, metadata: metadataResponse } = await getAllAssignments({
            limit: 999,
            offset: 0,
            sort: { key: 'routeLeg.endedAt', order: 'asc' },
            showCompletedOnly: true,
            showNotInvoicedOnly: true,
            driverIds: [driverId],
        });
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
            console.log('Getting next invoice number');
            getNextInvoiceNum();
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

        setCurrentStep(3);
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
        // In a real app, you would send the invoice data to your backend

        try {
            const invoiceId = await createDriverInvoice(invoice);
            if (invoiceId) {
                notify({ title: 'Invoice created successfully!', type: 'success' });
            }
            console.log('Invoice created successfully:', invoiceId);
            router.push(`/driverinvoices/${invoiceId}`);
        } catch (error) {
            notify({ title: 'Error creating invoice', message: `${error}`, type: 'error' });
            console.error('Error creating invoice:', error);
        }

        setTimeout(() => {
            setCreatingInvoice(false);
        }, 2500);
    };

    const nextStep = () => {
        if (currentStep === 1 && (!invoice.driverId || invoice.driverId === '')) {
            notify({ title: 'Please select a driver', type: 'error' });
            return;
        }

        if (currentStep === 1) {
            loadAssignments(invoice.driverId);
        }

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
                                        <span className="ml-2 text-gray-700 font-medium">Create Driver Invoice</span>
                                    </li>
                                </ol>
                            </nav>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-10 text-center bg-white p-4 rounded-lg">
                            Create Driver Invoice
                        </h1>

                        {/* Stepper */}
                        <div className="mb-8 mx-6">
                            <div className="flex items-center">
                                {/* Step 1 */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                            currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                                        }`}
                                    >
                                        <UserIcon className="w-5 h-5" />
                                    </div>
                                    <span
                                        className={`mt-4 text-sm  px-1 ${
                                            currentStep == 1
                                                ? 'border border-blue-200 rounded-md bg-slate-100 font-semibold text-gray-800'
                                                : 'font-medium text-gray-400'
                                        }`}
                                    >
                                        1. Select Driver
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
                                        <ClipboardDocumentListIcon className="w-5 h-5" />
                                    </div>
                                    <span
                                        className={`mt-4 text-sm  px-1 ${
                                            currentStep == 2
                                                ? 'border border-blue-200 rounded-md bg-slate-100 font-semibold text-gray-800'
                                                : 'font-medium text-gray-400'
                                        }`}
                                    >
                                        2. Select Assignments
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
                                        <CurrencyDollarIcon className="w-5 h-5" />
                                    </div>
                                    <span
                                        className={`mt-4 text-sm  px-1 ${
                                            currentStep == 3
                                                ? 'border border-blue-200 rounded-md bg-slate-100 font-semibold text-gray-800'
                                                : 'font-medium text-gray-400'
                                        }`}
                                    >
                                        3. Additional Items
                                    </span>
                                </div>
                                <div className={`flex-1 h-1 ${currentStep >= 4 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>

                                {/* Step 4 */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                            currentStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                                        }`}
                                    >
                                        <DocumentCheckIcon className="w-5 h-5" />
                                    </div>
                                    <span
                                        className={`mt-4 text-sm  px-1 ${
                                            currentStep == 4
                                                ? 'border border-blue-200 rounded-md bg-slate-100 font-semibold text-gray-800'
                                                : 'font-medium text-gray-400'
                                        }`}
                                    >
                                        4. Review & Create
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="border border-gray-100 rounded-lg shadow-sm">
                            {/* Step 1: Select Driver */}
                            {currentStep === 1 && (
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Driver</h2>

                                    {loadingAllDrivers ? (
                                        <div className="flex items-center justify-center w-full p-4 font-bold">
                                            <Spinner /> Loading Drivers
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {allDrivers.map((driver) => (
                                                <div
                                                    key={driver.id}
                                                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                                        invoice.driverId === driver.id
                                                            ? 'border-blue-400 bg-blue-50 shadow-md'
                                                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                                    }`}
                                                    onClick={() => handleDriverSelect(driver.id)}
                                                >
                                                    <div className="flex items-center">
                                                        <div className="bg-gray-200 rounded-full p-2 mr-3">
                                                            <UserIcon className="w-5 h-5 text-gray-600" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-medium text-gray-800 capitalize">
                                                                {driver.name.toLowerCase()}
                                                            </h3>
                                                            <p className="text-sm text-gray-500">{driver.email}</p>
                                                            <p className="text-sm text-gray-500">{driver.phone}</p>
                                                        </div>
                                                        {invoice.driverId === driver.id && (
                                                            <CheckCircleIcon className="w-6 h-6 text-blue-600 ml-auto" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            onClick={nextStep}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                                        >
                                            Next <ChevronRightIcon className="w-4 h-4 ml-1" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Select Assignments */}
                            {currentStep === 2 && (
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <div className="flex flex-row justify-between items-center mb-6">
                                        <div className="flex flex-1 flex-col items-start">
                                            <h2 className="text-xl font-semibold text-gray-800 mb-1">
                                                Select Completed Assignments
                                            </h2>
                                            <p className="text-gray-400 text-sm font-normal ">
                                                Showing completed assignments only. Visit{' '}
                                                <Link href={`/drivers/${invoice.driverId}`} target="_blank">
                                                    <span className="text-blue-600 hover:underline text-sm cursor-pointer">
                                                        Driver Page
                                                    </span>
                                                </Link>{' '}
                                                to view/edit all assignments for{' '}
                                                {allAssignments.length > 0 && (
                                                    <span className="font-semibold text-gray-800 capitalize">
                                                        {
                                                            allAssignments.find(
                                                                (ass) => ass.driverId == invoice.driverId,
                                                            ).driver.name
                                                        }
                                                    </span>
                                                )}
                                                .
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
                                                            Order #
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

                                                        // Format the locations. For each location in the routeLeg, we check if loadStop exists;
                                                        // if not, we use the nested location object.
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

                                                        return (
                                                            <tr
                                                                key={assignment.id}
                                                                className={`hover:bg-gray-50 cursor-pointer ${
                                                                    invoice.assignments.find(
                                                                        (ass) => ass.id == assignment.id,
                                                                    )
                                                                        ? 'bg-blue-50'
                                                                        : 'bg-white'
                                                                }`}
                                                                onClick={() => handleAssignmentToggle(assignment.id)}
                                                            >
                                                                <td className="py-3 px-4">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={invoice.assignments.some(
                                                                            (a) => a.id === assignment.id,
                                                                        )}
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
                                                                            console.log('Edit amount');
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
                                        <button
                                            onClick={prevStep}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleConfirmAssignments}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Additional Items */}
                            {currentStep === 3 && (
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Additional Items</h2>

                                    <div className="mb-6">
                                        <h3 className="font-medium text-gray-700 mb-2">Invoice Details</h3>
                                        <div className="flex flex-col gap-4 w-full ">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Invoice #{' '}
                                                    <span className="text-gray-400 font-light">{`(Auto incrementing, you may enter invoice# to start your driver invoices at different counter.)`}</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={invoice.invoiceNum}
                                                    min={1}
                                                    step={1}
                                                    onChange={(e) =>
                                                        setInvoice((prev) => ({
                                                            ...prev,
                                                            invoiceNum: Number(e.target.value),
                                                        }))
                                                    }
                                                    className=" p-2 border w-fit border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-4 bg">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        From Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={invoice.fromDate.split('T')[0]}
                                                        onChange={(e) =>
                                                            setInvoice((prev) => ({
                                                                ...prev,
                                                                fromDate: e.target.value,
                                                            }))
                                                        }
                                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        To Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={invoice.toDate.split('T')[0]}
                                                        onChange={(e) =>
                                                            setInvoice((prev) => ({ ...prev, toDate: e.target.value }))
                                                        }
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
                                            Add any additional line items to this invoice to credit/debit the driver.
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
                                                                    Number.parseFloat(item.amount) >= 0
                                                                        ? 'text-gray-800'
                                                                        : 'text-red-600'
                                                                } `}
                                                            >
                                                                {Number.parseFloat(item.amount) >= 0
                                                                    ? formatCurrency(item.amount)
                                                                    : `(${formatCurrency(
                                                                          Math.abs(
                                                                              Number.parseFloat(item.amount),
                                                                          ).toString(),
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
                                            Review Invoice
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Review & Create */}
                            {currentStep === 4 && (
                                <div className="relative">
                                    {creatingInvoice && (
                                        <div className="absolute flex flex-col h-full bg-slate-100/60 items-center justify-center w-full p-4 font-semibold z-50">
                                            <>
                                                <Spinner /> Creating Invoice...
                                            </>
                                        </div>
                                    )}
                                    <div className="bg-gray-50 p-6 rounded-lg">
                                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Review Invoice</h2>

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
                                                    <p className="text-sm font-semibold text-gray-800 capitalize">
                                                        {allDrivers
                                                            .find((d) => d.id === invoice.driverId)
                                                            ?.name.toLocaleLowerCase()}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {allDrivers.find((d) => d.id === invoice.driverId)?.email}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {allDrivers.find((d) => d.id === invoice.driverId)?.phone}
                                                    </p>
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
                                                                    Order #
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
                                                                        className={`hover:bg-gray-50 cursor-pointer ${
                                                                            invoice.assignments.find(
                                                                                (assignment) =>
                                                                                    assignment.id == assignment.id,
                                                                            )
                                                                                ? 'bg-blue-50'
                                                                                : ''
                                                                        }`}
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
                                                                        {Number.parseFloat(item.amount) >= 0
                                                                            ? formatCurrency(item.amount)
                                                                            : `(${formatCurrency(
                                                                                  Math.abs(
                                                                                      Number.parseFloat(item.amount),
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
                                                onClick={handleCreateInvoice}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                Create Invoice
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

CreateDriverInvoicePage.authenticationEnabled = true;
export default CreateDriverInvoicePage;
