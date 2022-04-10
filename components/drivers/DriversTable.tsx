import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { ExpandedDriver } from '../../interfaces/models';
import { Sort } from '../../interfaces/table';
import Table from '../Table';

type Props = {
    drivers: ExpandedDriver[];
    sort: Sort;
    loading: boolean;
    changeSort: (sort: Sort) => void;
    deleteDriver: (id: number) => void;
};

const DriversTable: React.FC<Props> = ({ drivers, sort, loading, changeSort, deleteDriver }) => {
    const router = useRouter();

    return (
        <Table
            loading={loading}
            headers={[
                { key: 'name', title: 'Name' },
                { key: 'email', title: 'Email' },
                { key: 'phone', title: 'Phone' },
            ]}
            rows={drivers.map((driver) => ({
                id: driver.id,
                items: [{ value: driver.name }, { value: driver.email }, { value: driver.phone }],
                menuItems: [
                    {
                        title: 'Edit',
                        onClick: () => {
                            router.push(`/drivers/edit/${driver.id}`);
                        },
                    },
                    {
                        title: 'Delete',
                        onClick: () => deleteDriver(driver.id),
                    },
                ],
            }))}
            onRowClick={(id, index) => {
                router.push(`/drivers/${id}`);
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
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                        />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No drivers to show on this page.</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new driver.</p>
                    <div className="mt-6">
                        <Link href="/drivers/create">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                + Create Driver
                            </button>
                        </Link>
                    </div>
                </div>
            }
        />
    );
};

export default DriversTable;
