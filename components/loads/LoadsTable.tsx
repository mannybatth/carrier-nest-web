import { useRouter } from 'next/router';
import React from 'react';
import { ExpandedLoad, Sort } from '../../interfaces/models';
import Table from '../Table';

type Props = {
    loads: ExpandedLoad[];
    changeSort: (sort: Sort) => void;
    deleteLoad: (id: number) => void;
};

const LoadsTable: React.FC<Props> = ({ loads, changeSort, deleteLoad }: Props) => {
    const router = useRouter();

    return (
        <Table
            headers={[
                { key: 'refNum', title: 'Reference #' },
                { key: 'customer.name', title: 'Customer' },
                { key: 'status', title: 'Status' },
                { key: 'shipper.date', title: 'Pickup' },
                { key: 'receiver.date', title: 'Drop Off' },
                { key: 'shipper.city', title: 'From' },
                { key: 'receiver.city', title: 'To' },
            ]}
            rows={loads.map((load) => ({
                id: load.id,
                items: [
                    { value: load.refNum },
                    { value: load.customer.name },
                    {
                        node: (
                            <div className="text-xs leading-5 text-gray-900">
                                <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 uppercase bg-green-100 rounded-full">
                                    {load.status}
                                </span>
                            </div>
                        ),
                    },
                    {
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
                    },
                    {
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
                    },
                    {
                        node: (
                            <div className="text-xs leading-5 text-gray-900">
                                {load.shipper.city}, {load.shipper.state}
                            </div>
                        ),
                    },
                    {
                        node: (
                            <div className="text-xs leading-5 text-gray-900">
                                {load.receiver.city}, {load.receiver.state}
                            </div>
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
            }))}
            onRowClick={(id, index) => {
                router.push(`/loads/${id}`);
            }}
            changeSort={changeSort}
        />
    );
};

export default LoadsTable;
