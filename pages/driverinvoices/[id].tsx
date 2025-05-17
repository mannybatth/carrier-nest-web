'use client';

import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, TrashIcon, PencilIcon, ArrowDownTrayIcon, PhoneIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
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
import React, { Fragment, useEffect, useState } from 'react';
import { add, set } from 'date-fns';
import dayjs from 'dayjs';
import { PageWithAuth } from 'interfaces/auth';
import { de } from 'date-fns/locale';
import { downloadDriverInvoice } from 'components/driverinvoices/driverInvoicePdf';
import { formatPhoneNumber } from 'lib/helpers/format';

type ActionsDropdownProps = {
    invoice: ExpandedDriverInvoice;
    disabled?: boolean;
    downloadInvoice: () => void;
    deleteInvoice: (id: string) => void;
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({ invoice, disabled, downloadInvoice, deleteInvoice }) => {
    const router = useRouter();

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button
                    className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
                    disabled={disabled}
                >
                    Actions
                    <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" aria-hidden="true" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/driverinvoices/edit/${invoice.id}`);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm flex items-center',
                                    )}
                                >
                                    <PencilIcon className="w-5 h-5 mr-2" />
                                    Edit
                                </a>
                            )}
                        </Menu.Item>

                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        downloadInvoice();
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm flex items-center',
                                    )}
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                                    Download Invoice
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteInvoice(invoice.id);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-red-700' : 'text-red-600',
                                        'block px-4 py-2 text-sm flex items-center',
                                    )}
                                >
                                    <TrashIcon className="w-5 h-5 mr-2" />
                                    Delete
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

