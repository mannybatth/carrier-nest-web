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

    const [sendSMS, setSendSMS] = React.useState(false);

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
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Drivers',
                            href: '/drivers',
                        },
                        {
                            label: 'Create New Driver',
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Driver</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <form id="driver-form" onSubmit={formHook.handleSubmit(submit)}>
                        <DriverForm formHook={formHook}></DriverForm>

                        <div className="flex flex-col items-end px-0 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                            <div className="flex-1"></div>
                            <div className="pb-2 flex flex-row-reverse w-fit items-center mr-0 ml-auto gap-0">
                                <label
                                    htmlFor={'sms-send'}
                                    className="flex-1 py-1 text-xs font-base text-gray-600 cursor-pointer sm:text-sm"
                                >
                                    Send driver app download link via sms
                                </label>
                                <input
                                    id={'sms-send'}
                                    name={'sms-send'}
                                    type="checkbox"
                                    checked={sendSMS}
                                    onChange={(e) => setSendSMS(e.target.checked)}
                                    className="w-4 h-4 mr-2 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`inline-flex w-fit justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                    loading ? 'opacity-50' : ''
                                }`}
                            >
                                {loading ? 'Creating...' : 'Create Driver'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

CreateDriver.authenticationEnabled = true;

export default CreateDriver;
