'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import type React from 'react';
import type { ExpandedLoad } from '../../interfaces/models';
import type { Sort } from '../../interfaces/table';
import Table from '../Table';
import LoadStatusBadge from './LoadStatusBadge';
import { MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';
import type { ParsedUrlQuery, ParsedUrlQueryInput } from 'querystring';
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/outline';

type Props = {
    loads: ExpandedLoad[];
    headers?: string[];
    sort: Sort;
    loading: boolean;
    changeSort: (sort: Sort) => void;
    deleteLoad: (id: string) => void;
    limit?: number;
    offset?: number;
    reloadLoads?: (params: any) => void;
};

const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
        year: '2-digit',
        month: 'short',
        day: '2-digit',
    }).format(new Date(dateString));
};

// Helper function for query params
export const queryFromSort = (
    sort: Sort,
    routerQuery: ParsedUrlQuery,
    sortByKey = 'sortBy',
    sortOrderKey = 'sortOrder',
): ParsedUrlQueryInput => {
    const query = {
        ...routerQuery,
        ...(sort?.key ? { [sortByKey]: sort.key, [sortOrderKey]: sort.order } : {}),
    };
    if (!sort) {
        delete query[sortByKey];
        delete query[sortOrderKey];
    }
    return query;
};

export const LoadsTableCompact: React.FC<Props> = ({
    loads,
    changeSort,
    sort,
    loading,
    deleteLoad,
    headers = [
        'refNum',
        'customer.name',
        'loadNum',
        'status',
        'shipper.date',
        'receiver.date',
        'shipper.city',
        'receiver.city',
        'rate',
    ],
    limit,
    offset,
    reloadLoads,
}) => {
    const router = useRouter();

    return (
        <Table
            loading={loading}
            headers={[
                { key: 'load', title: 'Load', disableSort: true },
                { key: 'status', title: 'Status', disableSort: true },
                { key: 'pickup', title: 'Pickup', disableSort: true },
                { key: 'delivery', title: 'Delivery', disableSort: true },
                { key: 'distance', title: 'Distance', disableSort: true },
                { key: 'driver', title: 'Driver', disableSort: true },
            ]}
            rows={loads.map((load) => {
                // Calculate if shipper/receiver/loadstop dates are in the past
                const allDates = [
                    load.shipper.date,
                    load.receiver.date,
                    ...(load.stops?.map((stop) => stop.date) || []),
                ];

                const now = new Date();
                now.setHours(0, 0, 0, 0); // Set current time to midnight

                const allDatesInPast = allDates.every((dateStr) => {
                    const date = new Date(dateStr);
                    date.setHours(0, 0, 0, 0); // Set stop date to midnight
                    return date < now;
                });

                return {
                    id: load.id,
                    customRowClass: cn(
                        load.driverAssignments?.length === 0 && 'bg-red-50',
                        allDatesInPast && 'bg-red-300/50 animate-none',
                    ),
                    items: [
                        {
                            node: (
                                <div className="relative flex flex-col ">
                                    <div className="  text-xs text-gray-700  uppercase font-medium">
                                        Order# {load.refNum}
                                    </div>
                                    <div className="text-xs text-gray-500">Load# {load.loadNum}</div>
                                    <div className="text-base font-semibold text-gray-900  whitespace-nowrap truncate max-w-72">
                                        {load.customer.name.toUpperCase()}
                                    </div>
                                    <div className="text-green-600 font-semibold ">
                                        {load?.rate ? `$${load.rate}` : 'N/A'}
                                    </div>
                                </div>
                            ),
                        },
                        {
                            node: <LoadStatusBadge load={load} />,
                        },
                        {
                            node: (
                                <div className="flex items-start space-x-2">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                                            <TruckIcon className="w-3 h-3 text-green-800" aria-hidden="true" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {formatDate(load.shipper.date.toString())}
                                        </div>
                                        <div className="text-gray-500">{load.shipper.time}</div>
                                        <div className="text-gray-500 whitespace-nowrap truncate max-w-52">
                                            {load.shipper.name.toUpperCase()}
                                        </div>
                                        <div className="text-gray-500 capitalize">
                                            {load.shipper.city.toLowerCase()}, {load.shipper.state.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            node: (
                                <div className="flex items-start space-x-2">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <div className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                                            <MapPinIcon className="w-3 h-3 text-red-800" aria-hidden="true" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {formatDate(load.receiver.date.toString())}
                                        </div>
                                        <div className="text-gray-500">{load.receiver.time}</div>
                                        <div className="text-gray-500  whitespace-nowrap truncate max-w-52">
                                            {load.receiver.name.toUpperCase()}
                                        </div>
                                        <div className="text-gray-500 capitalize">
                                            {load.receiver.city.toLocaleLowerCase()},{' '}
                                            {load.receiver.state.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            node: (
                                <div>
                                    {load.routeDistanceMiles ? (
                                        <div className="text-xs text-gray-600 font-medium whitespace-nowrap">
                                            {isNaN(Number(load.routeDistanceMiles))
                                                ? '0'
                                                : Number(load.routeDistanceMiles).toFixed(0)}{' '}
                                            mi
                                        </div>
                                    ) : (
                                        'N/A'
                                    )}
                                    {load.routeDurationHours && (
                                        <div className="text-xs text-gray-400 whitespace-nowrap">
                                            {Math.floor(Number(load.routeDurationHours))}h{' '}
                                            {Math.round((Number(load.routeDurationHours) % 1) * 60)}m
                                        </div>
                                    )}
                                </div>
                            ),
                        },
                        {
                            node:
                                load.driverAssignments?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {Array.from(
                                            new Map(
                                                load.driverAssignments.map((assignment) => [
                                                    assignment.driver.id,
                                                    assignment,
                                                ]),
                                            ).values(),
                                        ).map((assignment, index, uniqueAssignments) => (
                                            <Link
                                                key={`${assignment.driver.id}-${index}`}
                                                href={`/drivers/${assignment.driver.id}`}
                                                className="font-medium cursor-pointer hover:underline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                }}
                                            >
                                                {assignment.driver?.name}
                                                {index < uniqueAssignments.length - 1 ? ', ' : ''}
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-gray-400">No driver assigned</span>
                                ),
                        },
                    ],
                    menuItems: [
                        {
                            title: 'Edit',
                            onClick: () => {
                                router.push(`/loads/edit/${load.id}`);
                            },
                        },
                        {
                            title: 'Delete',
                            onClick: () => deleteLoad(load.id),
                        },
                    ],
                };
            })}
            rowLink={(id) => `/loads/${id}`}
            sort={sort}
            changeSort={changeSort}
            emptyState={
                <div className="my-0 text-center border border-gray-200 rounded-lg shadow-sm p-6 bg-white">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-12 h-12 mx-auto text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                        />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No loads to show on this page.</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new load.</p>
                    <div className="mt-6">
                        <Link href="/loads/create">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                + Create Load
                            </button>
                        </Link>
                    </div>
                </div>
            }
        />
    );
};

// Helper function for class names
function cn(...classes: (string | undefined | boolean)[]) {
    return classes.filter(Boolean).join(' ');
}

type LoadsTableSkeletonProps = {
    limit: number;
};

const LoadsTableSkeleton: React.FC<LoadsTableSkeletonProps> = ({ limit }) => {
    return (
        <div className="w-full">
            <div className="flex space-x-4 animate-pulse">
                <div className="flex-1">
                    <div className="h-10 rounded bg-slate-200"></div>
                    <div className="divide-y divide-gray-200">
                        {[...Array(limit)].map((_, i) => (
                            <div key={i} className="grid items-center grid-cols-12 gap-4 py-3">
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 rounded bg-slate-200"></div>
                                    <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 rounded bg-slate-200"></div>
                                    <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                                </div>
                                <div className="col-span-1 space-y-2">
                                    <div className="h-4 rounded bg-slate-200"></div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 rounded bg-slate-200"></div>
                                    <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                                </div>
                                <div className="col-span-1 space-y-2">
                                    <div className="h-2 rounded bg-slate-200"></div>
                                    <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 rounded bg-slate-200"></div>
                                    <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 rounded bg-slate-200"></div>
                                    <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
