import React, { useState, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ExpandedDriverAssignment } from '../../interfaces/models';
import { createAssignmentPayment, deleteAssignmentPayment } from '../../lib/rest/assignment';
import { LoadingOverlay } from '../LoadingOverlay';
import { Prisma } from '@prisma/client';
import parseISO from 'date-fns/parseISO';
import MoneyInput from '../forms/MoneyInput';
import SimpleDialog from 'components/dialogs/SimpleDialog';

interface AssignmentPaymentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignment: ExpandedDriverAssignment | null;
    onAddPayment: (amount: number) => void;
    onDeletePayment: (paymentId: string) => void;
}

const calculateDriverPay = (assignment: ExpandedDriverAssignment) => {
    const { chargeType, chargeValue, load, routeLeg } = assignment;
    if (!chargeType || !chargeValue) return new Prisma.Decimal(0);

    const chargeValueDecimal = new Prisma.Decimal(chargeValue);

    if (chargeType === 'PER_MILE') {
        const distanceInMiles = new Prisma.Decimal(routeLeg?.routeLegDistance ?? 0).div(1609.34);
        return distanceInMiles.mul(chargeValueDecimal);
    } else if (chargeType === 'PER_HOUR') {
        const durationInHours = new Prisma.Decimal(routeLeg?.routeLegDuration ?? 0).div(3600);
        return durationInHours.mul(chargeValueDecimal);
    } else if (chargeType === 'FIXED_PAY') {
        return chargeValueDecimal;
    } else if (chargeType === 'PERCENTAGE_OF_LOAD') {
        const loadRate = new Prisma.Decimal(load?.rate ?? 0);
        return loadRate.mul(chargeValueDecimal).div(100);
    }
    return new Prisma.Decimal(0);
};