const InvoiceDetailsPage: PageWithAuth = () => {
    const router = useRouter();
    const [invoice, setInvoice] = useState<ExpandedDriverInvoice | null>(null);
    const [showDeleteInvoiceDialog, setShowDeleteInvoiceDialog] = useState(false);
    const [showDeletePaymentDialog, setShowDeletePaymentDialog] = useState(false);
    const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
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
                    amount = Number(assignment.billedDistanceMiles) * Number(assignment.chargeValue);
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
    const getInvoiceData = async () => {
        try {
            const invoiceData = await getDriverInvoiceById(invoiceId);
            setInvoice(invoiceData);
        } catch (error) {
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
    }, [router.query]);

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
                <div className="min-h-screen bg-white">
                    {invoice ? (
                        <div>
                            {/* Delete Invoice Dialog */}
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

                            {invoice && (
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                                    <div className="mb-8">
                                        <nav className="flex" aria-label="Breadcrumb">
                                            <ol className="flex items-center space-x-2">
                                                <li>
                                                    <Link
                                                        href="/driverinvoices"
                                                        className="text-gray-500 hover:text-gray-700"
                                                    >
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
                                                    <span className="ml-2 text-gray-700 font-medium">
                                                        Invoice #{invoice?.invoiceNum}
                                                    </span>
                                                </li>
                                            </ol>
                                        </nav>
                                    </div>

                                    {/* Invoice Header */}
                                    <div className="bg-white shadow-none border border-slate-200 px-4 py-5 sm:rounded-lg sm:p-6">
                                        <div className="flex flex-col justify-center lg:flex-row md:items-center md:justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate capitalize">
                                                    {invoice.driver.name.toLocaleLowerCase()}{' '}
                                                </p>
                                                <span className="text-sm font-light flex flex-row gap-1 items-center">
                                                    <PhoneIcon className="w-4 h-4 text-blue-600" />{' '}
                                                    {formatPhoneNumber(invoice.driver.phone)}
                                                </span>
                                            </div>
                                            <div className=" mt-6 flex flex-col items-center justify-center lg:items-end lg:mt-0 md:ml-4 gap-3">
                                                <div className="flex flex-row items-center  gap-1">
                                                    <h2 className="text-xl font-semibold leading-7 text-gray-800 sm:truncate">
                                                        Invoice #{invoice.invoiceNum}
                                                    </h2>
                                                    {'-'}
                                                    <div className="text-sm   font-semibold  rounded-full">
                                                        {invoiceStatusBadge(invoice.status)}
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAddPaymentDialog(true)}
                                                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                    >
                                                        + Add Payment
                                                    </button>
                                                    {(invoice.status == 'APPROVED' || invoice.status == 'PENDING') && (
                                                        <button
                                                            type="button"
                                                            disabled={updatingStatus}
                                                            onClick={handleStatusChange}
                                                            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium  ${
                                                                invoice.status !== 'APPROVED'
                                                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                                                    : 'bg-yellow-200 hover:bg-yellow-300 text-gray-800'
                                                            }  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                                                            aria-label={`Change status to ${
                                                                invoice.status === 'APPROVED' ? 'Pending' : 'Approved'
                                                            }`}
                                                        >
                                                            {invoice.status === 'APPROVED'
                                                                ? 'Mark as Pending'
                                                                : 'Mark as Approved'}
                                                        </button>
                                                    )}

                                                    <ActionsDropdown
                                                        invoice={invoice}
                                                        disabled={isDownloading}
                                                        downloadInvoice={handleDownloadInvoice}
                                                        deleteInvoice={() => setShowDeleteInvoiceDialog(true)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative mt-8 bg-white shadow-none overflow-hidden border border-gray-200 rounded-lg">
                                        {/* Invoice Details */}
                                        <div className="border-b border-gray-200">
                                            <dl>
                                                <div className="bg-slate-50 px-4 py-5 items-end sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6">
                                                    <div className="space-y-2">
                                                        <dt className=" font-medium text-md text-gray-400">Bill To:</dt>
                                                        <dd className="mt-1 text-sm text-gray-500">
                                                            <div className="font-bold text-gray-900">
                                                                {invoice.carrier?.name}
                                                            </div>
                                                            <div>{invoice.carrier?.street}</div>
                                                            <div>
                                                                {invoice.carrier?.city}, {invoice.carrier?.state}{' '}
                                                                {invoice.carrier?.zip}
                                                            </div>
                                                            <div>
                                                                {invoice.carrier?.phone}
                                                                {' / '}
                                                                {invoice.carrier?.email}
                                                            </div>
                                                        </dd>
                                                    </div>
                                                    <div className="mt-4 sm:mt-0 space-y-0 ">
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm font-base text-gray-500">
                                                                Created At
                                                            </dt>
                                                            <dd className="mt-1 text-sm font-semibold text-gray-900">
                                                                {new Date(invoice.createdAt).toLocaleString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: '2-digit',
                                                                    hour: 'numeric',
                                                                    minute: 'numeric',
                                                                    second: 'numeric',
                                                                    hour12: true,
                                                                })}
                                                            </dd>
                                                        </div>

                                                        <div className="flex justify-between">
                                                            <dt className="text-sm font-base text-gray-500">
                                                                Updated At
                                                            </dt>
                                                            <dd className="mt-1 text-sm text-gray-700">
                                                                {new Date(invoice.updatedAt).toLocaleString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: '2-digit',
                                                                    hour: 'numeric',
                                                                    minute: 'numeric',
                                                                    second: 'numeric',
                                                                    hour12: true,
                                                                })}
                                                            </dd>
                                                        </div>

                                                        <div className="flex justify-between">
                                                            <dt className="text-sm font-base text-gray-500">Period</dt>
                                                            <dd className="mt-1 text-sm font-semibold text-gray-900">
                                                                {new Date(invoice.fromDate).toLocaleDateString()} -{' '}
                                                                {new Date(invoice.toDate).toLocaleDateString()}
                                                            </dd>
                                                        </div>
                                                        {/*  <div className="flex justify-between">
                                                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            {invoice.status}
                                                        </span>
                                                    </dd>
                                                </div> */}
                                                    </div>
                                                </div>
                                            </dl>
                                        </div>
                                        {invoice.notes && (
                                            <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
                                                <h6 className="text-md font-medium leading-6 text-gray-900">
                                                    Invoice Notes
                                                </h6>
                                                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                                    {invoice.notes || 'No notes added.'}
                                                </p>
                                            </div>
                                        )}

                                        <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
                                            <h3 className="text-lg font-medium leading-6 text-gray-900">
                                                Assignments ({invoice.assignments.length})
                                            </h3>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="min-w-full bg-white rounded-lg">
                                                <thead>
                                                    <tr className="bg-gray-100">
                                                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Order #
                                                        </th>

                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Route
                                                        </th>
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Trip Details
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
                                                                calculatedAmount = Number(assignment.chargeValue);
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
                                                                key={assignment.routeLeg.id}
                                                                className={`hover:bg-gray-50 cursor-default  `}
                                                            >
                                                                <td className="py-3 px-6 text-sm text-gray-800">
                                                                    <Link
                                                                        href={`/loads/${assignment.load.id}#load-assignments`}
                                                                        target="_blank"
                                                                    >
                                                                        <span className="font-semibold">
                                                                            {assignment.load.refNum}
                                                                        </span>
                                                                    </Link>
                                                                </td>

                                                                <td className="py-3 px-4 text-sm font-medium text-gray-800 whitespace-break-spaces capitalize">
                                                                    {formattedLocations}
                                                                </td>
                                                                <td className="py-3 px-4 text-sm items-start text-left font-base text-gray-800 whitespace-break-spaces capitalize">
                                                                    <span className="">{`${
                                                                        assignment.billedDistanceMiles ||
                                                                        assignment.routeLeg.distanceMiles
                                                                    } miles`}</span>
                                                                    <span className="">{` \n${
                                                                        assignment.billedDurationHours ||
                                                                        assignment.routeLeg.durationHours
                                                                    } hours`}</span>
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
                                                                <td className="py-3 px-4 text-sm font-medium text-gray-800">
                                                                    {formatCurrency(calculatedAmount.toFixed(2))}
                                                                </td>
                                                                <td className="py-3 px-4 text-sm text-gray-800 whitespace-break-spaces">
                                                                    {/* <span className="text-xs font-semibold text-gray-600">
                                                                Started @
                                                            </span>
                                                            {'\n'}
                                                            <span className="text-gray-600 font-semibold">
                                                                {new Date(
                                                                    assignment.routeLeg.startedAt,
                                                                ).toLocaleTimeString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: '2-digit',
                                                                })}
                                                            </span>

                                                            {'\n'} */}
                                                                    <span className="text-xs text-gray-800 font-bold uppercase">
                                                                        Completed @
                                                                    </span>
                                                                    {'\n'}
                                                                    <span className="text-gray-800 font-base">
                                                                        {new Date(
                                                                            assignment.routeLeg.endedAt,
                                                                        ).toLocaleTimeString('en-US', {
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: '2-digit',
                                                                        })}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Line Items */}
                                        {invoice.lineItems.length > 0 && (
                                            <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
                                                <h3 className="text-lg font-medium leading-6 text-gray-900">
                                                    Line Items
                                                </h3>
                                            </div>
                                        )}
                                        {invoice.lineItems.length > 0 && (
                                            <div>
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th
                                                                    scope="col"
                                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                                >
                                                                    Description
                                                                </th>
                                                                <th
                                                                    scope="col"
                                                                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                                >
                                                                    Amount
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {invoice.lineItems.map((item) => (
                                                                <tr key={item.id}>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                        {item.description}
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                                                        {formatCurrency(Number(item.amount))}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
                                            <h3 className="text-lg font-medium leading-6 text-gray-900">
                                                Invoice Total
                                            </h3>
                                        </div>
                                        <div className="border-t border-gray-200 px-6 py-4">
                                            <div className="flex justify-end">
                                                <div className="w-full sm:w-1/2 lg:w-1/3">
                                                    <div className="flex justify-between font-light mb-2">
                                                        <span>Assignment(s) Total</span>
                                                        <span>{formatCurrency(assignmentsTotal)}</span>
                                                    </div>
                                                    <div className="flex justify-between font-light mb-4 border-b-2 border-gray-200">
                                                        <span>Line Item(s) Total</span>
                                                        <span
                                                            className={`${
                                                                Number(lineItemsTotal) >= 0
                                                                    ? 'text-gray-800'
                                                                    : 'text-red-600'
                                                            }`}
                                                        >
                                                            {formatCurrency(Number(lineItemsTotal))}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between font-semibold text-lg">
                                                        <span>Total</span>
                                                        <span
                                                            className={` ${
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

                                    <div className="mt-8 bg-gray-50 shadow-none overflow-hidden border border-gray-200 rounded-lg">
                                        {/* Payment History */}
                                        <div className="px-4 py-5 sm:px-6  ">
                                            <h3 className="text-lg font-bold leading-6 text-gray-900">
                                                Payment History
                                            </h3>
                                        </div>
                                        {invoice.payments.length === 0 ? (
                                            <div className="px-6 py-4 text-sm text-gray-500">
                                                No payments recorded yet.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th
                                                                scope="col"
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                Payment Date
                                                            </th>
                                                            <th
                                                                scope="col"
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                Payment Note
                                                            </th>
                                                            <th
                                                                scope="col"
                                                                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                Amount
                                                            </th>
                                                            <th scope="col" className="relative px-6 py-3 w-10">
                                                                <span className="sr-only">Actions</span>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {invoice.payments.map((payment) => (
                                                            <tr key={payment.id}>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    {dayjs(payment.paymentDate).format('MM/DD/YYYY')}
                                                                </td>

                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    {payment.notes}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                                    {formatCurrency(payment.amount)}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    <div className="relative inline-block text-left">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setPaymentIdToDelete(payment.id);
                                                                                setShowDeletePaymentDialog(true);
                                                                            }}
                                                                            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                                                                        >
                                                                            <TrashIcon className="h-5 w-5 text-red-600" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
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
