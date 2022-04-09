import { useRouter } from 'next/router';
import React from 'react';
import { ExpandedCustomer, Sort } from '../../interfaces/models';
import Table from '../Table';

type Props = {
    customers: ExpandedCustomer[];
    sort: Sort;
    changeSort: (sort: Sort) => void;
    deleteCustomer: (id: number) => void;
};

const CustomersTable: React.FC<Props> = ({ customers, sort, changeSort, deleteCustomer }) => {
    const router = useRouter();

    return (
        <Table
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
