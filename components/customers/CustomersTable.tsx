import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { ExpandedCustomer } from '../../interfaces/models';
import { Sort } from '../../interfaces/table';
import Table from '../Table';

type Props = {
    customers: ExpandedCustomer[];
    sort: Sort;
    loading: boolean;
    changeSort: (sort: Sort) => void;
    deleteCustomer: (id: number) => void;
};

const CustomersTable: React.FC<Props> = ({ customers, sort, loading, changeSort, deleteCustomer }) => {
    const router = useRouter();

    return (
        <Table
            loading={loading}
            headers={[
                { key: 'name', title: 'Name' },
                { key: 'contactEmail', title: 'Email' },
                { key: 'city', title: 'City' },
                { key: 'state', title: 'State' },
            ]}
            rows={customers.map((customer) => ({
                id: customer.id,
                items: [
                    { value: customer.name },
                    { value: customer.contactEmail },
                    { value: customer.city },
                    { value: customer.state },
                ],
                menuItems: [
                    {
                        title: 'Edit',
                        onClick: () => {
                            router.push(`/customers/edit/${customer.id}`);
                        },
                    },
                    {
                        title: 'Delete',
                        onClick: () => deleteCustomer(customer.id),
                    },
                ],
            }))}
            onRowClick={(id, index) => {
                router.push(`/customers/${id}`);
            }}
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
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No customers to show on this page.</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new customer.</p>
                    <div className="mt-6">
                        <Link href="/customers/create">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                + Create Customer
                            </button>
                        </Link>
                    </div>
                </div>
            }
        />
    );
};

export default CustomersTable;

type CustomersTableSkeletonProps = {
    limit: number;
};
export const CustomersTableSkeleton: React.FC<CustomersTableSkeletonProps> = ({ limit }) => {
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
