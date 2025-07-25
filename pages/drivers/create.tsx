import { useRouter } from 'next/router';
import React from 'react';
import { useForm } from 'react-hook-form';
import DriverForm from '../../components/forms/driver/DriverForm';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import { PageWithAuth } from '../../interfaces/auth';
import { createDriver } from '../../lib/rest/driver';
import { Driver, Prisma } from '@prisma/client';

const CreateDriver: PageWithAuth = () => {
    const formHook = useForm<Driver>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);

    const [sendSMS, setSendSMS] = React.useState(true);

    const submit = async (data: Driver) => {
        setLoading(true);

        try {
            const driverData: Partial<Driver> = {
                name: data.name,
                email: data.email,
                phone: data.phone,
                defaultChargeType: data.defaultChargeType,
                perMileRate: new Prisma.Decimal(data.perMileRate),
                perHourRate: new Prisma.Decimal(data.perHourRate),
                takeHomePercent: new Prisma.Decimal(data.takeHomePercent),
            };

            const newDriver = await createDriver(driverData, sendSMS);
            console.log('new driver', newDriver);

            notify({ title: 'New driver created', message: 'New driver created successfully' });

            // Redirect to driver page
            await router.push(`/drivers/${newDriver.id}`);
        } catch (error) {
            notify({ title: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Create New Driver</h1>}>
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
                                label: 'Create New Driver',
                            },
                        ]}
                    />

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Driver</h1>
                        <p className="text-gray-600">
                            Add a new driver to your fleet with their contact information and default pay configuration.
                        </p>
                    </div>

                    <form id="driver-form" onSubmit={formHook.handleSubmit(submit)} className="space-y-6">
                        <DriverForm formHook={formHook} />

                        {/* SMS and Save Button Section */}
                        <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
                            <div className="space-y-6">
                                {/* SMS Option */}
                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-200">
                                    <div className="flex-1">
                                        <h4 className="text-base font-semibold text-gray-900 mb-1">
                                            Driver App Notification
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            Send download link for the driver mobile app via SMS
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            id="sms-send"
                                            name="sms-send"
                                            type="checkbox"
                                            checked={sendSMS}
                                            onChange={(e) => setSendSMS(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                                    <div className="flex-1">
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">
                                            Ready to create driver?
                                        </h4>
                                        <p className="text-base text-gray-600 leading-relaxed">
                                            The driver will be added to your fleet and can be assigned to loads
                                            immediately.
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
                                                    <span>Creating...</span>
                                                </div>
                                            ) : (
                                                'Create Driver'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

CreateDriver.authenticationEnabled = true;

export default CreateDriver;
