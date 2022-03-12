import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, MailIcon, PhoneIcon, TruckIcon } from '@heroicons/react/outline';
import classNames from 'classnames';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React, { Fragment } from 'react';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import LoadsTable from '../../components/loads/LoadsTable';
import { notify } from '../../components/Notification';
import { ComponentWithAuth } from '../../interfaces/auth';
import { ExpandedDriver, ExpandedLoad, Sort } from '../../interfaces/models';
import { deleteDriverById, getDriverByIdWithLoads } from '../../lib/rest/driver';
import { getLoadsExpanded } from '../../lib/rest/load';

type ActionsDropdownProps = {
    driver: ExpandedDriver;
    deleteDriver: (id: number) => void;
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({ driver, deleteDriver }: ActionsDropdownProps) => {
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
                                        router.push(`/drivers/edit/${driver.id}`);
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
                                        deleteDriver(driver.id);
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
    const driver = await getDriverByIdWithLoads(Number(context.query.id));
    return {
        props: {
            driver,
        },
    };
}

type Props = {
    driver: ExpandedDriver;
};

const DriverDetailsPage: ComponentWithAuth<Props> = ({ driver }: Props) => {
    const [loads, setLoads] = React.useState<ExpandedLoad[]>(driver.loads);
    const router = useRouter();

    const deleteDriver = async (id: number) => {
        await deleteDriverById(id);

        notify({ title: 'Driver deleted', message: 'Driver deleted successfully' });

        router.push('/drivers');
    };

    const reloadLoads = async (sort: Sort) => {
        const loads = await getLoadsExpanded({ sort, driverId: driver.id });
        setLoads(loads);
    };

    const deleteLoad = async (id: number) => {
        await deleteDriverById(id);

        notify({ title: 'Load deleted', message: 'Load deleted successfully' });

        const loads = await getLoadsExpanded({ driverId: driver.id });
        setLoads(loads);
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">{driver.name}</h1>
                    <ActionsDropdown driver={driver} deleteDriver={deleteDriver}></ActionsDropdown>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Driver',
                            href: '/drivers',
                        },
                        {
                            label: `${driver.name}`,
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">{driver.name}</h1>
                        <ActionsDropdown driver={driver} deleteDriver={deleteDriver}></ActionsDropdown>
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
                                        <p className="text-sm text-gray-500">100</p>
                                    </div>
                                </div>
                                <div className="flex p-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ">
                                        <MailIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Email</p>
                                        <p className="text-sm text-gray-500">{driver.email}</p>
                                    </div>
                                </div>
                                <div className="flex p-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                                        <PhoneIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Phone</p>
                                        <p className="text-sm text-gray-500">{driver.phone}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-12">
                            <h3>Loads Assigned to Driver</h3>
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
                                changeSort={reloadLoads}
                                deleteLoad={deleteLoad}
                            ></LoadsTable>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

DriverDetailsPage.authenticationEnabled = true;

export default DriverDetailsPage;
