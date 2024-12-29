import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { Sort } from '../../interfaces/table';
import Table from '../Table';
import { ExpandedEquipment } from 'interfaces/models';
import { StopCircleIcon } from '@heroicons/react/24/outline';

type Props = {
    equipments: ExpandedEquipment[];
    sort: Sort;
    loading: boolean;
    changeSort: (sort: Sort) => void;
    deleteEquipment: (id: string) => void;
};

const EquipmentsTable: React.FC<Props> = ({ equipments, sort, loading, changeSort, deleteEquipment }) => {
    const router = useRouter();

    return (
        <Table
            loading={loading}
            headers={[
                { key: 'name', title: 'Name' },
                { key: 'type', title: 'Type' },
                { key: 'drivers', title: 'Drivers' },
            ]}
            rows={equipments.map((equipment) => ({
                id: equipment.id,
                items: [
                    { value: equipment.name },
                    { value: equipment.type },
                    { value: equipment.drivers.map((driver) => driver.name).join(', ') || 'Unassigned' },
                ],
                menuItems: [
                    {
                        title: 'Edit',
                        onClick: () => {
                            router.push(`/equipments/edit/${equipment.id}`);
                        },
                    },
                    {
                        title: 'Delete',
                        onClick: () => deleteEquipment(equipment.id),
                    },
                ],
            }))}
            rowLink={(id) => `/equipments/${id}`}
            sort={sort}
            changeSort={changeSort}
            emptyState={
                <div className="my-5 text-center">
                    <StopCircleIcon className="w-12 h-12 mx-auto text-gray-400" aria-hidden="true" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No equipment to show on this page.</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating new equipment.</p>
                    <div className="mt-6">
                        <Link href="/equipments/create">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                + Create Equipment
                            </button>
                        </Link>
                    </div>
                </div>
            }
        />
    );
};

export default EquipmentsTable;
