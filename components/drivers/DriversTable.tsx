import { getChargeTypeLabel } from 'lib/driver/driver-utils';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { ExpandedDriver } from '../../interfaces/models';
import { Sort } from '../../interfaces/table';
import Table from '../Table';
import { formatPhoneNumber } from 'lib/helpers/format';

type Props = {
    drivers: ExpandedDriver[];
    sort: Sort;
    loading: boolean;
    changeSort: (sort: Sort) => void;
    deactivateDriver: (id: string, name: string, phone: string) => void;
    activateDriver: (id: string, name: string, phone: string) => void;
};

const DriversTable: React.FC<Props> = ({ drivers, sort, loading, changeSort, deactivateDriver, activateDriver }) => {
    const router = useRouter();

    return (
        <Table
            loading={loading}
            headers={[
                { key: 'name', title: 'Name' },
                { key: 'email', title: 'Email' },
                { key: 'phone', title: 'Phone' },
                { key: 'type', title: 'Type' },
                { key: 'active', title: 'Status' },
                { key: 'defaultChargeType', title: 'Default Pay Type' },
            ]}
            rows={drivers.map((driver) => ({
                id: driver.id,
                items: [
                    { value: driver.name },
                    { value: driver.email },
                    { value: formatPhoneNumber(driver.phone) },
                    {
                        value: driver.type === 'OWNER_OPERATOR' ? 'Owner Operator' : 'Driver',
                        className: driver.type === 'OWNER_OPERATOR' ? 'text-purple-600 font-medium' : '',
                    },
                    {
                        node: (
                            <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${
                                    driver.active
                                        ? 'bg-green-100 text-green-800 ring-1 ring-green-200'
                                        : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                                }`}
                            >
                                {driver.active ? (
                                    <>
                                        <svg className="w-2.5 h-2.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        Active
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-2.5 h-2.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        Inactive
                                    </>
                                )}
                            </span>
                        ),
                    },
                    { value: getChargeTypeLabel(driver.defaultChargeType) },
                ],
                menuItems: [
                    {
                        title: 'Edit',
                        onClick: () => {
                            router.push(`/drivers/edit/${driver.id}`);
                        },
                    },
                    ...(driver.active
                        ? [
                              {
                                  title: 'Deactivate',
                                  onClick: () => deactivateDriver(driver.id, driver.name, driver.phone),
                                  className: 'text-red-600',
                              },
                          ]
                        : [
                              {
                                  title: 'Activate',
                                  onClick: () => activateDriver(driver.id, driver.name, driver.phone),
                                  className: 'text-green-600',
                              },
                          ]),
                ],
            }))}
            rowLink={(id) => `/drivers/${id}`}
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
