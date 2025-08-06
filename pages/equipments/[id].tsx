import { Menu, Transition } from '@headlessui/react';
import {
    ChevronDownIcon,
    TruckIcon,
    CalendarDaysIcon,
    IdentificationIcon,
    UserGroupIcon,
    WrenchScrewdriverIcon,
    PencilIcon,
    TrashIcon,
    ArrowLeftIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import classNames from 'classnames';
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
                    className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabled}
                >
                    Actions
                    <ChevronDownIcon className="w-4 h-4 ml-2 -mr-1" aria-hidden="true" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95 translate-y-1"
                enterTo="transform opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100 translate-y-0"
                leaveTo="transform opacity-0 scale-95 translate-y-1"
            >
                <Menu.Items className="absolute right-0 z-20 w-48 mt-2 origin-top-right bg-white border-2 border-gray-200 rounded-2xl shadow-xl ring-1 ring-black/5 focus:outline-none overflow-hidden">
                    <div className="py-2">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={() => router.push(`/equipments/edit/${equipment.id}`)}
                                    className={classNames(
                                        'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-150 flex items-center',
                                        active ? 'bg-blue-50 text-blue-900' : 'text-gray-700 hover:bg-gray-50',
                                    )}
                                >
                                    <PencilIcon className="w-4 h-4 mr-3 text-gray-400" />
                                    Edit Equipment
                                </button>
                            )}
                        </Menu.Item>
                        <div className="border-t border-gray-200 my-1" />
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={() => deleteEquipment(equipment.id)}
                                    className={classNames(
                                        'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-150 flex items-center',
                                        active ? 'bg-red-50 text-red-900' : 'text-red-600 hover:bg-red-50',
                                    )}
                                >
                                    <TrashIcon className="w-4 h-4 mr-3 text-red-500" />
                                    Delete Equipment
                                </button>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

// Status styling helper
const getStatusDisplay = (status: string) => {
    switch (status) {
        case 'AVAILABLE':
            return {
                icon: CheckCircleIcon,
                color: 'text-green-600',
                bgColor: 'bg-green-100',
                label: 'Available',
                description: 'Ready for assignments',
            };
        case 'MAINTENANCE':
            return {
                icon: ExclamationTriangleIcon,
                color: 'text-amber-600',
                bgColor: 'bg-amber-100',
                label: 'In Maintenance',
                description: 'Currently being serviced',
            };
        case 'INACTIVE':
            return {
                icon: XCircleIcon,
                color: 'text-red-600',
                bgColor: 'bg-red-100',
                label: 'Inactive',
                description: 'Not in service',
            };
        default:
            return {
                icon: XCircleIcon,
                color: 'text-gray-600',
                bgColor: 'bg-gray-100',
                label: status || 'Unknown',
                description: 'Status not set',
            };
    }
};

const EquipmentDetailsPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const equipmentId = id as string;

    const [loadingEquipment, setLoadingEquipment] = useState(true);
    const [openDeleteEquipmentConfirmation, setOpenDeleteEquipmentConfirmation] = useState(false);

    const [equipment, setEquipment] = useState<ExpandedEquipment | null>(null);

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
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => router.push('/equipments')}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors duration-200"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <h1 className="flex-1 text-xl font-semibold text-gray-900 truncate">
                        {equipment?.equipmentNumber || equipment?.make || 'Equipment Details'}
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
                    description="Are you sure you want to delete this equipment? This action cannot be undone."
                    primaryButtonText="Delete"
                    primaryButtonAction={() => deleteEquipment(equipment.id)}
                    secondaryButtonAction={() => setOpenDeleteEquipmentConfirmation(false)}
                    onClose={() => setOpenDeleteEquipmentConfirmation(false)}
                />

                <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                    {/* Desktop Header */}
                    <div className="hidden md:block">
                        <div className="px-6 py-8 mx-auto max-w-7xl lg:px-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={() => router.push('/equipments')}
                                        className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        <ArrowLeftIcon className="w-5 h-5" />
                                    </button>
                                    <div>
                                        <h1 className="text-3xl font-bold text-gray-900">
                                            {equipment?.equipmentNumber || equipment?.make || 'Equipment Details'}
                                        </h1>
                                        <p className="text-gray-600 mt-1">
                                            Comprehensive equipment profile and information
                                        </p>
                                    </div>
                                </div>
                                <ActionsDropdown
                                    equipment={equipment}
                                    disabled={!equipment}
                                    deleteEquipment={() => setOpenDeleteEquipmentConfirmation(true)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="px-4 pb-8 mx-auto max-w-5xl sm:px-6 py-3 lg:px-8">
                        {loadingEquipment ? (
                            <div className="space-y-8">
                                <CustomerDetailsSkeleton />
                                <CustomerDetailsSkeleton />
                            </div>
                        ) : equipment ? (
                            <div className="space-y-8">
                                {/* Main Header Card with Equipment Details */}
                                <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                                    {/* Hero Header */}
                                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-12 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-black/10"></div>
                                        <div className="relative z-10">
                                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                                                <div className="flex items-center space-x-6">
                                                    <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-sm shadow-lg">
                                                        <TruckIcon className="w-12 h-12 text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
                                                            {equipment.equipmentNumber ||
                                                                `${equipment.make} ${equipment.model}`}
                                                        </h1>
                                                        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 space-y-2 lg:space-y-0">
                                                            <p className="text-xl text-blue-100 font-medium">
                                                                {equipment.year} {equipment.make} {equipment.model}
                                                            </p>
                                                            <div className="flex items-center space-x-4">
                                                                {(() => {
                                                                    const statusInfo = getStatusDisplay(
                                                                        equipment.status,
                                                                    );
                                                                    const StatusIcon = statusInfo.icon;
                                                                    return (
                                                                        <div className="flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2 backdrop-blur-sm">
                                                                            <StatusIcon className="w-5 h-5 text-white" />
                                                                            <span className="text-white font-medium text-sm">
                                                                                {statusInfo.label}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Decorative elements */}
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
                                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
                                    </div>
                                </div>

                                {/* Equipment Information Card */}
                                <div className="bg-white rounded-3xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                                    <div className="p-8">
                                        <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                                            <IdentificationIcon className="w-6 h-6 mr-3 text-blue-600" />
                                            Equipment Information
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {/* Basic Details */}
                                            <div className="space-y-6">
                                                <div className="pb-4 border-b border-gray-100">
                                                    <p className="text-sm font-medium text-gray-500 mb-1">
                                                        Equipment Number
                                                    </p>
                                                    <p className="text-lg font-semibold text-gray-900 font-mono">
                                                        {equipment.equipmentNumber || 'Not assigned'}
                                                    </p>
                                                </div>

                                                <div className="pb-4 border-b border-gray-100">
                                                    <p className="text-sm font-medium text-gray-500 mb-1">Type</p>
                                                    <p className="text-lg font-semibold text-gray-900">
                                                        {equipment.type}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-sm font-medium text-gray-500 mb-1">VIN</p>
                                                    <p className="text-lg font-semibold text-gray-900 font-mono break-all">
                                                        {equipment.vin || 'Not provided'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Manufacturing Details */}
                                            <div className="space-y-6">
                                                <div className="pb-4 border-b border-gray-100">
                                                    <p className="text-sm font-medium text-gray-500 mb-1">
                                                        Manufacturer
                                                    </p>
                                                    <p className="text-lg font-semibold text-gray-900">
                                                        {equipment.make}
                                                    </p>
                                                </div>

                                                <div className="pb-4 border-b border-gray-100">
                                                    <p className="text-sm font-medium text-gray-500 mb-1">Model</p>
                                                    <p className="text-lg font-semibold text-gray-900">
                                                        {equipment.model}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-sm font-medium text-gray-500 mb-1">Year</p>
                                                    <p className="text-lg font-semibold text-gray-900">
                                                        {equipment.year}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Additional Information */}
                                            <div className="space-y-6">
                                                <div className="pb-4 border-b border-gray-100">
                                                    <p className="text-sm font-medium text-gray-500 mb-1">
                                                        License Plate
                                                    </p>
                                                    <p className="text-lg font-semibold text-gray-900 font-mono">
                                                        {equipment.licensePlate || 'Not registered'}
                                                    </p>
                                                </div>

                                                <div className="pb-4 border-b border-gray-100">
                                                    <p className="text-sm font-medium text-gray-500 mb-1">Age</p>
                                                    <p className="text-lg font-semibold text-gray-900">
                                                        {new Date().getFullYear() - equipment.year} years old
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-sm font-medium text-gray-500 mb-1">
                                                        Assigned Drivers
                                                    </p>
                                                    <p className="text-lg font-semibold text-gray-900">
                                                        {equipment.drivers.length} driver
                                                        {equipment.drivers.length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status and Drivers Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Operational Status Card */}
                                    <div className="bg-white rounded-3xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                                        <div className="p-8">
                                            <h3 className="text-xl font-bold text-gray-900 flex items-center mb-8">
                                                <WrenchScrewdriverIcon className="w-6 h-6 mr-3 text-blue-600" />
                                                Operational Status
                                            </h3>

                                            {(() => {
                                                const statusInfo = getStatusDisplay(equipment.status);
                                                const StatusIcon = statusInfo.icon;
                                                return (
                                                    <div className="text-center">
                                                        <div
                                                            className={`inline-flex items-center justify-center w-20 h-20 ${statusInfo.bgColor} rounded-3xl mb-6`}
                                                        >
                                                            <StatusIcon className={`w-10 h-10 ${statusInfo.color}`} />
                                                        </div>
                                                        <h4 className="text-2xl font-bold text-gray-900 mb-3">
                                                            {statusInfo.label}
                                                        </h4>
                                                        <p className="text-gray-600 leading-relaxed">
                                                            {statusInfo.description}
                                                        </p>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Assigned Drivers Card */}
                                    <div className="bg-white rounded-3xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                                        <div className="p-8">
                                            <h3 className="text-xl font-bold text-gray-900 flex items-center mb-8">
                                                <UserGroupIcon className="w-6 h-6 mr-3 text-blue-600" />
                                                Assigned Drivers
                                                <span className="ml-auto bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                                                    {equipment.drivers.length}
                                                </span>
                                            </h3>

                                            {equipment.drivers.length > 0 ? (
                                                <div className="space-y-4">
                                                    {equipment.drivers.map((driver) => (
                                                        <Link
                                                            key={driver.id}
                                                            href={`/drivers/${driver.id}`}
                                                            className="block p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl transition-all duration-200 border border-transparent hover:border-blue-200 group"
                                                        >
                                                            <div className="flex items-center space-x-4">
                                                                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                                                                    <span className="text-blue-600 font-bold text-sm">
                                                                        {driver.name
                                                                            .split(' ')
                                                                            .map((n) => n[0])
                                                                            .join('')
                                                                            .toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-base font-semibold text-gray-900 group-hover:text-blue-900 transition-colors duration-200 truncate">
                                                                        {driver.name}
                                                                    </p>
                                                                    <p className="text-sm text-gray-500">
                                                                        Authorized Driver
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12">
                                                    <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                                        <UserGroupIcon className="w-8 h-8 text-gray-400" />
                                                    </div>
                                                    <p className="text-gray-500 text-lg font-medium mb-2">
                                                        No drivers assigned
                                                    </p>
                                                    <p className="text-gray-400 text-sm leading-relaxed">
                                                        Equipment can be assigned to drivers for operations
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Equipment not found</h3>
                                <p className="text-gray-500">
                                    The equipment you&apos;re looking for doesn&apos;t exist or has been deleted.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </>
        </Layout>
    );
};

EquipmentDetailsPage.authenticationEnabled = true;

export default EquipmentDetailsPage;
