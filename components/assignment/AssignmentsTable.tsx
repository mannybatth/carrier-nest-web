import React from 'react';
import Link from 'next/link';
import { ExpandedDriverAssignment } from '../../interfaces/models';
import { Sort } from '../../interfaces/table';
import Table from '../Table';
import { ChevronDoubleRightIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Prisma } from '@prisma/client';
import { calculateDriverPay } from '../../lib/helpers/calculateDriverPay';

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

const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const calculateAssignmentTotalPay = (assignment: ExpandedDriverAssignment) => {
    return calculateDriverPay({
        chargeType: assignment.chargeType,
        chargeValue: assignment.chargeValue,
        routeLegDistance: assignment.routeLeg?.routeLegDistance ?? 0,
        routeLegDuration: assignment.routeLeg?.routeLegDuration ?? 0,
        loadRate: assignment.load.rate,
    });
};

const getPayStatus = (assignment: ExpandedDriverAssignment) => {
    const totalPay = calculateAssignmentTotalPay(assignment);
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
        { key: 'chargeValue', title: 'Pay Amount', disableSort: true },
        { key: 'payStatus', title: 'Pay Status', disableSort: true },
        { key: 'assignedAt', title: 'Assigned At' },
        { key: 'actions', title: ' ', disableSort: true }, // Add new column header
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
                                    {formatCurrency(calculateAssignmentTotalPay(assignment).toNumber())}
                                </span>
                            ),
                        },
                        {
                            node: <PayStatusBadge status={payStatus} />,
                        },
                        { value: new Date(assignment.assignedAt).toLocaleString() },
                        {
                            node: (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onRowClick) {
                                            onRowClick(assignment);
                                        }
                                    }}
                                    className="flex items-center h-6 px-3 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm whitespace-nowrap hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    View Payments
                                    <ChevronDoubleRightIcon className="flex-shrink-0 w-4 h-4 ml-2 -mr-1" />
                                </button>
                            ),
                        }, // Add new column with button
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
                    <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400" aria-hidden="true" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments to show on this page.</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating new assignments on loads</p>
                    <div className="mt-6">
                        <Link href="/loads">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Go to Loads Page
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
