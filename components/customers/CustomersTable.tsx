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
