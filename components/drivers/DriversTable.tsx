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
        />
    );
};

export default DriversTable;
