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
import { useParams } from 'next/navigation';
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
            const { drivers } = await getAllDrivers({ limit: 999, offset: 0 });
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
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
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
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Equipment</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="relative px-5 sm:px-6 md:px-8">
                    {(loading || !equipment) && <LoadingOverlay />}
                    <form id="equipment-form" onSubmit={formHook.handleSubmit(submit)}>
                        <EquipmentForm formHook={formHook} drivers={drivers} condensed={false} />
                        <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                            <div className="flex-1"></div>
                            <button
                                type="submit"
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Save Equipment
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

EditEquipmentPage.authenticationEnabled = true;

const EditEquipmentPageWrapper = () => {
    const params = useParams();
    const equipmentId = params.id as string;

    return (
        <EquipmentProvider equipmentId={equipmentId}>
            <EditEquipmentPage />
        </EquipmentProvider>
    );
};

EditEquipmentPageWrapper.authenticationEnabled = true;

export default EditEquipmentPageWrapper;
