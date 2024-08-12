import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { Sort } from '../../interfaces/table';
import Table from '../Table';
import { Location } from '@prisma/client';
import { StopCircleIcon } from '@heroicons/react/24/outline';

type Props = {
    locations: Location[];
    sort: Sort;
    loading: boolean;
    changeSort: (sort: Sort) => void;
    deleteLocation: (id: string) => void;
};

const LocationsTable: React.FC<Props> = ({ locations, sort, loading, changeSort, deleteLocation }) => {
    const router = useRouter();

    return (
        <Table
            loading={loading}
            headers={[
                { key: 'name', title: 'Name' },
                { key: 'city', title: 'City' },
                { key: 'state', title: 'State' },
            ]}
            rows={locations.map((location) => ({
                id: location.id,
                items: [{ value: location.name }, { value: location.city }, { value: location.state }],
                menuItems: [
                    {
                        title: 'Edit',
                        onClick: () => {
                            router.push(`/locations/edit/${location.id}`);
                        },
                    },
                    {
                        title: 'Delete',
                        onClick: () => deleteLocation(location.id),
                    },
                ],
            }))}
            rowLink={(id) => `/locations/${id}`}
            sort={sort}
            changeSort={changeSort}
            emptyState={
                <div className="my-5 text-center">
                    <StopCircleIcon className="w-12 h-12 mx-auto text-gray-400" aria-hidden="true" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No locations to show on this page.</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new location.</p>
                    <div className="mt-6">
                        <Link href="/locations/create">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                + Create Location
                            </button>
                        </Link>
                    </div>
                </div>
            }
        />
    );
};

export default LocationsTable;