const formatCurrency = (amount: number | Prisma.Decimal) => {
    return new Prisma.Decimal(amount).toNumber().toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const AssignmentPaymentsModal: React.FC<AssignmentPaymentsModalProps> = ({
    isOpen,
    onClose,
    assignment,
    onAddPayment,
    onDeletePayment,
}) => {
    const [amount, setAmount] = useState<number | null>(null);
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
    const [loading, setLoading] = useState<boolean>(false);
    const amountFieldRef = useRef(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

    const handleAddPayment = async () => {
        if (amount && paymentDate && assignment) {
            setLoading(true);
            try {
                const payment = await createAssignmentPayment(
                    assignment.id,
                    amount,
                    parseISO(paymentDate).toISOString(),
                );
                onAddPayment(new Prisma.Decimal(payment.amount).toNumber());
                setAmount(null);
                setPaymentDate(new Date().toLocaleDateString('en-CA'));
            } catch (error) {
                console.error('Error adding payment:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDeletePayment = async () => {
        if (paymentToDelete && assignment) {
            setLoading(true);
            try {
                await deleteAssignmentPayment(assignment.id, paymentToDelete);
                assignment.payments = assignment.payments.filter((payment) => payment.id !== paymentToDelete);
                onDeletePayment(paymentToDelete);
                setPaymentToDelete(null);
                setConfirmOpen(false);
            } catch (error) {
                console.error('Error deleting payment:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const setToFullDue = () => {
        if (assignment) {
            const totalAmountDue = calculateDriverPay(assignment);
            const paidAmount = assignment.payments.reduce(
                (acc, payment) => acc.plus(payment.amount),
                new Prisma.Decimal(0),
            );
            const remainingAmount = totalAmountDue.minus(paidAmount);
            if (remainingAmount.toNumber() > 0) {
                setAmount(remainingAmount.toNumber());
                amountFieldRef?.current?.focus();
            }
        }
    };

    return (
        <Transition.Root show={isOpen} as="div">
            <Dialog as="div" className="relative z-10" onClose={() => !confirmOpen && onClose()}>
                <Transition.Child
                    as="div"
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
                            <Transition.Child
                                as={React.Fragment}
                                enter="transform transition ease-in-out duration-500 sm:duration-200"
                                enterFrom="translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-500 sm:duration-200"
                                leaveFrom="translate-x-0"
                                leaveTo="translate-x-full"
                            >
                                <Dialog.Panel className="w-screen max-w-md pointer-events-auto">
                                    {loading && <LoadingOverlay />}
                                    <div className="flex flex-col h-full overflow-y-scroll bg-white shadow-xl">
                                        <div className="px-4 py-6 text-white bg-blue-600 sm:px-6">
                                            <div className="flex items-start justify-between">
                                                <Dialog.Title className="text-lg font-medium">
                                                    Payments for Assignment
                                                </Dialog.Title>
                                                <div className="flex items-center ml-3 h-7">
                                                    <button
                                                        type="button"
                                                        className="text-white bg-blue-600 rounded-md hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
                                                        onClick={onClose}
                                                    >
                                                        <span className="sr-only">Close panel</span>
                                                        <XMarkIcon className="w-6 h-6" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                            {assignment && (
                                                <div className="mt-4">
                                                    <p className="text-sm">Driver: {assignment.driver.name}</p>
                                                    <p className="text-sm">Load/Order #: {assignment.load.refNum}</p>
                                                    <p className="text-sm">
                                                        Rate: {formatCurrency(assignment.load.rate)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="relative flex-1 px-4 sm:px-6">
                                            <div className="absolute inset-0 px-4 sm:px-6">
                                                <div className="h-full" aria-hidden="true">
                                                    <table className="min-w-full mt-6 divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th
                                                                    scope="col"
                                                                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                                                                >
                                                                    Date
                                                                </th>
                                                                <th
                                                                    scope="col"
                                                                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                                                                >
                                                                    Amount
                                                                </th>
                                                                <th scope="col" className="relative px-6 py-3">
                                                                    <span className="sr-only">Delete</span>
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {assignment?.payments?.length > 0 ? (
                                                                assignment.payments.map((payment) => (
                                                                    <tr key={payment.id}>
                                                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                                            {new Date(
                                                                                payment.paymentDate,
                                                                            ).toLocaleDateString()}
                                                                        </td>
                                                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                                            {formatCurrency(payment.amount)}
                                                                        </td>
                                                                        <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                                                            <button
                                                                                type="button"
                                                                                className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setPaymentToDelete(payment.id);
                                                                                    setConfirmOpen(true);
                                                                                }}
                                                                                disabled={loading}
                                                                            >
                                                                                <TrashIcon className="flex-shrink-0 w-4 h-4 text-gray-800" />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td
                                                                        colSpan={3}
                                                                        className="px-6 py-4 text-sm text-center text-gray-500"
                                                                    >
                                                                        No payments available.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                    <div className="mt-4">
                                                        <label className="block text-sm font-medium text-gray-700">
                                                            Payment Amount
                                                        </label>
                                                        <div className="flex mt-1 rounded-md shadow-sm">
                                                            <div className="relative flex items-stretch flex-grow focus-within:z-10">
                                                                <MoneyInput
                                                                    id="amount"
                                                                    className="rounded-none rounded-l-md"
                                                                    value={amount?.toString() || ''}
                                                                    onChange={(e) => setAmount(Number(e.target.value))}
                                                                />
                                                            </div>
                                                            {assignment &&
                                                                calculateDriverPay(assignment)
                                                                    .minus(
                                                                        assignment.payments.reduce(
                                                                            (acc, payment) => acc.plus(payment.amount),
                                                                            new Prisma.Decimal(0),
                                                                        ),
                                                                    )
                                                                    .toNumber() > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={setToFullDue}
                                                                        className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                                    >
                                                                        <span>
                                                                            {assignment &&
                                                                            assignment.payments
                                                                                .reduce(
                                                                                    (acc, payment) =>
                                                                                        acc.plus(payment.amount),
                                                                                    new Prisma.Decimal(0),
                                                                                )
                                                                                .equals(calculateDriverPay(assignment))
                                                                                ? 'Full Due'
                                                                                : 'Full Remaining'}
                                                                        </span>
                                                                    </button>
                                                                )}
                                                        </div>
                                                    </div>
                                                    <div className="mt-4">
                                                        <label className="block text-sm font-medium text-gray-700">
                                                            Payment Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            value={paymentDate}
                                                            onChange={(e) => setPaymentDate(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="mt-6">
                                                        <button
                                                            type="button"
                                                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-default disabled:bg-blue-600"
                                                            onClick={handleAddPayment}
                                                            disabled={loading || !amount || !paymentDate || !assignment}
                                                        >
                                                            Add Payment
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </div>
            </Dialog>

            <SimpleDialog
                show={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                title="Delete Payment"
                description="Are you sure you want to delete this payment? This action cannot be undone."
                primaryButtonText="Delete"
                primaryButtonAction={handleDeletePayment}
                secondaryButtonText="Cancel"
            />
        </Transition.Root>
    );
};

export default AssignmentPaymentsModal;
