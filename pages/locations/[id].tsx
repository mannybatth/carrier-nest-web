import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { useRouter } from 'next/router';
import React, { Fragment, useEffect } from 'react';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import CustomerDetailsSkeleton from '../../components/skeletons/CustomerDetailsSkeleton';
import { PageWithAuth } from '../../interfaces/auth';
import { Location } from '@prisma/client';
import { deleteLocationById, getLocationById } from 'lib/rest/locations';

type ActionsDropdownProps = {
    location: Location;
    disabled?: boolean;
    deleteLocation: (id: string) => void;
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({ location, disabled, deleteLocation }) => {
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
                                        router.push(`/locations/edit/${location.id}`);
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
                                        deleteLocation(location.id);
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

const LocationDetailsPage: PageWithAuth = () => {
    const router = useRouter();
    const { id: locationId } = router.query as { id: string };

    const [loadingLocation, setLoadingLocation] = React.useState(true);
    const [openDeleteLocationConfirmation, setOpenDeleteLocationConfirmation] = React.useState(false);

    const [location, setLocation] = React.useState<Location | null>(null);

    useEffect(() => {
        if (locationId) {
            reloadLocation();
        }
    }, [locationId]);

    const reloadLocation = async () => {
        setLoadingLocation(true);
        const location = await getLocationById(locationId);
        setLocation(location);
        setLoadingLocation(false);
    };

    const deleteLocation = async (id: string) => {
        await deleteLocationById(id);

        notify({ title: 'Location deleted', message: 'Location deleted successfully' });

        router.push('/locations');
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">{location?.name}</h1>
                    <ActionsDropdown
                        location={location}
                        disabled={!location}
                        deleteLocation={() => setOpenDeleteLocationConfirmation(true)}
                    ></ActionsDropdown>
                </div>
            }
        >
            <>
                <SimpleDialog
                    show={openDeleteLocationConfirmation}
                    title="Delete location"
                    description="Are you sure you want to delete this location?"
                    primaryButtonText="Delete"
                    primaryButtonAction={() => deleteLocation(location.id)}
                    secondaryButtonAction={() => setOpenDeleteLocationConfirmation(false)}
                    onClose={() => setOpenDeleteLocationConfirmation(false)}
                ></SimpleDialog>
                <div className="py-2 mx-auto max-w-7xl">
                    <BreadCrumb
                        className="sm:px-6 md:px-8"
                        paths={[
                            {
                                label: 'Stop Locations',
                                href: '/locations',
                            },
                            {
                                label: location ? `${location.name}` : '',
                            },
                        ]}
                    ></BreadCrumb>
                    <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                        <div className="flex">
                            <h1 className="flex-1 text-2xl font-semibold text-gray-900">{location?.name}</h1>
                            <ActionsDropdown
                                location={location}
                                disabled={!location}
                                deleteLocation={() => setOpenDeleteLocationConfirmation(true)}
                            ></ActionsDropdown>
                        </div>
                        <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                    </div>
                    <div className="px-5 sm:px-6 md:px-8">
                        <div className="grid grid-cols-12 gap-5">
                            {location ? (
                                <div className="col-span-12">
                                    <div
                                        role="list"
                                        className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2 lg:grid-cols-4"
                                    >
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Name</p>
                                                <p className="text-sm text-gray-500">{location.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Street</p>
                                                <p className="text-sm text-gray-500">{location.street}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">City</p>
                                                <p className="text-sm text-gray-500">{location.city}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">State</p>
                                                <p className="text-sm text-gray-500">{location.state}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Zip</p>
                                                <p className="text-sm text-gray-500">{location.zip}</p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Country</p>
                                                <p className="text-sm text-gray-500">{location.country}</p>
                                            </div>
                                        </div>
                                        {location.latitude && (
                                            <div className="flex">
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-gray-900">Latitude</p>
                                                    <p className="text-sm text-gray-500">{location.latitude}</p>
                                                </div>
                                            </div>
                                        )}
                                        {location.longitude && (
                                            <div className="flex">
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-gray-900">Longitude</p>
                                                    <p className="text-sm text-gray-500">{location.longitude}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <CustomerDetailsSkeleton></CustomerDetailsSkeleton>
                            )}
                        </div>
                    </div>
                </div>
            </>
        </Layout>
    );
};

LocationDetailsPage.authenticationEnabled = true;

export default LocationDetailsPage;
