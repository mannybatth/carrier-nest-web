import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/outline';
import classNames from 'classnames';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React, { Fragment } from 'react';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import LoadsTable from '../../components/loads/LoadsTable';
import { notify } from '../../components/Notification';
import { ComponentWithAuth } from '../../interfaces/auth';
import { ExpandedCustomer } from '../../interfaces/models';
import { deleteCustomerById, getCustomerByIdWithLoads } from '../../lib/rest/customer';

type ActionsDropdownProps = {
    customer: ExpandedCustomer;
    deleteCustomer: (id: number) => void;
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({ customer, deleteCustomer }: ActionsDropdownProps) => {
    const router = useRouter();

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500">
                    Actions
                    <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" aria-hidden="true" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/customers/edit/${customer.id}`);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Edit
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteCustomer(customer.id);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Delete
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export async function getServerSideProps(context: NextPageContext) {
    const customer = await getCustomerByIdWithLoads(Number(context.query.id));
    return {
        props: {
            customer,
        },
    };
}

type Props = {
    customer: ExpandedCustomer;
};

const CustomerDetailsPage: ComponentWithAuth<Props> = ({ customer }: Props) => {
    const router = useRouter();

    const deleteCustomer = async (id: number) => {
        await deleteCustomerById(id);

        notify({ title: 'Customer deleted', message: 'Customer deleted successfully' });

        router.push('/customers');
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">{customer.name}</h1>
                    <ActionsDropdown customer={customer} deleteCustomer={deleteCustomer}></ActionsDropdown>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Customers',
                            href: '/customers',
                        },
                        {
                            label: `${customer.name}`,
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">{customer.name}</h1>
                        <ActionsDropdown customer={customer} deleteCustomer={deleteCustomer}></ActionsDropdown>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <dl className="grid grid-cols-4 gap-x-4 gap-y-8">
                        <div className="col-span-4 sm:col-span-2 lg:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Contact Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{customer.contactEmail}</dd>
                        </div>
                        <div className="col-span-4 sm:col-span-2 lg:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Billing Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{customer.billingEmail}</dd>
                        </div>
                        <div className="col-span-4 sm:col-span-2 lg:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Payment Status Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{customer.paymentStatusEmail}</dd>
                        </div>
                        <div className="col-span-4 sm:col-span-2 lg:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Address</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <div>{customer.street}</div>
                                <div>
                                    {customer.city && customer.state
                                        ? `${customer.city}, ${customer.state}`
                                        : `${customer.city} ${customer.state}`}
                                    {customer.zip}
                                </div>
                            </dd>
                        </div>
                        <div className="col-span-4">
                            <LoadsTable loads={customer.loads} changeSort={() => {}} deleteLoad={() => {}}></LoadsTable>
                        </div>
                    </dl>
                </div>
            </div>
        </Layout>
    );
};

CustomerDetailsPage.authenticationEnabled = true;

export default CustomerDetailsPage;
