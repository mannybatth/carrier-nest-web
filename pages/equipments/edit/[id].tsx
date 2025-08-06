import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Layout from '../../../components/layout/Layout';
import { getAllDrivers } from '../../../lib/rest/driver';
import { updateEquipment } from '../../../lib/rest/equipment';
import { notify } from '../../../components/Notification';
import EquipmentForm from '../../../components/forms/equipment/EquipmentForm';
import { useForm } from 'react-hook-form';
import { ExpandedEquipment } from 'interfaces/models';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import { EquipmentProvider, useEquipmentContext } from '../../../components/context/EquipmentContext';
import { LoadingOverlay } from '../../../components/LoadingOverlay';

const EditEquipmentPage = () => {
    const [equipment] = useEquipmentContext();
    const [drivers, setDrivers] = useState([]);
    const router = useRouter();
    const formHook = useForm<ExpandedEquipment>();

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (equipment) {
            formHook.reset(equipment);
        }
    }, [equipment]);

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        try {
            const { drivers } = await getAllDrivers({
                limit: 999,
                offset: 0,
                activeOnly: true, // Only show active drivers
            });
            setDrivers(drivers);
        } catch (error) {
            notify({ title: 'Error', message: error.message, type: 'error' });
        }
    };

    const submit = async (data: ExpandedEquipment) => {
        setLoading(true);
        try {
            await updateEquipment(equipment.id, data);
            notify({ title: 'Equipment updated', message: 'Equipment updated successfully' });
            router.push(`/equipments/${equipment.id}`);
        } catch (error) {
            notify({ title: 'Error', message: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Edit Equipment</h1>}>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
                <div className="max-w-4xl py-6 mx-auto px-4 sm:px-6 lg:px-8">
                    <BreadCrumb
                        className="mb-6"
                        paths={[
                            {
                                label: 'Equipment Management',
                                href: '/equipments',
                            },
                            {
                                label: equipment ? `${equipment.equipmentNumber || equipment.make}` : '',
                                href: equipment ? `/equipments/${equipment.id}` : '',
                            },
                            {
                                label: 'Edit Equipment',
                            },
                        ]}
                    />

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Equipment</h1>
                        <p className="text-gray-600">
                            Update equipment details, specifications, and driver assignments for your fleet.
                        </p>
                    </div>

                    <div className="relative">
                        {(loading || !equipment) && <LoadingOverlay message="Loading equipment data..." />}

                        <form id="equipment-form" onSubmit={formHook.handleSubmit(submit)} className="space-y-6">
                            <EquipmentForm formHook={formHook} drivers={drivers} condensed={false} />

                            {/* Save Button Section */}
                            <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
                                <div className="space-y-6">
                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                                        <div className="flex-1">
                                            <h4 className="text-xl font-bold text-gray-900 mb-2">
                                                Ready to save changes?
                                            </h4>
                                            <p className="text-base text-gray-600 leading-relaxed">
                                                The updated equipment information will be applied immediately to your
                                                fleet management system.
                                            </p>
                                        </div>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/equipments/${equipment?.id}`)}
                                                className="px-8 py-4 text-base font-semibold text-gray-700 bg-gray-100 border-2 border-gray-300 rounded-2xl hover:bg-gray-200 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300/50 transition-all duration-200 shadow-lg hover:shadow-xl"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="px-12 py-4 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                                            >
                                                {loading ? (
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        <span>Saving...</span>
                                                    </div>
                                                ) : (
                                                    'Save Equipment'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

EditEquipmentPage.authenticationEnabled = true;

const EditEquipmentPageWrapper = () => {
    const router = useRouter();
    const { id } = router.query;
    const equipmentId = id as string;

    return (
        <EquipmentProvider equipmentId={equipmentId}>
            <EditEquipmentPage />
        </EquipmentProvider>
    );
};

EditEquipmentPageWrapper.authenticationEnabled = true;

export default EditEquipmentPageWrapper;
