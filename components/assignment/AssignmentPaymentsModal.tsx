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
    onAddPayment: () => void;
    onDeletePayment: () => void;
}

interface AssignmentDetails {
    assignment: ExpandedDriverAssignment;
    chargeType: ChargeType;
    chargeValue: number;
    billedDistanceMiles: number | null;
    billedDurationHours: number | null;
    billedLoadRate: number | null;
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
    const amountFieldRef = useRef(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<DriverPayment | null>(null);

    const [groupedAssignments, setGroupedAssignments] = useState<Record<string, AssignmentDetails[]>>({});
    const [groupedPayments, setGroupedPayments] = useState<Record<string, { payment: DriverPayment }[]>>({});
    const [amounts, setAmounts] = useState<Record<string, number | null>>({});

    const [paymentDate, setPaymentDate] = useState<string>(new Date().toLocaleDateString('en-CA'));

    const initState = () => {
        const details = groupAssignmentDetailsByDriver(assignments);
        setGroupedAssignments(details);
        setGroupedPayments(groupPaymentsByDriver(assignments));
        return details;
    };

    const buildAmounts = (groupedAssignments: Record<string, AssignmentDetails[]>) => {
        const newAmounts: Record<string, number | null> = {};
        assignments.forEach((assignment) => {
            newAmounts[assignment.driver.id] = calculateFullDue(
                assignment.driver.id,
                groupedAssignments[assignment.driver.id],
            );
        });
        setAmounts(newAmounts);
    };

    React.useEffect(() => {
        if (isOpen) {
            setPaymentDate(new Date().toLocaleDateString('en-CA'));
            const details = initState();
            buildAmounts(details);
        }
    }, [isOpen]);

    React.useEffect(() => {
        if (!assignments || assignments.length === 0) {
            onClose();
        } else {
            initState();
        }
    }, [assignments]);

    const getPayStatus = (assignment: ExpandedDriverAssignment) => {
        if (assignment.assignmentPayments && assignment.assignmentPayments.length > 0) {
            return 'paid';
        } else {
            return 'not paid';
        }
    };

    const handleAssignmentDetailChange = (
        assignmentDetail: AssignmentDetails,
        field: keyof AssignmentDetails,
        value: number | Prisma.Decimal | ChargeType | null,
    ) => {
        setGroupedAssignments((prev) => {
            const updatedAssignments = { ...prev };
            const driverId = assignmentDetail.assignment.driver.id;

            // Update field and value on assignment detail
            const assignmentId = assignmentDetail.assignment.id;
            const assignmentIndex = updatedAssignments[driverId].findIndex(
                (assignmentDetail) => assignmentDetail.assignment.id === assignmentId,
            );
            if (assignmentIndex !== -1) {
                if (field === 'chargeType') {
                    updatedAssignments[driverId][assignmentIndex][field] = value as ChargeType;
                } else {
                    updatedAssignments[driverId][assignmentIndex][field] = new Prisma.Decimal(
                        value,
                    ).toNumber() as number;
                }
            }
            return updatedAssignments;
        });
    };

    const calculateAssignmentTotalPay = (details: AssignmentDetails) => {
        return calculateDriverPay({
            chargeType: details.chargeType,
            chargeValue: details.chargeValue,
            distanceMiles: details.billedDistanceMiles ?? details.assignment.routeLeg?.distanceMiles ?? 0,
            durationHours: details.billedDurationHours ?? details.assignment.routeLeg?.durationHours ?? 0,
            loadRate: details.billedLoadRate ?? details.assignment.load.rate,
        });
    };

    const handleAddPayment = async () => {
        if (paymentDate && assignments.length > 0) {
            setLoading(true);
            try {
                const paymentPromises = Object.keys(amounts).map(async (driverId) => {
                    const amount = amounts[driverId];
                    if (amount) {
                        const driverAssignmentIds = assignments
                            .filter((assignment) => assignment.driver.id === driverId)
                            .map((assignment) => assignment.id);

                        await createDriverPayments(
                            driverId,
                            driverAssignmentIds,
                            amount,
                            parseISO(paymentDate).toISOString(),
                        );
                    }
                });

                await Promise.all(paymentPromises);
                onAddPayment();
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
        if (paymentToDelete && assignments.length > 0) {
            setLoading(true);
            try {
                const driverId = paymentToDelete.driverId;

                if (driverId) {
                    await deleteDriverPayment(driverId, paymentToDelete.id);
                    assignments.forEach((assignment) => {
                        assignment.assignmentPayments = assignment.assignmentPayments.filter(
                            (assignmentPayment) => assignmentPayment.driverPayment.id !== paymentToDelete.id,
                        );
                    });

                    onDeletePayment();
                    setPaymentToDelete(null);
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

    const calculateFullDue = (driverId: string, assignmentDetails?: AssignmentDetails[]) => {
        if (assignments.length > 0) {
            const totalAmountDue = (assignmentDetails || groupedAssignments[driverId]).reduce(
                (acc, assignmentDetails) => {
                    if (assignmentDetails.assignment.assignmentPayments.length === 0) {
                        return acc.plus(calculateAssignmentTotalPay(assignmentDetails));
                    }
                    return acc;
                },
                new Prisma.Decimal(0),
            );
            return totalAmountDue.toNumber();
        }
        return 0;
    };

    const setToFullDue = (driverId: string) => {
        if (assignments.length > 0) {
            const totalAmountDue = calculateFullDue(driverId);
            setAmounts((prev) => ({ ...prev, [driverId]: totalAmountDue }));
            amountFieldRef?.current?.focus();
        }
    };

    const groupAssignmentDetailsByDriver = (
        assignments: ExpandedDriverAssignment[],
    ): Record<string, AssignmentDetails[]> => {
        if (!assignments || assignments?.length === 0) return {};

        return assignments.reduce((acc, assignment) => {
            const details: AssignmentDetails = {
                assignment,
                chargeType: assignment.chargeType,
                chargeValue: new Prisma.Decimal(assignment.chargeValue).toNumber(),
                billedDistanceMiles: new Prisma.Decimal(
                    assignment.billedDistanceMiles || assignment.routeLeg.distanceMiles,
                )
                    .toNearest(0.01)
                    .toNumber(),
                billedDurationHours: new Prisma.Decimal(
                    assignment.billedDurationHours || assignment.routeLeg.durationHours,
                )
                    .toNearest(0.01)
                    .toNumber(),
                billedLoadRate: new Prisma.Decimal(assignment.billedLoadRate || assignment.load.rate)
                    .toNearest(0.01)
                    .toNumber(),
            };

            if (!acc[assignment.driver.id]) {
                acc[assignment.driver.id] = [];
            }
            acc[assignment.driver.id].push(details);
            return acc;
        }, {} as Record<string, AssignmentDetails[]>);
    };

    const groupPaymentsByDriver = (
        assignments: ExpandedDriverAssignment[],
    ): Record<string, { payment: DriverPayment }[]> => {
        const groupedPayments: Record<string, { payment: DriverPayment }[]> = {};
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

                if (!existingPayment) {
                    groupedPayments[driverId].push({
                        payment: assignmentPayment.driverPayment,
                    });
                }
            });
        });

        return groupedPayments;
    };

    const resetFieldToAssignmentValue = (assignmentDetail: AssignmentDetails, field: keyof AssignmentDetails) => {
        const assignment = assignmentDetail.assignment;
        let value: number | Prisma.Decimal | null = null;

        switch (field) {
            case 'billedDistanceMiles':
                value = assignment.billedDistanceMiles || assignment.routeLeg.distanceMiles;
                break;
            case 'billedDurationHours':
                value = assignment.billedDurationHours || assignment.routeLeg.durationHours;
                break;
            case 'billedLoadRate':
                value = assignment.billedLoadRate || assignment.load.rate;
                break;
        }

        handleAssignmentDetailChange(
            assignmentDetail,
            field,
            value ? new Prisma.Decimal(value).toNearest(0.01).toNumber() : null,
        );
    };

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
                                                            Driver:{' '}
                                                            {groupedAssignments[driverId][0].assignment.driver.name}
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
                                                                Driver:{' '}
                                                                {groupedAssignments[driverId][0].assignment.driver.name}
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
                                                                                Batched Payment
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
                                                                                ({ payment }) => (
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
                                                                                            {payment.isBatchPayment
                                                                                                ? 'Yes'
                                                                                                : 'No'}
                                                                                        </td>
                                                                                        <td className="px-6 py-2 text-sm font-medium text-right whitespace-nowrap">
                                                                                            <button
                                                                                                type="button"
                                                                                                className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setPaymentToDelete(
                                                                                                        payment,
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
                                                                {groupedAssignments[driverId].map(
                                                                    (assignmentDetails) => (
                                                                        <div
                                                                            key={assignmentDetails.assignment.id}
                                                                            className="relative mt-8 border rounded-lg"
                                                                        >
                                                                            <div className="absolute px-2 text-sm font-medium text-gray-700 bg-white -top-3 left-3">
                                                                                Assignment:{' '}
                                                                                {assignmentDetails.assignment.id}
                                                                            </div>
                                                                            <div className="p-4">
                                                                                {assignmentDetails.assignment
                                                                                    .assignmentPayments.length > 0 ? (
                                                                                    <div>
                                                                                        <p className="text-sm text-gray-700">
                                                                                            This assignment has been
                                                                                            paid.
                                                                                        </p>
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
                                                                                                        Batched Payment
                                                                                                    </th>
                                                                                                    <th
                                                                                                        scope="col"
                                                                                                        className="relative px-6 py-3"
                                                                                                    >
                                                                                                        <span className="sr-only">
                                                                                                            Delete
                                                                                                        </span>
                                                                                                    </th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                                                {assignmentDetails.assignment.assignmentPayments.map(
                                                                                                    ({
                                                                                                        driverPayment,
                                                                                                    }) => (
                                                                                                        <tr
                                                                                                            key={
                                                                                                                driverPayment.id
                                                                                                            }
                                                                                                        >
                                                                                                            <td className="px-6 py-2 text-sm text-gray-500 whitespace-nowrap">
                                                                                                                {new Date(
                                                                                                                    driverPayment.paymentDate,
                                                                                                                ).toLocaleDateString()}
                                                                                                            </td>
                                                                                                            <td className="px-6 py-2 text-sm text-gray-500 whitespace-nowrap">
                                                                                                                {formatCurrency(
                                                                                                                    driverPayment.amount,
                                                                                                                )}
                                                                                                            </td>
                                                                                                            <td className="px-6 py-2 text-sm text-gray-500 whitespace-nowrap">
                                                                                                                {driverPayment.isBatchPayment
                                                                                                                    ? 'Yes'
                                                                                                                    : 'No'}
                                                                                                            </td>
                                                                                                            <td className="px-6 py-2 text-sm font-medium text-right whitespace-nowrap">
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                                                                                    onClick={(
                                                                                                                        e,
                                                                                                                    ) => {
                                                                                                                        e.stopPropagation();
                                                                                                                        setPaymentToDelete(
                                                                                                                            driverPayment,
                                                                                                                        );
                                                                                                                        setConfirmOpen(
                                                                                                                            true,
                                                                                                                        );
                                                                                                                    }}
                                                                                                                    disabled={
                                                                                                                        loading
                                                                                                                    }
                                                                                                                >
                                                                                                                    <TrashIcon className="flex-shrink-0 w-4 h-4 text-gray-800" />
                                                                                                                </button>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                    ),
                                                                                                )}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div>
                                                                                        <div className="flex flex-row items-stretch w-full gap-2 mt-2">
                                                                                            <div className="flex-col flex-grow">
                                                                                                <label
                                                                                                    className="block text-sm font-medium text-gray-700"
                                                                                                    htmlFor={`charge-type-${assignmentDetails.assignment.id}`}
                                                                                                >
                                                                                                    Charge Type
                                                                                                </label>
                                                                                                <select
                                                                                                    id={`charge-type-${assignmentDetails.assignment.id}`}
                                                                                                    value={
                                                                                                        assignmentDetails?.chargeType ||
                                                                                                        ''
                                                                                                    }
                                                                                                    onChange={(e) =>
                                                                                                        handleAssignmentDetailChange(
                                                                                                            assignmentDetails,
                                                                                                            'chargeType',
                                                                                                            e.target
                                                                                                                .value as ChargeType,
                                                                                                        )
                                                                                                    }
                                                                                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                                                >
                                                                                                    <option
                                                                                                        value=""
                                                                                                        disabled
                                                                                                    >
                                                                                                        Select Pay Type
                                                                                                    </option>
                                                                                                    <option
                                                                                                        value={
                                                                                                            ChargeType.PER_MILE
                                                                                                        }
                                                                                                    >
                                                                                                        Per Mile
                                                                                                    </option>
                                                                                                    <option
                                                                                                        value={
                                                                                                            ChargeType.PER_HOUR
                                                                                                        }
                                                                                                    >
                                                                                                        Per Hour
                                                                                                    </option>
                                                                                                    <option
                                                                                                        value={
                                                                                                            ChargeType.FIXED_PAY
                                                                                                        }
                                                                                                    >
                                                                                                        Fixed Pay
                                                                                                    </option>
                                                                                                    <option
                                                                                                        value={
                                                                                                            ChargeType.PERCENTAGE_OF_LOAD
                                                                                                        }
                                                                                                    >
                                                                                                        Percentage of
                                                                                                        Load
                                                                                                    </option>
                                                                                                </select>
                                                                                            </div>
                                                                                            <div className="flex-col flex-grow">
                                                                                                <label
                                                                                                    className="block text-sm font-medium text-gray-700"
                                                                                                    htmlFor={`charge-value-${assignmentDetails.assignment.id}`}
                                                                                                >
                                                                                                    Charge Value
                                                                                                </label>
                                                                                                <input
                                                                                                    id={`charge-value-${assignmentDetails.assignment.id}`}
                                                                                                    type="number"
                                                                                                    value={
                                                                                                        assignmentDetails?.chargeValue ||
                                                                                                        ''
                                                                                                    }
                                                                                                    onChange={(e) =>
                                                                                                        handleAssignmentDetailChange(
                                                                                                            assignmentDetails,
                                                                                                            'chargeValue',
                                                                                                            Number(
                                                                                                                e.target
                                                                                                                    .value,
                                                                                                            ),
                                                                                                        )
                                                                                                    }
                                                                                                    placeholder="Charge Value"
                                                                                                    step="any"
                                                                                                    min="0"
                                                                                                    max={
                                                                                                        assignmentDetails?.chargeType ===
                                                                                                        ChargeType.PERCENTAGE_OF_LOAD
                                                                                                            ? 100
                                                                                                            : undefined
                                                                                                    }
                                                                                                    onWheel={(e) =>
                                                                                                        e.currentTarget.blur()
                                                                                                    }
                                                                                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                        {assignmentDetails?.chargeType ===
                                                                                            ChargeType.PER_MILE && (
                                                                                            <div className="mt-4">
                                                                                                <label
                                                                                                    className="block text-sm font-medium text-gray-700"
                                                                                                    htmlFor={`billed-distance-${assignmentDetails.assignment.id}`}
                                                                                                >
                                                                                                    Billed Distance
                                                                                                    (Miles)
                                                                                                </label>
                                                                                                <div className="flex mt-1 rounded-md shadow-sm">
                                                                                                    <input
                                                                                                        id={`billed-distance-${assignmentDetails.assignment.id}`}
                                                                                                        type="number"
                                                                                                        value={
                                                                                                            assignmentDetails?.billedDistanceMiles ||
                                                                                                            ''
                                                                                                        }
                                                                                                        onChange={(e) =>
                                                                                                            handleAssignmentDetailChange(
                                                                                                                assignmentDetails,
                                                                                                                'billedDistanceMiles',
                                                                                                                Number(
                                                                                                                    e
                                                                                                                        .target
                                                                                                                        .value,
                                                                                                                ),
                                                                                                            )
                                                                                                        }
                                                                                                        placeholder="Billed Distance"
                                                                                                        step="any"
                                                                                                        min="0"
                                                                                                        onWheel={(e) =>
                                                                                                            e.currentTarget.blur()
                                                                                                        }
                                                                                                        className="block w-full border-gray-300 rounded-none shadow-sm focus-within:z-10 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                                                    />
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() =>
                                                                                                            resetFieldToAssignmentValue(
                                                                                                                assignmentDetails,
                                                                                                                'billedDistanceMiles',
                                                                                                            )
                                                                                                        }
                                                                                                        className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                                                                    >
                                                                                                        <span>
                                                                                                            Reset
                                                                                                        </span>
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                        {assignmentDetails?.chargeType ===
                                                                                            ChargeType.PER_HOUR && (
                                                                                            <div className="mt-4">
                                                                                                <label
                                                                                                    className="block text-sm font-medium text-gray-700"
                                                                                                    htmlFor={`billed-duration-${assignmentDetails.assignment.id}`}
                                                                                                >
                                                                                                    Billed Duration
                                                                                                    (Hours)
                                                                                                </label>
                                                                                                <div className="flex mt-1 rounded-md shadow-sm">
                                                                                                    <input
                                                                                                        id={`billed-duration-${assignmentDetails.assignment.id}`}
                                                                                                        type="number"
                                                                                                        value={
                                                                                                            assignmentDetails?.billedDurationHours ||
                                                                                                            ''
                                                                                                        }
                                                                                                        onChange={(e) =>
                                                                                                            handleAssignmentDetailChange(
                                                                                                                assignmentDetails,
                                                                                                                'billedDurationHours',
                                                                                                                Number(
                                                                                                                    e
                                                                                                                        .target
                                                                                                                        .value,
                                                                                                                ),
                                                                                                            )
                                                                                                        }
                                                                                                        placeholder="Billed Duration"
                                                                                                        step="any"
                                                                                                        min="0"
                                                                                                        onWheel={(e) =>
                                                                                                            e.currentTarget.blur()
                                                                                                        }
                                                                                                        className="block w-full border-gray-300 rounded-none shadow-sm focus-within:z-10 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                                                    />
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() =>
                                                                                                            resetFieldToAssignmentValue(
                                                                                                                assignmentDetails,
                                                                                                                'billedDurationHours',
                                                                                                            )
                                                                                                        }
                                                                                                        className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                                                                    >
                                                                                                        <span>
                                                                                                            Reset
                                                                                                        </span>
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                        {assignmentDetails?.chargeType ===
                                                                                            ChargeType.PERCENTAGE_OF_LOAD && (
                                                                                            <div className="mt-4">
                                                                                                <label
                                                                                                    className="block text-sm font-medium text-gray-700"
                                                                                                    htmlFor={`billed-load-rate-${assignmentDetails.assignment.id}`}
                                                                                                >
                                                                                                    Billed Load Rate
                                                                                                </label>
                                                                                                <div className="flex mt-1 rounded-md shadow-sm">
                                                                                                    <input
                                                                                                        id={`billed-load-rate-${assignmentDetails.assignment.id}`}
                                                                                                        type="number"
                                                                                                        value={
                                                                                                            assignmentDetails?.billedLoadRate ||
                                                                                                            ''
                                                                                                        }
                                                                                                        onChange={(e) =>
                                                                                                            handleAssignmentDetailChange(
                                                                                                                assignmentDetails,
                                                                                                                'billedLoadRate',
                                                                                                                Number(
                                                                                                                    e
                                                                                                                        .target
                                                                                                                        .value,
                                                                                                                ),
                                                                                                            )
                                                                                                        }
                                                                                                        placeholder="Billed Load Rate"
                                                                                                        step="any"
                                                                                                        min="0"
                                                                                                        onWheel={(e) =>
                                                                                                            e.currentTarget.blur()
                                                                                                        }
                                                                                                        className="block w-full border-gray-300 rounded-none shadow-sm focus-within:z-10 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                                                    />
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() =>
                                                                                                            resetFieldToAssignmentValue(
                                                                                                                assignmentDetails,
                                                                                                                'billedLoadRate',
                                                                                                            )
                                                                                                        }
                                                                                                        className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                                                                    >
                                                                                                        <span>
                                                                                                            Reset
                                                                                                        </span>
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ),
                                                                )}
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
                                                                                    amounts[driverId]?.toString() || ''
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
                                                                            (assignmentDetails) =>
                                                                                assignmentDetails.assignment
                                                                                    .assignmentPayments.length > 0,
                                                                        ) && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setToFullDue(driverId)}
                                                                                className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                                            >
                                                                                <span>Full Due</span>
                                                                            </button>
                                                                        )}
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
