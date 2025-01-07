import React, { useState, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ExpandedDriverAssignment } from '../../interfaces/models';
import { LoadingOverlay } from '../LoadingOverlay';
import { ChargeType, DriverPayment, Prisma } from '@prisma/client';
import parseISO from 'date-fns/parseISO';
import MoneyInput from '../forms/MoneyInput';
import SimpleDialog from 'components/dialogs/SimpleDialog';
import { calculateDriverPay } from '../../lib/helpers/calculateDriverPay';
import { createDriverPayments, deleteDriverPayment } from 'lib/rest/driver-payment';

interface AssignmentPaymentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignments: ExpandedDriverAssignment[];
    onAddPayment: (amount: number) => void;
    onDeletePayment: (paymentId: string) => void;
}

const formatCurrency = (amount: number | Prisma.Decimal) => {
    return new Prisma.Decimal(amount).toNumber().toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

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

const getStatusMessage = (status: string) => {
    switch (status) {
        case 'paid':
            return 'This assignment has been fully paid.';
        case 'not paid':
            return 'This assignment has not been paid for yet.';
        default:
            return 'Unknown payment status.';
    }
};

const AssignmentPaymentsModal: React.FC<AssignmentPaymentsModalProps> = ({
    isOpen,
    onClose,
    assignments,
    onAddPayment,
    onDeletePayment,
}) => {
    const [amounts, setAmounts] = useState<Record<string, number | null>>({});
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
    const [loading, setLoading] = useState<boolean>(false);
    const amountFieldRef = useRef(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [paymentIdToDelete, setPaymentIdToDelete] = useState<string | null>(null);
    const [hoursBilled, setHoursBilled] = useState<Prisma.Decimal | null>(new Prisma.Decimal(0));
    const [milesBilled, setMilesBilled] = useState<Prisma.Decimal | null>(new Prisma.Decimal(0));
    const [loadRateBilled, setLoadRateBilled] = useState<Prisma.Decimal | null>(new Prisma.Decimal(0));

    React.useEffect(() => {
        if (isOpen) {
            setAmounts(
                Object.keys(groupedAssignments).reduce((acc, driverId) => {
                    acc[driverId] = null;
                    return acc;
                }, {} as Record<string, number | null>),
            );
            setPaymentDate(new Date().toLocaleDateString('en-CA'));
            setHoursBilled(new Prisma.Decimal(assignments[0]?.routeLeg?.durationHours) ?? new Prisma.Decimal(0));
            setMilesBilled(new Prisma.Decimal(assignments[0]?.routeLeg?.distanceMiles) ?? new Prisma.Decimal(0));
            setLoadRateBilled(new Prisma.Decimal(assignments[0]?.load.rate));
        }
    }, [isOpen]);

    const getPayStatus = (assignment: ExpandedDriverAssignment) => {
        if (assignment.assignmentPayments && assignment.assignmentPayments.length > 0) {
            return 'paid';
        } else {
            return 'not paid';
        }
    };

    const calculateAssignmentTotalPay = (assignment: ExpandedDriverAssignment) => {
        return calculateDriverPay({
            chargeType: assignment.chargeType,
            chargeValue: assignment.chargeValue,
            distanceMiles: milesBilled ?? assignment.routeLeg?.distanceMiles ?? 0,
            durationHours: hoursBilled ?? assignment.routeLeg?.durationHours ?? 0,
            loadRate: loadRateBilled ?? assignment.load.rate,
        });
    };

    const handleAddPayment = async () => {
        if (paymentDate && assignments.length > 0) {
            setLoading(true);
            try {
                const paymentPromises = Object.keys(amounts).map(async (driverId) => {
                    const amount = amounts[driverId];
                    if (amount) {
                        const driverAssignmentsMap = assignments.reduce((acc, assignment) => {
                            if (assignment.driver.id === driverId) {
                                if (!acc[driverId]) {
                                    acc[driverId] = [];
                                }
                                acc[driverId].push(assignment.id);
                            }
                            return acc;
                        }, {} as Record<string, string[]>);

                        const payment = await createDriverPayments(
                            driverId,
                            driverAssignmentsMap[driverId],
                            amount,
                            parseISO(paymentDate).toISOString(),
                        );
                        onAddPayment(new Prisma.Decimal(payment.amount).toNumber());
                    }
                });

                await Promise.all(paymentPromises);
                setAmounts({});
                setPaymentDate(new Date().toLocaleDateString('en-CA'));
            } catch (error) {
                console.error('Error adding payment:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDeletePayment = async () => {
        if (paymentIdToDelete && assignments.length > 0) {
            setLoading(true);
            try {
                let driverId: string | null = null;
                assignments.forEach((assignment) => {
                    assignment.assignmentPayments.forEach((assignmentPayment) => {
                        if (assignmentPayment.driverPayment.id === paymentIdToDelete) {
                            driverId = assignment.driver.id;
                        }
                    });
                });

                if (driverId) {
                    await deleteDriverPayment(driverId, paymentIdToDelete);
                    assignments.forEach((assignment) => {
                        assignment.assignmentPayments = assignment.assignmentPayments.filter(
                            (assignmentPayment) => assignmentPayment.driverPayment.id !== paymentIdToDelete,
                        );
                    });
                    onDeletePayment(paymentIdToDelete);
                    setPaymentIdToDelete(null);
                    setConfirmOpen(false);
                } else {
                    console.error('Driver ID not found for the payment to be deleted.');
                }
            } catch (error) {
                console.error('Error deleting payment:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const setToFullDue = (driverId: string) => {
        if (assignments.length > 0) {
            const totalAmountDue = groupedAssignments[driverId].reduce((acc, assignment) => {
                return acc.plus(calculateAssignmentTotalPay(assignment));
            }, new Prisma.Decimal(0));
            setAmounts((prev) => ({ ...prev, [driverId]: totalAmountDue.toNumber() }));
            amountFieldRef?.current?.focus();
        }
    };

    const groupAssignmentsByDriver = (
        assignments: ExpandedDriverAssignment[],
    ): Record<string, ExpandedDriverAssignment[]> => {
        if (!assignments || assignments?.length === 0) return {};

        return assignments.reduce((acc, assignment) => {
            if (!acc[assignment.driver.id]) {
                acc[assignment.driver.id] = [];
            }
            acc[assignment.driver.id].push(assignment);
            return acc;
        }, {} as Record<string, ExpandedDriverAssignment[]>);
    };

    const groupedAssignments = groupAssignmentsByDriver(assignments);

    const groupPaymentsByDriver = (
        assignments: ExpandedDriverAssignment[],
    ): Record<string, { payment: DriverPayment; refNums: string[] }[]> => {
        const groupedPayments: Record<string, { payment: DriverPayment; refNums: string[] }[]> = {};
        if (!assignments || assignments.length === 0) return groupedPayments;

        assignments.forEach((assignment) => {
            assignment.assignmentPayments.forEach((assignmentPayment) => {
                const driverId = assignment.driver.id;
                const paymentId = assignmentPayment.driverPayment.id;

                if (!groupedPayments[driverId]) {
                    groupedPayments[driverId] = [];
                }

                const existingPayment = groupedPayments[driverId].find(
                    (groupedPayment) => groupedPayment.payment.id === paymentId,
                );

                if (existingPayment) {
                    existingPayment.refNums.push(assignment.load.refNum);
                } else {
                    groupedPayments[driverId].push({
                        payment: assignmentPayment.driverPayment,
                        refNums: [assignment.load.refNum],
                    });
                }
            });
        });

        return groupedPayments;
    };

    const groupedPayments = groupPaymentsByDriver(assignments);

    return (
        <Transition.Root show={isOpen} as="div">
            <Dialog
                as="div"
                className="relative z-10"
                onClose={() => {
                    if (!confirmOpen) {
                        setAmounts({});
                        setPaymentDate(new Date().toLocaleDateString('en-CA'));
                        onClose();
                    }
                }}
            >
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
                                <Dialog.Panel className="w-screen max-w-lg pointer-events-auto">
                                    {loading && <LoadingOverlay />}
                                    {assignments && assignments.length > 0 && (
                                        <div className="flex flex-col h-full overflow-y-auto bg-white shadow-xl">
                                            <div className="px-4 py-6 text-white bg-blue-600 sm:px-6">
                                                <div className="flex items-start justify-between">
                                                    <Dialog.Title className="text-lg font-medium">
                                                        Payments for Assignments
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
                                                {Object.keys(groupedAssignments).map((driverId) => (
                                                    <div key={driverId} className="mt-4">
                                                        <p className="text-sm">
                                                            Driver: {groupedAssignments[driverId][0].driver.name}
                                                        </p>
                                                        <p className="text-sm">
                                                            Total Assignments: {groupedAssignments[driverId].length}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="relative flex-1 px-4 sm:px-6">
                                                <div className="absolute inset-0 px-4 sm:px-6">
                                                    {Object.keys(groupedAssignments).map((driverId) => (
                                                        <div key={driverId} className="relative mt-8 border rounded-lg">
                                                            <div className="absolute px-2 text-lg font-medium text-gray-900 bg-white -top-3 left-3">
                                                                Driver: {groupedAssignments[driverId][0].driver.name}
                                                            </div>
                                                            <div className="p-4">
                                                                <table className="min-w-full mt-4 divide-y divide-gray-200">
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
                                                                            <th
                                                                                scope="col"
                                                                                className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                                                                            >
                                                                                For Loads
                                                                            </th>
                                                                            <th
                                                                                scope="col"
                                                                                className="relative px-6 py-3"
                                                                            >
                                                                                <span className="sr-only">Delete</span>
                                                                            </th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                                        {groupedPayments[driverId]?.length > 0 ? (
                                                                            groupedPayments[driverId].map(
                                                                                ({ payment, refNums }) => (
                                                                                    <tr key={payment.id}>
                                                                                        <td className="px-6 py-2 text-sm text-gray-500 whitespace-nowrap">
                                                                                            {new Date(
                                                                                                payment.paymentDate,
                                                                                            ).toLocaleDateString()}
                                                                                        </td>
                                                                                        <td className="px-6 py-2 text-sm text-gray-500 whitespace-nowrap">
                                                                                            {formatCurrency(
                                                                                                payment.amount,
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="px-6 py-2 text-sm text-gray-500 whitespace-nowrap">
                                                                                            {refNums.map((refNum) => (
                                                                                                <div key={refNum}>
                                                                                                    {refNum}
                                                                                                </div>
                                                                                            ))}
                                                                                        </td>
                                                                                        <td className="px-6 py-2 text-sm font-medium text-right whitespace-nowrap">
                                                                                            <button
                                                                                                type="button"
                                                                                                className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setPaymentIdToDelete(
                                                                                                        payment.id,
                                                                                                    );
                                                                                                    setConfirmOpen(
                                                                                                        true,
                                                                                                    );
                                                                                                }}
                                                                                                disabled={loading}
                                                                                            >
                                                                                                <TrashIcon className="flex-shrink-0 w-4 h-4 text-gray-800" />
                                                                                            </button>
                                                                                        </td>
                                                                                    </tr>
                                                                                ),
                                                                            )
                                                                        ) : (
                                                                            <tr>
                                                                                <td
                                                                                    colSpan={4}
                                                                                    className="px-6 py-4 text-sm text-center text-gray-500"
                                                                                >
                                                                                    No payments made.
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                                <div className="h-full" aria-hidden="true">
                                                                    <div className="mt-4">
                                                                        <label
                                                                            className="block text-sm font-medium text-gray-700"
                                                                            htmlFor={`amount-${driverId}`}
                                                                        >
                                                                            New Payment Amount
                                                                        </label>
                                                                        <div className="flex mt-1 rounded-md shadow-sm">
                                                                            <div className="relative flex items-stretch flex-grow focus-within:z-10">
                                                                                <MoneyInput
                                                                                    id={`amount-${driverId}`}
                                                                                    className="rounded-none rounded-l-md"
                                                                                    value={
                                                                                        amounts[driverId]?.toString() ||
                                                                                        ''
                                                                                    }
                                                                                    onChange={(e) =>
                                                                                        setAmounts((prev) => ({
                                                                                            ...prev,
                                                                                            [driverId]: Number(
                                                                                                e.target.value,
                                                                                            ),
                                                                                        }))
                                                                                    }
                                                                                />
                                                                            </div>
                                                                            {!groupedAssignments[driverId].some(
                                                                                (assignment) =>
                                                                                    assignment.assignmentPayments
                                                                                        .length > 0,
                                                                            ) && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        setToFullDue(driverId)
                                                                                    }
                                                                                    className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                                                >
                                                                                    <span>Full Due</span>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="mt-4">
                                                        <label
                                                            className="block text-sm font-medium text-gray-700"
                                                            htmlFor="payment-date"
                                                        >
                                                            New Payment Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            id="payment-date"
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
                                                            disabled={
                                                                loading || !paymentDate || assignments.length === 0
                                                            }
                                                        >
                                                            Add Payment
                                                        </button>
                                                    </div>
                                                    <div className="flex h-20"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
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
