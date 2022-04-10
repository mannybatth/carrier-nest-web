import { useRouter } from 'next/router';
import React from 'react';
import { ExpandedLoad, Sort } from '../../interfaces/models';
import { loadStatus } from '../../lib/load/load-utils';
import Table from '../Table';

type Props = {
    loads: ExpandedLoad[];
    headers?: string[];
    sort: Sort;
    changeSort: (sort: Sort) => void;
    deleteLoad: (id: number) => void;
};

const defaultHeaders = [
    'refNum',
    'customer.name',
    'status',
    'shipper.date',
    'receiver.date',
    'shipper.city',
    'receiver.city',
];

export const LoadsTable: React.FC<Props> = ({ loads, changeSort, sort, headers = defaultHeaders, deleteLoad }) => {
    const router = useRouter();

    return (
        <Table
            headers={[
                ...[headers.includes('refNum') ? { key: 'refNum', title: 'Reference #' } : null],
                ...[headers.includes('customer.name') ? { key: 'customer.name', title: 'Customer' } : null],
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
                    ...[
                        headers.includes('status')
                            ? {
                                  node: (
                                      <div className="text-xs leading-5 text-gray-900">
                                          <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 uppercase bg-green-100 rounded-full">
                                              {loadStatus(load)}
                                          </span>
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
                    ...[headers.includes('rate') ? { value: `$${load.rate}` } : null],
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
            onRowClick={(id, index) => {
                router.push(`/loads/${id}`);
            }}
            sort={sort}
            changeSort={changeSort}
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
