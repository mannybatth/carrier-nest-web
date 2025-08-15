import { Driver, Prisma } from '@prisma/client';
import { DriverProvider, useDriverContext } from 'components/context/DriverContext';
import { LoadingOverlay } from 'components/LoadingOverlay';
import DriverEditSkeleton from 'components/skeletons/DriverEditSkeleton';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import DriverForm from '../../../components/forms/driver/DriverForm';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import Layout from '../../../components/layout/Layout';
import { notify } from '../../../components/notifications/Notification';
import { PageWithAuth } from '../../../interfaces/auth';
import { ExpandedDriver } from '../../../interfaces/models';
import { updateDriver } from '../../../lib/rest/driver';

const EditDriver: PageWithAuth = () => {
    const [driver, setDriver] = useDriverContext();

    const formHook = useForm<Driver>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);

    useEffect(() => {
        if (!driver) {
            formHook.reset();
            return;
        }

        formHook.setValue('name', driver.name);
        if (driver.email) {
            formHook.setValue('email', driver.email);
        }
        if (driver.phone) {
            formHook.setValue('phone', driver.phone);
        }
        if (driver.type) {
            formHook.setValue('type', driver.type);
        }
        if (driver.defaultChargeType) {
            formHook.setValue('defaultChargeType', driver.defaultChargeType);
        }
        if (driver.perMileRate) {
            formHook.setValue('perMileRate', driver.perMileRate);
        }
        if (driver.perHourRate) {
            formHook.setValue('perHourRate', driver.perHourRate);
        }
        if (driver.defaultFixedPay) {
            formHook.setValue('defaultFixedPay', driver.defaultFixedPay);
        }
        if (driver.takeHomePercent) {
            formHook.setValue('takeHomePercent', driver.takeHomePercent);
        }
        if (driver.baseGuaranteeAmount) {
            formHook.setValue('baseGuaranteeAmount', driver.baseGuaranteeAmount);
        }
    }, [driver]);

    const submit = async (data: Driver) => {
        setLoading(true);

        try {
            const driverData: ExpandedDriver = {
                name: data.name,
                email: data.email,
                phone: data.phone,
                type: data.type,
                defaultChargeType: data.defaultChargeType,
                perMileRate: data.perMileRate ? new Prisma.Decimal(data.perMileRate) : null,
                perHourRate: data.perHourRate ? new Prisma.Decimal(data.perHourRate) : null,
                defaultFixedPay: data.defaultFixedPay ? new Prisma.Decimal(data.defaultFixedPay) : null,
                takeHomePercent: data.takeHomePercent ? new Prisma.Decimal(data.takeHomePercent) : null,
                baseGuaranteeAmount: data.baseGuaranteeAmount ? new Prisma.Decimal(data.baseGuaranteeAmount) : null,
            };
            const newDriver = await updateDriver(driver.id, driverData);

            notify({ title: 'Driver updated', message: 'Driver updated successfully' });

            // Redirect to driver page
            await router.push(`/drivers/${newDriver.id}`);
        } catch (error) {
            notify({ title: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Edit Driver</h1>}>
            {!driver ? (
                <DriverEditSkeleton />
            ) : (
                <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
                    <div className="max-w-4xl py-6 mx-auto px-4 sm:px-6 lg:px-8">
                        <BreadCrumb
                            className="mb-6"
                            paths={[
                                {
                                    label: 'Drivers',
                                    href: '/drivers',
                                },
                                {
                                    label: driver ? `${driver.name}` : '',
                                    href: driver ? `/drivers/${driver.id}` : '',
                                },
                                {
                                    label: 'Edit Driver',
                                },
                            ]}
                        />

                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Driver</h1>
                            <p className="text-gray-600">
                                Update driver information and default pay configuration. Changes will apply to future
                                assignments.
                            </p>
                        </div>

                        <div className="relative">
                            {loading && <LoadingOverlay message="Saving Driver..." />}
                            <form id="driver-form" onSubmit={formHook.handleSubmit(submit)} className="space-y-6">
                                <DriverForm formHook={formHook} />

                                {/* Save Button Section */}
                                <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <h4 className="text-xl font-bold text-gray-900 mb-2">
                                                Ready to save changes?
                                            </h4>
                                            <p className="text-base text-gray-600 leading-relaxed">
                                                Your changes will be applied immediately and affect future assignments.
                                            </p>
                                        </div>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => window.history.back()}
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
                                                    'Save Driver'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

EditDriver.authenticationEnabled = true;

const EditDriverWrapper: PageWithAuth = () => {
    const router = useRouter();
    const { id } = router.query;
    const driverId = id as string;

    return (
        <DriverProvider driverId={driverId}>
            <EditDriver></EditDriver>
        </DriverProvider>
    );
};

EditDriverWrapper.authenticationEnabled = true;

export default EditDriverWrapper;
