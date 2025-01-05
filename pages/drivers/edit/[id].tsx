import { Driver, ChargeType, Prisma } from '@prisma/client';
import { DriverProvider, useDriverContext } from 'components/context/DriverContext';
import { LoadingOverlay } from 'components/LoadingOverlay';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import DriverForm from '../../../components/forms/driver/DriverForm';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import Layout from '../../../components/layout/Layout';
import { notify } from '../../../components/Notification';
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
    }, [driver]);

    const submit = async (data: Driver) => {
        setLoading(true);

        const driverData: ExpandedDriver = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            defaultChargeType: data.defaultChargeType,
            perMileRate: new Prisma.Decimal(data.perMileRate),
            perHourRate: new Prisma.Decimal(data.perHourRate),
            takeHomePercent: new Prisma.Decimal(data.takeHomePercent),
        };

        const newDriver = await updateDriver(driver.id, driverData);

        notify({ title: 'Driver updated', message: 'Driver updated successfully' });

        // Redirect to driver page
        await router.push(`/drivers/${newDriver.id}`);

        setLoading(false);
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Edit Driver</h1>}>
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
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
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Driver</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="relative px-5 sm:px-6 md:px-8">
                    {(loading || !driver) && <LoadingOverlay />}
                    <form id="driver-form" onSubmit={formHook.handleSubmit(submit)}>
                        <DriverForm formHook={formHook}></DriverForm>
                        <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                            <div className="flex-1"></div>
                            <button
                                type="submit"
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Save Driver
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

EditDriver.authenticationEnabled = true;

const EditDriverWrapper: PageWithAuth = () => {
    const params = useParams();
    const driverId = params?.id as string;

    return (
        <DriverProvider driverId={driverId}>
            <EditDriver></EditDriver>
        </DriverProvider>
    );
};

EditDriverWrapper.authenticationEnabled = true;

export default EditDriverWrapper;
