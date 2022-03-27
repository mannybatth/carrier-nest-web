import { Menu, Transition } from '@headlessui/react';
import {
    ChevronDownIcon,
    CurrencyDollarIcon,
    InformationCircleIcon,
    LocationMarkerIcon,
    MailIcon,
    TruckIcon,
} from '@heroicons/react/outline';
import classNames from 'classnames';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React, { Fragment, useEffect } from 'react';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import LoadsTable from '../../components/loads/LoadsTable';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedCustomer, ExpandedLoad, PaginationMetadata, Sort } from '../../interfaces/models';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { deleteCustomerById, getCustomerById } from '../../lib/rest/customer';
import { deleteLoadById, getLoadsExpanded } from '../../lib/rest/load';

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
    const { query } = context;
    const customerId = Number(query.id);
    const sort: Sort = sortFromQuery(query);

    const [customer, loadsData] = await Promise.all([
        getCustomerById(customerId),
        getLoadsExpanded({
            customerId: customerId,
            limit: Number(query.limit) || 1,
            offset: Number(query.offset) || 0,
            sort,
        }),
    ]);
    return {
        props: {
            customer: customer || null,
            loadCount: loadsData?.metadata?.total || 0,
            loads: loadsData.loads,
            metadata: loadsData.metadata,
            sort,
        },
    };
}

type Props = {
    customer: ExpandedCustomer;
    loadCount: number;
    loads: ExpandedLoad[];
    metadata: PaginationMetadata;
    sort: Sort;
};

const CustomerDetailsPage: PageWithAuth<Props> = ({
    customer,
    loads: loadsProp,
    loadCount,
    metadata: metadataProp,
    sort: sortProps,
}: Props) => {
    const [loads, setLoads] = React.useState<ExpandedLoad[]>(loadsProp);
    const [sort, setSort] = React.useState<Sort>(sortProps);
    const [metadata, setMetadata] = React.useState<PaginationMetadata>(metadataProp);
    const router = useRouter();

    useEffect(() => {
        setLoads(loadsProp);
        setMetadata(metadataProp);
    }, [loadsProp, metadataProp]);

    useEffect(() => {
        setSort(sortProps);
    }, [sortProps]);

    const changeSort = (sort: Sort) => {
        router.push({
            pathname: router.pathname,
            query: queryFromSort(sort, router.query),
        });
    };

    const reloadLoads = async () => {
        const { loads, metadata: metadataResponse } = await getLoadsExpanded({
            customerId: customer.id,
            limit: metadata.currentLimit,
            offset: metadata.currentOffset,
            sort,
        });
        setLoads(loads);
        setMetadata(metadataResponse);
    };

    const previousPage = async () => {
        router.push({
            pathname: router.pathname,
            query: queryFromPagination(metadata.prev, router.query),
        });
    };

    const nextPage = async () => {
        router.push({
            pathname: router.pathname,
            query: queryFromPagination(metadata.next, router.query),
        });
    };

    const deleteLoad = async (id: number) => {
        await deleteLoadById(id);

        notify({ title: 'Load deleted', message: 'Load deleted successfully' });
        reloadLoads();
    };

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
                    <div className="grid grid-cols-12 gap-5">
                        <div className="col-span-12">
                            <div role="list" className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
                                <div className="flex p-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ">
                                        <TruckIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Total Loads</p>
                                        <p className="text-sm text-gray-500">{loadCount}</p>
                                    </div>
                                </div>
                                <div className="flex p-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ">
                                        <MailIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Contact Email</p>
                                        <p className="text-sm text-gray-500">{customer.contactEmail}</p>
                                    </div>
                                </div>
                                <div className="flex p-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                                        <CurrencyDollarIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Billing Email</p>
                                        <p className="text-sm text-gray-500">{customer.billingEmail}</p>
                                    </div>
                                </div>
                                <div className="flex p-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                                        <InformationCircleIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Payment Status Email</p>
                                        <p className="text-sm text-gray-500">{customer.paymentStatusEmail}</p>
                                    </div>
                                </div>
                                <div className="flex p-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                                        <LocationMarkerIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Address</p>
                                        <p className="text-sm text-gray-500">
                                            {customer.street && (
                                                <>
                                                    {customer.street} <br />
                                                </>
                                            )}
                                            {customer.city && customer.state
                                                ? `${customer.city}, ${customer.state}`
                                                : `${customer.city} ${customer.state}`}{' '}
                                            {customer.zip}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-12">
                            <h3>Loads for Customer</h3>
                            <LoadsTable
                                loads={loads}
                                headers={[
                                    'refNum',
                                    'status',
                                    'shipper.date',
                                    'receiver.date',
                                    'shipper.city',
                                    'receiver.city',
                                    'rate',
                                ]}
                                sort={sort}
                                changeSort={changeSort}
                                deleteLoad={deleteLoad}
                            ></LoadsTable>
                            <Pagination
                                metadata={metadata}
                                onPrevious={() => previousPage()}
                                onNext={() => nextPage()}
                            ></Pagination>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

CustomerDetailsPage.authenticationEnabled = true;

export default CustomerDetailsPage;
