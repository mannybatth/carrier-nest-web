import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { formatValue } from 'react-currency-input-field';
import { ExpandedLoad } from '../../interfaces/models';
import { Sort } from '../../interfaces/table';
import Table from '../Table';
import LoadStatusBadge from './LoadStatusBadge';

type Props = {
    loads: ExpandedLoad[];
    headers?: string[];
    sort: Sort;
    loading: boolean;
    changeSort: (sort: Sort) => void;
    deleteLoad: (id: string) => void;
};

const defaultHeaders = [
    'refNum',
    'customer.name',
    'loadNum',
    'status',
    'shipper.date',
    'receiver.date',
    'shipper.city',
    'receiver.city',
];

export const LoadsTable: React.FC<Props> = ({
    loads,
    changeSort,
    sort,
    loading,
    headers = defaultHeaders,
    deleteLoad,
}) => {
    const router = useRouter();

    return (
        <Table
            loading={loading}
            headers={[
                ...[headers.includes('refNum') ? { key: 'refNum', title: 'Order #' } : null],
                ...[headers.includes('customer.name') ? { key: 'customer.name', title: 'Customer' } : null],
                ...[headers.includes('loadNum') ? { key: 'loadNum', title: 'Load #' } : null],
                ...[headers.includes('status') ? { key: 'status', title: 'Status' } : null],
                ...[headers.includes('shipper.date') ? { key: 'shipper.date', title: 'Pickup' } : null],
                ...[headers.includes('receiver.date') ? { key: 'receiver.date', title: 'Drop Off' } : null],
                ...[headers.includes('shipper.city') ? { key: 'shipper.city', title: 'From' } : null],
                ...[headers.includes('receiver.city') ? { key: 'receiver.city', title: 'To' } : null],
                ...[headers.includes('rate') ? { key: 'rate', title: 'Rate' } : null],
            ].filter((x) => x)}
            rows={loads.map((load) => ({
                id: load.id,
                items: [
                    ...[headers.includes('refNum') ? { value: load.refNum } : null],
                    ...[headers.includes('customer.name') ? { value: load.customer?.name } : null],
                    ...[headers.includes('loadNum') ? { value: load.loadNum } : null],
                    ...[
                        headers.includes('status')
                            ? {
                                  node: (
                                      <div className="text-xs leading-5 text-gray-900 whitespace-nowrap">
                                          <LoadStatusBadge load={load} />
                                      </div>
                                  ),
                              }
                            : null,
                    ],
                    ...[
                        headers.includes('shipper.date')
                            ? {
                                  node: (
                                      <div className="text-xs leading-5 text-gray-900">
                                          <div>
                                              {new Intl.DateTimeFormat('en-US', {
                                                  year: '2-digit',
                                                  month: 'short',
                                                  day: '2-digit',
                                              }).format(new Date(load.shipper.date))}
                                          </div>
                                          <div>{load.shipper.time}</div>
                                      </div>
                                  ),
                              }
                            : null,
                    ],
                    ...[
                        headers.includes('receiver.date')
                            ? {
                                  node: (
                                      <div className="text-xs leading-5 text-gray-900">
                                          <div>
                                              {new Intl.DateTimeFormat('en-US', {
                                                  year: '2-digit',
                                                  month: 'short',
                                                  day: '2-digit',
                                              }).format(new Date(load.receiver.date))}
                                          </div>
                                          <div>{load.receiver.time}</div>
                                      </div>
                                  ),
                              }
                            : null,
                    ],
                    ...[
                        headers.includes('shipper.city')
                            ? {
                                  node: (
                                      <div className="text-xs leading-5 text-gray-900">
                                          {load.shipper.city}, {load.shipper.state}
                                      </div>
                                  ),
                              }
                            : null,
                    ],
                    ...[
                        headers.includes('receiver.city')
                            ? {
                                  node: (
                                      <div className="text-xs leading-5 text-gray-900">
                                          {load.receiver.city}, {load.receiver.state}
                                      </div>
                                  ),
                              }
                            : null,
                    ],
                    ...[
                        headers.includes('rate')
                            ? {
                                  node: (
                                      <div className="text-sm leading-5 text-gray-900">
                                          {formatValue({
                                              value: load.rate.toString(),
                                              groupSeparator: ',',
                                              decimalSeparator: '.',
                                              prefix: '$',
                                              decimalScale: 2,
                                          })}
                                      </div>
                                  ),
                              }
                            : null,
                    ],
                ].filter((x) => x),
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
            }))}
            rowLink={(id) => `/loads/${id}`}
            sort={sort}
            changeSort={changeSort}
            emptyState={
                <div className="my-5 text-center">
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

type LoadsTableSkeletonProps = {
    limit: number;
};
export const LoadsTableSkeleton: React.FC<LoadsTableSkeletonProps> = ({ limit }) => {
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
