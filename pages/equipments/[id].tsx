import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { Fragment, useEffect, useState } from 'react';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import { ExpandedEquipment } from 'interfaces/models';
import { deleteEquipmentById, getEquipmentById } from '../../lib/rest/equipment';
import CustomerDetailsSkeleton from 'components/skeletons/CustomerDetailsSkeleton';
import Link from 'next/link';

type ActionsDropdownProps = {
    equipment: ExpandedEquipment;
    disabled?: boolean;
    deleteEquipment: (id: string) => void;
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({ equipment, disabled, deleteEquipment }) => {
    const router = useRouter();

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button
                    className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
                    disabled={disabled}
                >
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
                <Menu.Items className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/equipments/edit/${equipment.id}`);
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
                                        deleteEquipment(equipment.id);
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

const EquipmentDetailsPage = () => {
    const params = useParams();
    const equipmentId = params.id as string;

    const [loadingEquipment, setLoadingEquipment] = useState(true);
    const [openDeleteEquipmentConfirmation, setOpenDeleteEquipmentConfirmation] = useState(false);

    const [equipment, setEquipment] = useState<ExpandedEquipment | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (equipmentId) {
            reloadEquipment();
        }
    }, [equipmentId]);

    const reloadEquipment = async () => {
        setLoadingEquipment(true);
        try {
            const equipment = await getEquipmentById(equipmentId);
            setEquipment(equipment);
        } catch (error) {
            notify({ title: 'Error', message: error.message, type: 'error' });
        } finally {
            setLoadingEquipment(false);
        }
    };

    const deleteEquipment = async (id: string) => {
        try {
            await deleteEquipmentById(id);
            notify({ title: 'Equipment deleted', message: 'Equipment deleted successfully' });
            router.push('/equipments');
        } catch (error) {
            notify({ title: 'Error', message: error.message, type: 'error' });
        }
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">
                        {equipment?.equipmentNumber || equipment?.make}
                    </h1>
                    <ActionsDropdown
                        equipment={equipment}
                        disabled={!equipment}
                        deleteEquipment={() => setOpenDeleteEquipmentConfirmation(true)}
                    />
                </div>
            }
        >
            <>
                <SimpleDialog
                    show={openDeleteEquipmentConfirmation}
                    title="Delete Equipment"
                    description="Are you sure you want to delete this equipment?"
                    primaryButtonText="Delete"
                    primaryButtonAction={() => deleteEquipment(equipment.id)}
                    secondaryButtonAction={() => setOpenDeleteEquipmentConfirmation(false)}
                    onClose={() => setOpenDeleteEquipmentConfirmation(false)}
                />
                <div className="py-2 mx-auto max-w-7xl">
                    <BreadCrumb
                        className="sm:px-6 md:px-8"
                        paths={[
                            {
                                label: 'Equipment Management',
                                href: '/equipments',
                            },
                            {
                                label: equipment ? `${equipment?.equipmentNumber || equipment?.make}` : '',
                            },
                        ]}
                    />
                    <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                        <div className="flex">
                            <h1 className="flex-1 text-2xl font-semibold text-gray-900">
                                {equipment?.equipmentNumber || equipment?.make}
                            </h1>
                            <ActionsDropdown
                                equipment={equipment}
                                disabled={!equipment}
                                deleteEquipment={() => setOpenDeleteEquipmentConfirmation(true)}
                            />
                        </div>
                        <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                    </div>
                    <div className="px-5 sm:px-6 md:px-8">
                        <div className="grid grid-cols-12 gap-5">
                            {equipment ? (
                                <div className="col-span-12">
                                    <div
                                        role="list"
                                        className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2 lg:grid-cols-4"
                                    >
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Equipment Number</p>
                                                <p className="text-sm text-gray-500">{equipment.equipmentNumber}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Make</p>
                                                <p className="text-sm text-gray-500">{equipment.make}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Model</p>
                                                <p className="text-sm text-gray-500">{equipment.model}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Year</p>
                                                <p className="text-sm text-gray-500">{equipment.year}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">VIN</p>
                                                <p className="text-sm text-gray-500">{equipment.vin}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">License Plate</p>
                                                <p className="text-sm text-gray-500">{equipment.licensePlate}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Status</p>
                                                <p className="text-sm text-gray-500">{equipment.status}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Drivers</p>
                                                <p className="text-sm text-gray-500">
                                                    {equipment.drivers.length > 0
                                                        ? equipment.drivers.map((driver, index) => (
                                                              <React.Fragment key={driver.id}>
                                                                  <Link
                                                                      href={`/drivers/${driver.id}`}
                                                                      className="text-blue-600 hover:underline"
                                                                  >
                                                                      {driver.name}
                                                                  </Link>
                                                                  {index < equipment.drivers.length - 1 && ', '}
                                                              </React.Fragment>
                                                          ))
                                                        : 'Unassigned'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <CustomerDetailsSkeleton />
                            )}
                        </div>
                    </div>
                </div>
            </>
        </Layout>
    );
};

EquipmentDetailsPage.authenticationEnabled = true;

export default EquipmentDetailsPage;
