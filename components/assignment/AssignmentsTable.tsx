import React from 'react';
import Link from 'next/link';
import { ExpandedDriverAssignment } from '../../interfaces/models';
import { Sort } from '../../interfaces/table';
import Table from '../Table';
import { StopCircleIcon } from '@heroicons/react/24/outline';
import { Prisma } from '@prisma/client';

interface AssignmentsTableProps {
    assignments: ExpandedDriverAssignment[];
    sort: Sort;
    changeSort: (sort: Sort) => void;
    loading: boolean;
    onRowClick?: (assignment: ExpandedDriverAssignment) => void;
}

const getHumanReadableCharge = (assignment: ExpandedDriverAssignment) => {
    const { chargeType, chargeValue, routeLeg, load } = assignment;
    switch (chargeType) {
        case 'PER_MILE':
            const distanceInMiles = new Prisma.Decimal(routeLeg?.routeLegDistance ?? 0).div(1609.34).toFixed(2);
            return `${chargeValue} per mile (Total Distance: ${distanceInMiles} miles)`;
        case 'PER_HOUR':
            const durationInHours = new Prisma.Decimal(routeLeg?.routeLegDuration ?? 0).div(3600).toFixed(2);
            return `${chargeValue} per hour (Total Time: ${durationInHours} hours)`;
        case 'FIXED_PAY':
            return `Fixed pay of ${chargeValue}`;
        case 'PERCENTAGE_OF_LOAD':
            const loadRate = new Prisma.Decimal(load?.rate ?? 0).toFixed(2);
            return `${chargeValue}% of load (Load Rate: $${loadRate})`;
        default:
            return `${chargeValue}`;
    }
};

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

const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const getPayStatus = (assignment: ExpandedDriverAssignment) => {
    const totalPay = calculateDriverPay(assignment);
    const totalPaid =
        assignment.payments?.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0)) ??
        new Prisma.Decimal(0);

    if (totalPaid.gte(totalPay)) {
        return 'paid';
    } else if (totalPaid.gt(0)) {
        return 'partially paid';
    } else {
        return 'not paid';
    }
};

const AssignmentsTable: React.FC<AssignmentsTableProps> = ({ assignments, sort, changeSort, loading, onRowClick }) => {
    const headers = [
        { key: 'driver.name', title: 'Driver' },
        { key: 'load.refNum', title: 'Load/Order #' },
        { key: 'chargeValue', title: 'Pay Amount' },
        { key: 'payStatus', title: 'Pay Status' },
        { key: 'assignedAt', title: 'Assigned At' },
    ];

    return (
        <Table
            loading={loading}
            headers={headers}
            rows={assignments.map((assignment) => {
                const payStatus = getPayStatus(assignment);

                return {
                    id: assignment.id,
                    items: [
                        {
                            node: (
                                <Link href={`/drivers/${assignment.driver.id}`} onClick={(e) => e.stopPropagation()}>
                                    {assignment.driver.name}
                                </Link>
                            ),
                        },
                        {
                            node: (
                                <Link href={`/loads/${assignment.loadId}`} onClick={(e) => e.stopPropagation()}>
                                    {assignment.load?.refNum}
                                </Link>
                            ),
                        },
                        {
                            node: (
                                <span
                                    data-tooltip-id="tooltip"
                                    data-tooltip-content={getHumanReadableCharge(assignment)}
                                    className="text-sm leading-5 text-gray-900"
                                >
                                    {formatCurrency(calculateDriverPay(assignment).toNumber())}
                                </span>
                            ),
                        },
                        {
                            node: <PayStatusBadge status={payStatus} />,
                        },
                        { value: new Date(assignment.assignedAt).toLocaleString() },
                    ],
                };
            })}
            onRowClick={(id, index) => {
                const clickedAssignment = assignments.find((assignment) => assignment.id === id);
                if (onRowClick && clickedAssignment) {
                    onRowClick(clickedAssignment);
                }
            }}
            sort={sort}
            changeSort={changeSort}
            emptyState={
                <div className="my-5 text-center">
                    <StopCircleIcon className="w-12 h-12 mx-auto text-gray-400" aria-hidden="true" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments to show on this page.</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating new assignments.</p>
                    <div className="mt-6">
                        <Link href="/assignments/create">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                + Create Assignment
                            </button>
                        </Link>
                    </div>
                </div>
            }
        />
    );
};

const getStatusStyles = (status: string) => {
    switch (status) {
        case 'paid':
            return { textColor: 'text-green-800', bgColor: 'bg-green-100' };
        case 'partially paid':
            return { textColor: 'text-yellow-800', bgColor: 'bg-yellow-100' };
        case 'not paid':
            return { textColor: 'text-red-800', bgColor: 'bg-red-100' };
        default:
            return { textColor: 'text-gray-800', bgColor: 'bg-gray-100' };
    }
};

const PayStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const { textColor, bgColor } = getStatusStyles(status);
    return (
        <span
            className={`inline-flex px-2 text-xs font-semibold leading-5 ${textColor} uppercase ${bgColor} rounded-full whitespace-nowrap`}
        >
            {status}
        </span>
    );
};

export default AssignmentsTable;
