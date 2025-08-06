'use client';

import { createPortal } from 'react-dom';
import { TrashIcon, PencilIcon, ArrowDownTrayIcon, PhoneIcon, UserIcon } from '@heroicons/react/24/outline';
import Layout from '../../components/layout/Layout';
import { notify } from 'components/Notification';
import Spinner from 'components/Spinner';
import { ExpandedDriverInvoice } from 'interfaces/models';
import {
    addDriverInvoicePayment,
    deleteDriverInvoiceById,
    deleteDriverInvoicePayment,
    getDriverInvoiceById,
    updateDriverInvoiceStatus,
} from 'lib/rest/driverinvoice';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { PageWithAuth } from 'interfaces/auth';
import { de } from 'date-fns/locale';
import { downloadDriverInvoice } from 'components/driverinvoices/driverInvoicePdf';
import { formatPhoneNumber } from 'lib/helpers/format';

const InvoiceDetailsPage: PageWithAuth = () => {
    const router = useRouter();
    const [invoice, setInvoice] = useState<ExpandedDriverInvoice | null>(null);
    const [showDeleteInvoiceDialog, setShowDeleteInvoiceDialog] = useState(false);
    const [showDeletePaymentDialog, setShowDeletePaymentDialog] = useState(false);
    const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
    const [showConfirmApprovalDialog, setShowConfirmApprovalDialog] = useState(false);
    const [paymentIdToDelete, setPaymentIdToDelete] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [paymentDate, setPaymentDate] = useState(dayjs().format('YYYY-MM-DD'));

    const [assignmentsTotal, setAssignmentsTotal] = useState(0);
    const [lineItemsTotal, setLineItemsTotal] = useState(0);
    const [deletingInvoice, setDeletingInvoice] = useState(false);
    const invoiceId = router.query.id as string;
    const [showPaymentActionsDropdown, setShowPaymentActionsDropdown] = useState('');

    const [addingPayment, setAddingPayment] = useState(false);
    const [deletingPayment, setDeletingPayment] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        if (!invoice) return;

        // Calculate totals
        let assignmentsTotal = 0;

        // Add up assignment amounts
        invoice.assignments.forEach((assignment) => {
            let amount = 0;
            switch (assignment.chargeType) {
                case 'PER_MILE':
                    const baseMiles = Number(assignment.billedDistanceMiles);
                    const emptyMiles = Number(assignment.emptyMiles || 0);
                    const totalMiles = baseMiles + emptyMiles;
                    amount = totalMiles * Number(assignment.chargeValue);
                    break;
                case 'PER_HOUR':
                    amount = Number(assignment.billedDurationHours) * Number(assignment.chargeValue);
                    break;
                case 'PERCENTAGE_OF_LOAD':
                    amount = (Number(assignment.billedLoadRate) * Number(assignment.chargeValue)) / 100;
                    break;
                case 'FIXED_PAY':
                    amount = Number(assignment.chargeValue);
                    break;
            }
            assignmentsTotal += amount;
        });

        setAssignmentsTotal(Number(assignmentsTotal.toFixed(2)));

        let lineItemsTotal = 0;
        // Add up line items
        invoice.lineItems.forEach((item) => {
            lineItemsTotal += Number(item.amount);
        });

        setLineItemsTotal(Number(lineItemsTotal.toFixed(2)));
    }, [invoice]);

    // Get invoice data on mount
    const getInvoiceData = async (retryCount = 0) => {
        try {
            const invoiceData = await getDriverInvoiceById(invoiceId);
            setInvoice(invoiceData);
        } catch (error) {
            console.error('Error fetching invoice data:', error);

            // Retry up to 3 times with increasing delays for newly created invoices
            if (retryCount < 3) {
                console.log(`Retrying invoice fetch... attempt ${retryCount + 1}`);
                setTimeout(() => {
                    getInvoiceData(retryCount + 1);
                }, (retryCount + 1) * 1000); // 1s, 2s, 3s delays
                return;
            }

            // If all retries failed, show error and redirect
            notify({
                type: 'error',
                title: 'Error fetching invoice data',
                message: error.message,
            });
            router.push('/driverinvoices');
        }
    };

    useEffect(() => {
        if (invoiceId) {
            getInvoiceData();
        }
    }, [invoiceId]);

    const handleDeleteInvoice = async () => {
        setDeletingInvoice(true);
        try {
            // In a real app, this would call an API to delete the invoice
            const message = await deleteDriverInvoiceById(invoiceId);
            notify({
                type: 'success',
                title: 'Invoice deleted successfully',
            });
            router.push('/driverinvoices');
        } catch (error) {
            console.error('Error deleting invoice:', error);
            notify({
                type: 'error',
                title: 'Error deleting invoice',
                message: error.message,
            });
        }
        setDeletingInvoice(false);
        setShowDeleteInvoiceDialog(false);
        // Redirect to invoices list would happen here
    };

    const handleDeletePaymentClicked = async () => {
        setDeletingPayment(true);

        try {
            const response = await deleteDriverInvoicePayment(invoice.id, paymentIdToDelete);

            // cacluate new invoice status
            let totalPaid = 0;
            invoice.payments.forEach((payment) => {
                if (paymentIdToDelete != payment.id) {
                    totalPaid += payment.amount;
                }
            });

            setInvoice((prevInvoice) => ({
                ...prevInvoice,
                status:
                    totalPaid >= Number(prevInvoice.totalAmount)
                        ? 'PAID'
                        : totalPaid == 0
                        ? 'APPROVED'
                        : 'PARTIALLY_PAID',
                payments: prevInvoice.payments.filter((payment) => payment.id !== paymentIdToDelete),
            }));
            notify({
                type: 'success',
                title: 'Payment deleted successfully',
            });
        } catch (error) {
            console.error('Error deleting payment:', error);
            notify({
                type: 'error',
                title: 'Error deleting payment',
                message: error.message,
            });
        }

        setPaymentIdToDelete('');
        setShowDeletePaymentDialog(false);
        setDeletingPayment(false);
    };

    const handleDownloadInvoice = () => {
        setIsDownloading(true);
        // Simulate download
        setTimeout(() => {
            setIsDownloading(false);
        }, 1000);
        downloadDriverInvoice(
            invoice,
            `${invoice.driver.name}-${invoice.invoiceNum}-${invoice.createdAt.toString().split('T')[0]}.pdf`,
        );
    };

    const formatCurrency = (value: string | number): string => {
        const numValue = typeof value === 'string' ? Number.parseFloat(value) : value;

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numValue);
    };

    const handleAddPaymentClicked = async () => {
        setAddingPayment(true);
        // update invoice state with new payment
        try {
            const paymentID = await addDriverInvoicePayment(invoice.id, {
                amount: paymentAmount,
                paymentDate: paymentDate,
                notes: paymentNote,
            });

            if (paymentID) {
                // caculate new invoice status
                let totalPaid = Number(paymentAmount);
                invoice.payments.forEach((payment) => {
                    totalPaid += payment.amount;
                });

                setInvoice((prevInvoice) => ({
                    ...prevInvoice,
                    status:
                        totalPaid >= Number(prevInvoice.totalAmount)
                            ? 'PAID'
                            : totalPaid == 0
                            ? 'APPROVED'
                            : 'PARTIALLY_PAID',
                    payments: [
                        ...prevInvoice.payments,
                        {
                            id: paymentID,
                            createdAt: new Date(),
                            paymentDate: new Date(paymentDate),
                            amount: parseFloat(paymentAmount),
                            notes: paymentNote,
                        },
                    ],
                }));

                setPaymentAmount('');
                setPaymentNote('');
                setPaymentDate(new Date().toISOString().split('T')[0]);
                setShowAddPaymentDialog(false);
            }
        } catch (error) {
            console.error('Error adding payment:', error);
            notify({
                type: 'error',
                title: 'Error adding payment',
                message: error.message,
            });
        }

        setAddingPayment(false);
    };

    const handleStatusChange = async () => {
        // If we're about to approve, show confirmation dialog
        if (invoice.status === 'PENDING') {
            setShowConfirmApprovalDialog(true);
            return;
        }

        // For marking as pending, no confirmation needed
        await performStatusUpdate();
    };

    const performStatusUpdate = async () => {
        setUpdatingStatus(true);
        try {
            const response = await updateDriverInvoiceStatus(
                invoice.id,
                invoice.status === 'APPROVED' ? 'PENDING' : 'APPROVED',
            );

            setInvoice((prevInvoice) => ({
                ...prevInvoice,
                status: prevInvoice.status === 'APPROVED' ? 'PENDING' : 'APPROVED',
            }));

            notify({
                type: 'success',
                title: 'Status changed successfully',
            });
        } catch (error) {
            console.error('Error changing status:', error);
            notify({
                type: 'error',
                title: 'Error changing status',
                message: error.message,
            });
        }
        setUpdatingStatus(false);
        setShowConfirmApprovalDialog(false);
    };

    const invoiceStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-base font-semibold bg-yellow-300 text-gray-600">
                        Pending
                    </span>
                );
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-base font-semibold bg-blue-100 text-blue-800">
                        Approved
                    </span>
                );
            case 'PAID':
                return (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-base font-semibold bg-green-600 text-white">
                        Paid
                    </span>
                );
            case 'PARTIALLY_PAID':
                return (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-base font-semibold bg-green-200 text-green-800">
                        Partially Paid
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-base font-semibold bg-gray-100 text-gray-800">
                        Unknown
                    </span>
                );
        }
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
                <div className="min-h-screen bg-gray-50/30">
                    {invoice ? (
                        <div className="max-w-7xl mx-auto p-3 sm:p-6 bg-transparent">
                            {/* Apple-style Breadcrumb */}
                            <div className="mb-4 sm:mb-8 bg-white/80 backdrop-blur-sm rounded-xl ">
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
                                                Invoice #{invoice?.invoiceNum}
                                            </span>
                                        </li>
                                    </ol>
                                </nav>
                            </div>
                            {showDeleteInvoiceDialog && (
                                <div className="fixed inset-0 z-50 overflow-y-auto">
                                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                                        </div>
                                        <span
                                            className="hidden sm:inline-block sm:align-middle sm:h-screen"
                                            aria-hidden="true"
                                        >
                                            &#8203;
                                        </span>
                                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                            <div>
                                                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                        Delete Invoice
                                                    </h3>
                                                    <div className="mt-2">
                                                        <p className="text-sm text-gray-500">
                                                            Are you sure you want to delete this invoice? This action
                                                            cannot be undone.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            {deletingInvoice ? (
                                                <div className="flex items-center justify-center w-full p-3  text-red-600">
                                                    <Spinner /> Deleting Invoice
                                                </div>
                                            ) : (
                                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                    <button
                                                        type="button"
                                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                                        onClick={handleDeleteInvoice}
                                                    >
                                                        Delete
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                                                        onClick={() => setShowDeleteInvoiceDialog(false)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {showDeletePaymentDialog && (
                                <div className="fixed inset-0 z-50 overflow-y-auto">
                                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                                        </div>
                                        <span
                                            className="hidden sm:inline-block sm:align-middle sm:h-screen"
                                            aria-hidden="true"
                                        >
                                            &#8203;
                                        </span>
                                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                            <div>
                                                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                        Delete Payment
                                                    </h3>
                                                    <div className="mt-2">
                                                        <p className="text-sm text-gray-500">
                                                            Are you sure you want to delete this payment? This action
                                                            cannot be undone.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            {deletingInvoice ? (
                                                <div className="flex items-center justify-center w-full p-3  text-red-600">
                                                    <Spinner /> Deleting Payment
                                                </div>
                                            ) : (
                                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                    <button
                                                        type="button"
                                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                                        onClick={handleDeletePaymentClicked}
                                                    >
                                                        Delete
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                                                        onClick={() => setShowDeleteInvoiceDialog(false)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Delete Payment Dialog */}
                            {showDeletePaymentDialog && (
                                <div className="fixed inset-0 z-50 overflow-y-auto">
                                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                                        </div>
                                        <span
                                            className="hidden sm:inline-block sm:align-middle sm:h-screen"
                                            aria-hidden="true"
                                        >
                                            &#8203;
                                        </span>
                                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                            <div>
                                                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                        Delete Payment
                                                    </h3>
                                                    <div className="mt-2">
                                                        <p className="text-sm text-gray-500">
                                                            Are you sure you want to delete this payment? This action
                                                            cannot be undone.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            {deletingPayment ? (
                                                <div className="flex items-center justify-center w-full p-3  text-red-600">
                                                    <Spinner /> Deleting Payment
                                                </div>
                                            ) : (
                                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                    <button
                                                        type="button"
                                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                                        onClick={handleDeletePaymentClicked}
                                                    >
                                                        Delete
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                                                        onClick={() => setShowDeletePaymentDialog(false)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Add Payment Dialog */}
                            {showAddPaymentDialog && (
                                <div className="fixed inset-0 z-50 overflow-y-auto">
                                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                                        </div>
                                        <span
                                            className="hidden sm:inline-block sm:align-middle sm:h-screen"
                                            aria-hidden="true"
                                        >
                                            &#8203;
                                        </span>
                                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                            <div>
                                                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                        Add Payment
                                                    </h3>
                                                    <div className="mt-2">
                                                        <p className="text-sm text-gray-500">
                                                            Record a new payment for this invoice.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 grid gap-4">
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <label
                                                        htmlFor="amount"
                                                        className="text-sm font-medium text-gray-700 text-right"
                                                    >
                                                        Amount
                                                    </label>
                                                    <div className="col-span-3 relative h-fit">
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                                                            $
                                                        </span>
                                                        <input
                                                            id="amount"
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="0.00"
                                                            className="pl-7 block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                                                            value={paymentAmount}
                                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                                            required
                                                        />

                                                        <button
                                                            type="submit"
                                                            onClick={() => {
                                                                setPaymentAmount(invoice.totalAmount.toString());
                                                            }}
                                                            className="absolute inset-y-0 right-0 items-center m-1 w-fit px-2  text-white inline-flex justify-center rounded-md border border-transparent shadow-sm   bg-gray-600 text-xs   "
                                                        >
                                                            Full Due
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <label
                                                        htmlFor="amount"
                                                        className="text-sm font-medium text-gray-700 text-right"
                                                    >
                                                        Note
                                                    </label>
                                                    <div className="col-span-3 relative">
                                                        <input
                                                            placeholder="Check#, Cash, etc."
                                                            className=" block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                                                            onChange={(e) => setPaymentNote(e.target.value)}
                                                            value={paymentNote}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <label
                                                        htmlFor="date"
                                                        className="text-sm font-medium text-gray-700 text-right"
                                                    >
                                                        Date
                                                    </label>
                                                    <input
                                                        id="date"
                                                        type="date"
                                                        className="col-span-3 block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                                                        value={dayjs(paymentDate).format('YYYY-MM-DD')}
                                                        onChange={(e) => {
                                                            const localDate = dayjs(
                                                                e.target.value,
                                                                'YYYY-MM-DD',
                                                            ).toDate();
                                                            setPaymentDate(localDate.toString());
                                                        }}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {addingPayment ? (
                                                <div className="flex items-center justify-center w-full p-3  text-green-600">
                                                    <Spinner /> Adding Payment
                                                </div>
                                            ) : (
                                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                                    <button
                                                        type="submit"
                                                        onClick={handleAddPaymentClicked}
                                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                                                    >
                                                        Add Payment
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                                        onClick={() => {
                                                            setPaymentAmount('');
                                                            setPaymentNote('');
                                                            setPaymentDate(new Date().toISOString());
                                                            setShowAddPaymentDialog(false);
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Confirm Approval Dialog */}
                            {showConfirmApprovalDialog && (
                                <div className="fixed inset-0 z-50 overflow-y-auto">
                                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                                        </div>
                                        <span
                                            className="hidden sm:inline-block sm:align-middle sm:h-screen"
                                            aria-hidden="true"
                                        >
                                            &#8203;
                                        </span>
                                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                            <div>
                                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                                    <svg
                                                        className="h-6 w-6 text-green-600"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M9 12l2 2 4-4"
                                                        />
                                                    </svg>
                                                </div>
                                                <div className="mt-3 text-center sm:mt-5">
                                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                        Approve Invoice
                                                    </h3>
                                                    <div className="mt-2">
                                                        <p className="text-sm text-gray-500">
                                                            Are you sure you want to approve this invoice? This will
                                                            mark it as approved and ready for payment processing.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            {updatingStatus ? (
                                                <div className="flex items-center justify-center w-full p-3 text-green-600">
                                                    <Spinner /> Approving Invoice
                                                </div>
                                            ) : (
                                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                                    <button
                                                        type="button"
                                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:col-start-2 sm:text-sm"
                                                        onClick={performStatusUpdate}
                                                    >
                                                        Approve Invoice
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                                        onClick={() => setShowConfirmApprovalDialog(false)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {invoice && (
                                <div className="space-y-4 sm:space-y-6">
                                    {/* Action Toolbar */}
                                    <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
                                                Quick Actions
                                            </h3>
                                            <div className="text-right">
                                                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                                                    {formatCurrency(Number(invoice.totalAmount))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons - Reordered: Delete, Edit, Download PDF, Approve, Add Payment */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end gap-2 sm:gap-3">
                                            {/* Delete - First */}
                                            <button
                                                type="button"
                                                onClick={() => setShowDeleteInvoiceDialog(true)}
                                                className="inline-flex items-center justify-center px-3 py-2 sm:px-4 bg-white border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4 mr-2" />
                                                <span className="truncate">Delete</span>
                                            </button>

                                            {/* Edit Invoice - Second */}
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/driverinvoices/edit/${invoice.id}`)}
                                                disabled={!invoice.driver?.active}
                                                className={`inline-flex items-center justify-center px-3 py-2 sm:px-4 border text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                                                    !invoice.driver?.active
                                                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500'
                                                }`}
                                                title={
                                                    !invoice.driver?.active
                                                        ? 'Cannot edit invoice for inactive driver'
                                                        : 'Edit Invoice'
                                                }
                                            >
                                                <PencilIcon className="w-4 h-4 mr-2" />
                                                <span className="truncate">Edit Invoice</span>
                                            </button>

                                            {/* Download PDF - Third */}
                                            <button
                                                type="button"
                                                onClick={handleDownloadInvoice}
                                                disabled={isDownloading}
                                                className="inline-flex items-center justify-center px-3 py-2 sm:px-4 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isDownloading ? (
                                                    <svg
                                                        className="w-4 h-4 mr-2 animate-spin"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <circle
                                                            className="opacity-25"
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                        ></circle>
                                                        <path
                                                            className="opacity-75"
                                                            fill="currentColor"
                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                        ></path>
                                                    </svg>
                                                ) : (
                                                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                                                )}
                                                <span className="truncate">
                                                    {isDownloading ? 'Downloading...' : 'Download PDF'}
                                                </span>
                                            </button>

                                            {/* Approve/Pending Toggle - Fourth */}
                                            {(invoice.status === 'APPROVED' || invoice.status === 'PENDING') && (
                                                <button
                                                    type="button"
                                                    disabled={updatingStatus}
                                                    onClick={handleStatusChange}
                                                    className={`inline-flex items-center justify-center px-3 py-2 sm:px-4 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:col-span-2 lg:col-span-1 ${
                                                        invoice.status === 'PENDING'
                                                            ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                                                            : 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500'
                                                    }`}
                                                >
                                                    {updatingStatus ? (
                                                        <svg
                                                            className="w-4 h-4 mr-2 animate-spin"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <circle
                                                                className="opacity-25"
                                                                cx="12"
                                                                cy="12"
                                                                r="10"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                            ></circle>
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                            ></path>
                                                        </svg>
                                                    ) : (
                                                        <svg
                                                            className="w-4 h-4 mr-2"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M9 12l2 2 4-4"
                                                            />
                                                        </svg>
                                                    )}
                                                    <span className="truncate">
                                                        {updatingStatus
                                                            ? 'Updating...'
                                                            : invoice.status === 'APPROVED'
                                                            ? 'Mark as Pending'
                                                            : 'Approve Invoice'}
                                                    </span>
                                                </button>
                                            )}

                                            {/* Add Payment - Fifth (Primary Action) */}
                                            <button
                                                type="button"
                                                onClick={() => setShowAddPaymentDialog(true)}
                                                className="inline-flex items-center justify-center px-3 py-2 sm:px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                                            >
                                                <svg
                                                    className="w-4 h-4 mr-2"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                                    />
                                                </svg>
                                                <span className="truncate">Add Payment</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Invoice Header Card */}
                                    <div className="rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-xl border border-gray-200/30 shadow-sm overflow-visible">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 sm:p-6">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <div className="bg-blue-100 rounded-full p-2">
                                                        <UserIcon className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-lg sm:text-xl font-semibold text-gray-900 capitalize">
                                                            {invoice.driver.name.toLowerCase()}
                                                        </p>
                                                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                                                            <PhoneIcon className="w-4 h-4 text-blue-600" />
                                                            <span>{formatPhoneNumber(invoice.driver.phone)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 lg:mt-0 lg:ml-4 space-y-3">
                                                <div className="flex items-center justify-between lg:justify-end space-x-3">
                                                    <h2 className="text-lg font-semibold text-gray-800">
                                                        Invoice #{invoice.invoiceNum}
                                                    </h2>
                                                    {invoiceStatusBadge(invoice.status)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Invoice Details Card */}
                                    <div className="overflow-hidden rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-xl border border-gray-200/30 shadow-sm">
                                        {/* Key Invoice Period - Highlighted */}
                                        <div className="px-4 py-4 sm:px-6 bg-blue-100/50 backdrop-blur-2xl border-b border-blue-100/40">
                                            <div className="flex items-start justify-between">
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
                                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-900">
                                                            Invoice Period
                                                        </h3>
                                                        <p className="text-xs text-gray-600">Billing duration</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-gray-900">
                                                        {(() => {
                                                            // Parse date correctly to avoid timezone issues
                                                            const parseDate = (
                                                                date: string | Date | null | undefined,
                                                            ) => {
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

                                                            const fromDateStr = fromDate?.toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                            });
                                                            const toDateStr = toDate?.toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                            });

                                                            return `${fromDateStr} - ${toDateStr}`;
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Invoice Details */}
                                        <div className="border-b border-gray-200/50">
                                            <div className="p-4 sm:p-6">
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                    {/* Bill To Section */}
                                                    <div className="lg:col-span-2">
                                                        <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/30 shadow-sm">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                                                                    <svg
                                                                        className="w-3 h-3 text-gray-600"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth={2}
                                                                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                                                        />
                                                                    </svg>
                                                                </div>
                                                                <h4 className="text-sm font-semibold text-gray-900">
                                                                    Bill To
                                                                </h4>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="font-semibold text-gray-900 text-base">
                                                                    {invoice.carrier?.name}
                                                                </div>
                                                                <div className="text-gray-700 text-sm space-y-1">
                                                                    <div>{invoice.carrier?.street}</div>
                                                                    <div>
                                                                        {invoice.carrier?.city},{' '}
                                                                        {invoice.carrier?.state} {invoice.carrier?.zip}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-3 pt-2 text-sm">
                                                                    <div className="flex items-center gap-1.5 text-gray-600">
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
                                                                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                                                            />
                                                                        </svg>
                                                                        <span>{invoice.carrier?.phone}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 text-gray-600">
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
                                                                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                                            />
                                                                        </svg>
                                                                        <span>{invoice.carrier?.email}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Timestamps Section */}
                                                    <div className="space-y-3">
                                                        <div className="bg-white/50 backdrop-blur-xl rounded-xl p-3 border border-gray-200/30 shadow-sm">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center">
                                                                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                                                                </div>
                                                                <span className="text-xs font-medium text-gray-600">
                                                                    Created
                                                                </span>
                                                            </div>
                                                            <div className="text-sm font-semibold text-gray-900">
                                                                {new Date(invoice.createdAt).toLocaleDateString(
                                                                    'en-US',
                                                                    {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        year: '2-digit',
                                                                    },
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {new Date(invoice.createdAt).toLocaleTimeString(
                                                                    'en-US',
                                                                    {
                                                                        hour: 'numeric',
                                                                        minute: 'numeric',
                                                                        hour12: true,
                                                                    },
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="bg-white/50 backdrop-blur-xl rounded-xl p-3 border border-gray-200/30 shadow-sm">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center">
                                                                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                                                                </div>
                                                                <span className="text-xs font-medium text-gray-600">
                                                                    Updated
                                                                </span>
                                                            </div>
                                                            <div className="text-sm font-semibold text-gray-900">
                                                                {new Date(invoice.updatedAt).toLocaleDateString(
                                                                    'en-US',
                                                                    {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        year: '2-digit',
                                                                    },
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {new Date(invoice.updatedAt).toLocaleTimeString(
                                                                    'en-US',
                                                                    {
                                                                        hour: 'numeric',
                                                                        minute: 'numeric',
                                                                        hour12: true,
                                                                    },
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {invoice.notes && (
                                            <div className="px-4 py-5 sm:px-6 border-t border-gray-200/50">
                                                <h6 className="text-sm font-medium text-gray-500 mb-2">
                                                    Invoice Notes
                                                </h6>
                                                <p className="text-sm text-gray-700 leading-relaxed">
                                                    {invoice.notes || 'No notes added.'}
                                                </p>
                                            </div>
                                        )}

                                        {/* Assignments Section */}
                                        <div className="px-4 py-4 sm:px-6 bg-gray-100/60 backdrop-blur-2xl border-b border-gray-200/40">
                                            <div className="flex items-center justify-between">
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
                                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                            />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-900">
                                                            Assignments ({invoice.assignments.length})
                                                        </h3>
                                                        <p className="text-xs text-gray-600">
                                                            Route assignments & earnings
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-600 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-200/40">
                                                    <span className="font-medium">Total: </span>
                                                    <span className="font-bold text-gray-900">
                                                        {formatCurrency(
                                                            invoice.assignments.reduce((total, assignment) => {
                                                                let amount = 0;
                                                                switch (assignment.chargeType) {
                                                                    case 'PER_MILE':
                                                                        const baseMiles = Number(
                                                                            assignment.billedDistanceMiles ||
                                                                                assignment.routeLeg.distanceMiles,
                                                                        );
                                                                        const emptyMiles = Number(
                                                                            assignment.emptyMiles || 0,
                                                                        );
                                                                        const totalMiles = baseMiles + emptyMiles;
                                                                        amount =
                                                                            totalMiles * Number(assignment.chargeValue);
                                                                        break;
                                                                    case 'PER_HOUR':
                                                                        amount =
                                                                            Number(
                                                                                assignment.billedDurationHours ||
                                                                                    assignment.routeLeg.durationHours,
                                                                            ) * Number(assignment.chargeValue);
                                                                        break;
                                                                    case 'PERCENTAGE_OF_LOAD':
                                                                        amount =
                                                                            (Number(
                                                                                assignment.billedLoadRate ||
                                                                                    assignment.load.rate,
                                                                            ) *
                                                                                Number(assignment.chargeValue)) /
                                                                            100;
                                                                        break;
                                                                    case 'FIXED_PAY':
                                                                        amount = Number(assignment.chargeValue);
                                                                        break;
                                                                }
                                                                return total + amount;
                                                            }, 0),
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mobile Assignment Cards */}
                                        <div className="block lg:hidden px-4 pt-4 pb-4 space-y-3">
                                            {invoice.assignments.map((assignment, index) => {
                                                let calculatedAmount = 0;
                                                switch (assignment.chargeType) {
                                                    case 'PER_MILE':
                                                        const baseMiles = Number(
                                                            assignment.billedDistanceMiles ||
                                                                assignment.routeLeg.distanceMiles,
                                                        );
                                                        const emptyMiles = Number(assignment.emptyMiles || 0);
                                                        const totalMiles = baseMiles + emptyMiles;
                                                        calculatedAmount = totalMiles * Number(assignment.chargeValue);
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
                                                            (Number(assignment.billedLoadRate || assignment.load.rate) *
                                                                Number(assignment.chargeValue)) /
                                                            100;
                                                        break;
                                                    case 'FIXED_PAY':
                                                        calculatedAmount = Number(assignment.chargeValue);
                                                        break;
                                                }

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
                                                const color = assignmentColors[index % assignmentColors.length];

                                                return (
                                                    <div
                                                        key={assignment.id}
                                                        className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/30 shadow-sm hover:shadow-md transition-all duration-200"
                                                    >
                                                        {/* Assignment Header - Compact */}
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className="w-7 h-7 rounded-xl flex items-center justify-center shadow-sm"
                                                                    style={{ backgroundColor: color }}
                                                                >
                                                                    <span className="text-white text-xs font-bold">
                                                                        {index + 1}
                                                                    </span>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                                                                        Order #{assignment.load.refNum}
                                                                    </h4>
                                                                    <p className="text-xs text-gray-500 leading-tight">
                                                                        Assignment #{index + 1}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xs text-gray-600 mb-0.5">
                                                                    Total
                                                                </div>
                                                                <div className="text-sm font-bold text-green-600">
                                                                    {formatCurrency(calculatedAmount)}
                                                                </div>
                                                            </div>
                                                        </div>{' '}
                                                        {/* Compact Info Grid */}
                                                        <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                                                            <div>
                                                                <div className="text-xs text-gray-500 mb-0.5">
                                                                    Distance
                                                                </div>
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {Number(
                                                                        assignment.billedDistanceMiles ||
                                                                            assignment.routeLeg.distanceMiles,
                                                                    ).toFixed(1)}
                                                                    mi
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-gray-500 mb-0.5">
                                                                    Empty
                                                                </div>
                                                                <div className="text-sm font-semibold text-gray-700">
                                                                    {Number(assignment.emptyMiles || 0).toFixed(1)}mi
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-gray-500 mb-0.5">Rate</div>
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {assignment.chargeType === 'PER_MILE' &&
                                                                        `$${assignment.chargeValue}/mi`}
                                                                    {assignment.chargeType === 'PER_HOUR' &&
                                                                        `$${assignment.chargeValue}/hr`}
                                                                    {assignment.chargeType === 'PERCENTAGE_OF_LOAD' &&
                                                                        `${assignment.chargeValue}%`}
                                                                    {assignment.chargeType === 'FIXED_PAY' &&
                                                                        formatCurrency(Number(assignment.chargeValue))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Route - Compact Horizontal Layout */}
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="font-medium text-gray-700">Route</span>
                                                                <span
                                                                    className="text-gray-500 cursor-help"
                                                                    title={
                                                                        assignment.routeLeg.endedAt
                                                                            ? `Completed: ${new Date(
                                                                                  assignment.routeLeg.endedAt,
                                                                              ).toLocaleString()}`
                                                                            : assignment.routeLeg.startedAt
                                                                            ? `Started: ${new Date(
                                                                                  assignment.routeLeg.startedAt,
                                                                              ).toLocaleString()}`
                                                                            : 'Start time not available'
                                                                    }
                                                                >
                                                                    {assignment.routeLeg.endedAt
                                                                        ? 'Completed'
                                                                        : 'In Progress'}
                                                                </span>
                                                            </div>{' '}
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <div className="flex-1 bg-green-50/40 p-2 rounded-lg">
                                                                    <div className="flex items-center gap-1 mb-1">
                                                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                                        <span className="font-medium text-green-800">
                                                                            Pickup
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-green-700 font-medium text-xs leading-tight truncate">
                                                                        {assignment.routeLeg.locations[0].loadStop
                                                                            ?.name ||
                                                                            assignment.routeLeg.locations[0].location
                                                                                ?.name}
                                                                    </p>
                                                                    <p className="text-green-600 text-xs leading-tight">
                                                                        {assignment.routeLeg.locations[0].loadStop
                                                                            ?.city ||
                                                                            assignment.routeLeg.locations[0].location
                                                                                ?.city}
                                                                        ,{' '}
                                                                        {assignment.routeLeg.locations[0].loadStop
                                                                            ?.state ||
                                                                            assignment.routeLeg.locations[0].location
                                                                                ?.state}
                                                                    </p>
                                                                </div>
                                                                <div className="w-4 h-0.5 bg-gray-300 rounded-full"></div>
                                                                <div className="flex-1 bg-red-50/40 p-2 rounded-lg">
                                                                    <div className="flex items-center gap-1 mb-1">
                                                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                                        <span className="font-medium text-red-800">
                                                                            Delivery
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-red-700 font-medium text-xs leading-tight truncate">
                                                                        {assignment.routeLeg.locations[
                                                                            assignment.routeLeg.locations.length - 1
                                                                        ].loadStop?.name ||
                                                                            assignment.routeLeg.locations[
                                                                                assignment.routeLeg.locations.length - 1
                                                                            ].location?.name}
                                                                    </p>
                                                                    <p className="text-red-600 text-xs leading-tight">
                                                                        {assignment.routeLeg.locations[
                                                                            assignment.routeLeg.locations.length - 1
                                                                        ].loadStop?.city ||
                                                                            assignment.routeLeg.locations[
                                                                                assignment.routeLeg.locations.length - 1
                                                                            ].location?.city}
                                                                        ,{' '}
                                                                        {assignment.routeLeg.locations[
                                                                            assignment.routeLeg.locations.length - 1
                                                                        ].loadStop?.state ||
                                                                            assignment.routeLeg.locations[
                                                                                assignment.routeLeg.locations.length - 1
                                                                            ].location?.state}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Desktop Grid - Improved Compact Design */}
                                        <div className="hidden lg:block px-4 pb-4 pt-4">
                                            <div className="grid gap-3">
                                                {invoice.assignments.map((assignment, index) => {
                                                    let calculatedAmount = 0;
                                                    switch (assignment.chargeType) {
                                                        case 'PER_MILE':
                                                            const baseMiles = Number(
                                                                assignment.billedDistanceMiles ||
                                                                    assignment.routeLeg.distanceMiles,
                                                            );
                                                            const emptyMiles = Number(assignment.emptyMiles || 0);
                                                            const totalMiles = baseMiles + emptyMiles;
                                                            calculatedAmount =
                                                                totalMiles * Number(assignment.chargeValue);
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
                                                                    assignment.billedLoadRate || assignment.load.rate,
                                                                ) *
                                                                    Number(assignment.chargeValue)) /
                                                                100;
                                                            break;
                                                        case 'FIXED_PAY':
                                                            calculatedAmount = Number(assignment.chargeValue);
                                                            break;
                                                    }

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
                                                    const color = assignmentColors[index % assignmentColors.length];

                                                    return (
                                                        <div
                                                            key={assignment.id}
                                                            className="bg-white/95 backdrop-blur-xl  rounded-2xl p-4 border border-gray-200/30 shadow-sm hover:shadow-md transition-all duration-200"
                                                        >
                                                            <div className="grid grid-cols-12 gap-4 items-center">
                                                                {/* Assignment Number & Order */}
                                                                <div className="col-span-2 flex items-center gap-3">
                                                                    <div>
                                                                        <div className="font-semibold text-gray-900 text-sm">
                                                                            #{assignment.load.refNum}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            Assignment {index + 1}
                                                                        </div>
                                                                    </div>
                                                                </div>{' '}
                                                                {/* Route Information */}
                                                                <div className="col-span-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1 bg-green-50/40 p-2 rounded-lg">
                                                                            <div className="flex items-center gap-1 mb-1">
                                                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                                                <span className="text-xs font-medium text-green-800">
                                                                                    Pickup
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-green-700 font-medium text-xs leading-tight truncate">
                                                                                {assignment.routeLeg.locations[0]
                                                                                    .loadStop?.name ||
                                                                                    assignment.routeLeg.locations[0]
                                                                                        .location?.name}
                                                                            </p>
                                                                            <p className="text-green-600 text-xs">
                                                                                {assignment.routeLeg.locations[0]
                                                                                    .loadStop?.city ||
                                                                                    assignment.routeLeg.locations[0]
                                                                                        .location?.city}
                                                                                ,{' '}
                                                                                {assignment.routeLeg.locations[0]
                                                                                    .loadStop?.state ||
                                                                                    assignment.routeLeg.locations[0]
                                                                                        .location?.state}
                                                                            </p>
                                                                        </div>
                                                                        <div className="w-3 h-0.5 bg-gray-300 rounded-full"></div>
                                                                        <div className="flex-1 bg-red-50/40 p-2 rounded-lg">
                                                                            <div className="flex items-center gap-1 mb-1">
                                                                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                                                <span className="text-xs font-medium text-red-800">
                                                                                    Delivery
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-red-700 font-medium text-xs leading-tight truncate">
                                                                                {assignment.routeLeg.locations[
                                                                                    assignment.routeLeg.locations
                                                                                        .length - 1
                                                                                ].loadStop?.name ||
                                                                                    assignment.routeLeg.locations[
                                                                                        assignment.routeLeg.locations
                                                                                            .length - 1
                                                                                    ].location?.name}
                                                                            </p>
                                                                            <p className="text-red-600 text-xs">
                                                                                {assignment.routeLeg.locations[
                                                                                    assignment.routeLeg.locations
                                                                                        .length - 1
                                                                                ].loadStop?.city ||
                                                                                    assignment.routeLeg.locations[
                                                                                        assignment.routeLeg.locations
                                                                                            .length - 1
                                                                                    ].location?.city}
                                                                                ,{' '}
                                                                                {assignment.routeLeg.locations[
                                                                                    assignment.routeLeg.locations
                                                                                        .length - 1
                                                                                ].loadStop?.state ||
                                                                                    assignment.routeLeg.locations[
                                                                                        assignment.routeLeg.locations
                                                                                            .length - 1
                                                                                    ].location?.state}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Trip Details */}
                                                                <div className="col-span-3">
                                                                    <div className="grid grid-cols-2 gap-3 text-center">
                                                                        <div>
                                                                            <div className="text-xs text-gray-500 mb-0.5">
                                                                                Distance
                                                                            </div>
                                                                            <div className="text-sm font-semibold text-gray-900">
                                                                                {Number(
                                                                                    assignment.billedDistanceMiles ||
                                                                                        assignment.routeLeg
                                                                                            .distanceMiles,
                                                                                ).toFixed(1)}
                                                                                mi
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-xs text-gray-500 mb-0.5">
                                                                                Empty
                                                                            </div>
                                                                            <div className="text-sm font-semibold text-gray-700">
                                                                                {Number(
                                                                                    assignment.emptyMiles || 0,
                                                                                ).toFixed(1)}
                                                                                mi
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Charge Type & Rate */}
                                                                <div className="col-span-2 text-center">
                                                                    <div className="text-xs text-gray-500 mb-0.5">
                                                                        Charge Type
                                                                    </div>
                                                                    <div className="text-sm font-semibold text-gray-900 leading-tight">
                                                                        {assignment.chargeType.replace(/_/g, ' ')}
                                                                    </div>
                                                                    <div className="text-xs text-gray-600 mt-1">
                                                                        {assignment.chargeType === 'PER_MILE' &&
                                                                            `$${assignment.chargeValue}/mi`}
                                                                        {assignment.chargeType === 'PER_HOUR' &&
                                                                            `$${assignment.chargeValue}/hr`}
                                                                        {assignment.chargeType ===
                                                                            'PERCENTAGE_OF_LOAD' &&
                                                                            `${assignment.chargeValue}%`}
                                                                        {assignment.chargeType === 'FIXED_PAY' &&
                                                                            formatCurrency(
                                                                                Number(assignment.chargeValue),
                                                                            )}
                                                                    </div>
                                                                </div>
                                                                {/* Status & Amount */}
                                                                <div className="col-span-1 text-right">
                                                                    <div
                                                                        className="text-xs text-gray-500 mb-1 cursor-help"
                                                                        title={
                                                                            assignment.routeLeg.endedAt
                                                                                ? `Completed: ${new Date(
                                                                                      assignment.routeLeg.endedAt,
                                                                                  ).toLocaleString()}`
                                                                                : assignment.routeLeg.startedAt
                                                                                ? `Started: ${new Date(
                                                                                      assignment.routeLeg.startedAt,
                                                                                  ).toLocaleString()}`
                                                                                : 'Start time not available'
                                                                        }
                                                                    >
                                                                        {assignment.routeLeg.endedAt
                                                                            ? 'Completed'
                                                                            : 'In Progress'}
                                                                    </div>
                                                                    <div className="text-sm font-bold text-green-600">
                                                                        {formatCurrency(calculatedAmount)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Line Items */}
                                        {invoice.lineItems.length > 0 && (
                                            <div className="px-4 py-4 sm:px-6 bg-gray-100/60 backdrop-blur-2xl border-b border-gray-200/40">
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
                                                                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                                            />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-900">
                                                            Line Items
                                                        </h3>
                                                        <p className="text-xs text-gray-600">
                                                            Additional charges & deductions
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {invoice.lineItems.length > 0 && (
                                            <div className="px-4 py-5 sm:px-6">
                                                {/* Mobile Line Item Cards */}
                                                <div className="block md:hidden space-y-3">
                                                    {invoice.lineItems.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="bg-white/30 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-sm hover:shadow-md transition-all duration-200"
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                                        <h4 className="font-semibold text-gray-900 text-sm">
                                                                            {item.description}
                                                                        </h4>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right ml-3">
                                                                    <div className="text-xs text-gray-600 mb-0.5">
                                                                        Amount
                                                                    </div>
                                                                    <div
                                                                        className={`text-lg font-bold ${
                                                                            Number(item.amount) >= 0
                                                                                ? 'text-green-600'
                                                                                : 'text-red-600'
                                                                        }`}
                                                                    >
                                                                        {formatCurrency(Number(item.amount))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Desktop Table */}
                                                <div className="hidden md:block">
                                                    <div className="bg-white/30 backdrop-blur-xl rounded-2xl border border-white/20 shadow-sm overflow-hidden">
                                                        <div className="bg-white/40 backdrop-blur-2xl px-6 py-3 border-b border-white/30">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        Description
                                                                    </span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        Amount
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="divide-y divide-white/20">
                                                            {invoice.lineItems.map((item) => (
                                                                <div
                                                                    key={item.id}
                                                                    className="px-6 py-4 hover:bg-white/20 transition-all duration-200"
                                                                >
                                                                    <div className="grid grid-cols-2 gap-4 items-center">
                                                                        <div className="text-sm font-medium text-gray-900">
                                                                            {item.description}
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span
                                                                                className={`text-sm font-bold ${
                                                                                    Number(item.amount) >= 0
                                                                                        ? 'text-green-600'
                                                                                        : 'text-red-600'
                                                                                }`}
                                                                            >
                                                                                {formatCurrency(Number(item.amount))}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Invoice Total Section */}
                                        <div className="px-4 py-4 sm:px-6 bg-green-100/50 backdrop-blur-2xl border-b border-green-100/40">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center shadow-sm">
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
                                                            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                                        />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-900">
                                                        Invoice Summary
                                                    </h3>
                                                    <p className="text-xs text-gray-600">Financial breakdown</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="px-4 py-6 sm:px-6">
                                            <div className="flex justify-end">
                                                <div className="w-full sm:w-2/3 lg:w-1/2">
                                                    <div className="bg-white/30 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-sm space-y-4">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                                <span className="text-gray-700 font-medium">
                                                                    Assignment(s) Total
                                                                </span>
                                                            </div>
                                                            <span className="font-semibold text-gray-900">
                                                                {formatCurrency(assignmentsTotal)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm pb-4 border-b border-white/30">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                                <span className="text-gray-700 font-medium">
                                                                    Line Item(s) Total
                                                                </span>
                                                            </div>
                                                            <span
                                                                className={`font-semibold ${
                                                                    Number(lineItemsTotal) >= 0
                                                                        ? 'text-gray-900'
                                                                        : 'text-red-600'
                                                                }`}
                                                            >
                                                                {formatCurrency(Number(lineItemsTotal))}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center pt-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                                                                    <svg
                                                                        className="w-3 h-3 text-green-600"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth={2}
                                                                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                                                        />
                                                                    </svg>
                                                                </div>
                                                                <span className="text-lg font-bold text-gray-900">
                                                                    Final Total
                                                                </span>
                                                            </div>
                                                            <span
                                                                className={`text-xl font-bold ${
                                                                    Number(invoice.totalAmount) < 0
                                                                        ? 'text-red-600'
                                                                        : 'text-green-600'
                                                                }`}
                                                            >
                                                                {formatCurrency(Number(invoice.totalAmount))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment History Card */}
                                    <div className="overflow-hidden rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-xl border border-gray-200/30 shadow-sm">
                                        {/* Payment History */}
                                        {/* Payment History Section */}
                                        <div className="px-4 py-4 sm:px-6 bg-white/40 backdrop-blur-2xl border-b border-white/30">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm shadow-amber-500/25">
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
                                                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z"
                                                        />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-900">
                                                        Payment History
                                                    </h3>
                                                    <p className="text-xs text-gray-600">
                                                        Payment records & transactions
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {invoice.payments.length === 0 ? (
                                            <div className="px-6 py-8 text-center">
                                                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
                                                    <div className="text-gray-500 text-sm font-medium">
                                                        No payments recorded yet.
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="px-4 py-5 sm:px-6">
                                                {/* Mobile Payment Cards */}
                                                <div className="block md:hidden space-y-3">
                                                    {invoice.payments.map((payment) => (
                                                        <div
                                                            key={payment.id}
                                                            className="bg-white/30 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-sm hover:shadow-md transition-all duration-200"
                                                        >
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                                        <h4 className="font-semibold text-gray-900 text-sm">
                                                                            {dayjs(payment.paymentDate).format(
                                                                                'MM/DD/YYYY',
                                                                            )}
                                                                        </h4>
                                                                    </div>
                                                                    <p className="text-xs text-gray-600 pl-4">
                                                                        {payment.notes}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right ml-3">
                                                                    <div className="text-xs text-gray-600 mb-0.5">
                                                                        Amount
                                                                    </div>
                                                                    <div className="text-lg font-bold text-green-600">
                                                                        {formatCurrency(payment.amount)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end pt-2 border-t border-white/20">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setPaymentIdToDelete(payment.id);
                                                                        setShowDeletePaymentDialog(true);
                                                                    }}
                                                                    className="text-red-600 hover:text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-50/50 transition-all duration-200"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Desktop Table */}
                                                <div className="hidden md:block">
                                                    <div className="bg-white/30 backdrop-blur-xl rounded-2xl border border-white/20 shadow-sm overflow-hidden">
                                                        <div className="bg-white/40 backdrop-blur-2xl px-6 py-3 border-b border-white/30">
                                                            <div className="grid grid-cols-4 gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        Payment Date
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        Payment Note
                                                                    </span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        Amount
                                                                    </span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        Actions
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="divide-y divide-white/20">
                                                            {invoice.payments.map((payment) => (
                                                                <div
                                                                    key={payment.id}
                                                                    className="px-6 py-4 hover:bg-white/20 transition-all duration-200"
                                                                >
                                                                    <div className="grid grid-cols-4 gap-4 items-center">
                                                                        <div className="text-sm font-medium text-gray-900">
                                                                            {dayjs(payment.paymentDate).format(
                                                                                'MM/DD/YYYY',
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm text-gray-900">
                                                                            {payment.notes}
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="text-sm font-bold text-green-600">
                                                                                {formatCurrency(payment.amount)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setPaymentIdToDelete(payment.id);
                                                                                    setShowDeletePaymentDialog(true);
                                                                                }}
                                                                                className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50/50 transition-all duration-200"
                                                                            >
                                                                                Delete
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <LoadingInvoice />
                    )}
                </div>
            </>
        </Layout>
    );
};

const LoadingInvoice: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
            {/* Breadcrumb */}
            <div className="mb-8">
                <nav className="flex" aria-label="Breadcrumb">
                    <ol className="flex items-center space-x-2">
                        <li>
                            <div className="h-4 w-28 bg-gray-200 rounded"></div>
                        </li>
                        <li className="flex items-center">
                            <svg
                                className="h-5 w-5 text-gray-300"
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
                            <div className="ml-2 h-4 w-32 bg-gray-200 rounded"></div>
                        </li>
                    </ol>
                </nav>
            </div>

            {/* Invoice Header */}
            <div className="bg-white border border-slate-100 px-4 py-5 sm:rounded-lg sm:p-6">
                <div className="md:flex md:items-center md:justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
                        <div className="mt-1 flex flex-col sm:flex-wrap sm:mt-0">
                            <div className="mt-2 flex items-center text-sm">
                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 h-4 w-20"></div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-col items-end md:mt-0 md:ml-4 gap-3">
                        <div className="h-6 w-28 bg-gray-200 rounded"></div>
                        <div className="flex items-center space-x-3">
                            <div className="h-8 w-24 bg-gray-200 rounded"></div>
                            <div className="h-8 w-20 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoice Details Section */}
            <div className="mt-8 bg-gray-50 shadow border border-gray-200 rounded-lg">
                {/* Invoice Details */}
                <div className="border-b border-gray-200 px-4 py-5">
                    <div className="h-4 w-1/3 bg-gray-200 rounded mb-2"></div>
                    <div className="space-y-2">
                        <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                        <div className="h-3 w-2/3 bg-gray-200 rounded"></div>
                        <div className="h-3 w-1/4 bg-gray-200 rounded"></div>
                    </div>
                </div>

                {/* Assignments Header */}
                <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
                    <div className="h-6 w-48 bg-gray-200 rounded"></div>
                </div>

                {/* Assignments Table */}
                <div className="overflow-x-auto">
                    <div className="space-y-2 p-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-10 w-full bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>

                {/* Line Items Header */}
                <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
                    <div className="h-6 w-36 bg-gray-200 rounded"></div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto">
                    <div className="space-y-2 p-4">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="h-10 w-full bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>

                {/* Totals Section */}
                <div className="border-t border-gray-200 px-6 py-4">
                    <div className="flex justify-end">
                        <div className="h-6 w-20 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

InvoiceDetailsPage.authenticationEnabled = true;

export default InvoiceDetailsPage;
