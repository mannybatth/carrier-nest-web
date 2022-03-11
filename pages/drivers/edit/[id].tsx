import { Driver } from '@prisma/client';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import DriverForm from '../../../components/forms/driver/DriverForm';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import Layout from '../../../components/layout/Layout';
import { notify } from '../../../components/Notification';
import { ComponentWithAuth } from '../../../interfaces/auth';
import { ExpandedDriver, SimpleDriver } from '../../../interfaces/models';
import { getDriverById, updateDriver } from '../../../lib/rest/driver';

type Props = {
    driver: Driver;
};

export async function getServerSideProps(context: NextPageContext) {
    const driver = await getDriverById(Number(context.query.id));
    if (!driver) {
        return {
            redirect: {
                permanent: false,
                destination: '/drivers',
            },
        };
    }

    return {
        props: {
            driver,
        },
    };
}

const EditDriver: ComponentWithAuth<Props> = ({ driver: driverProp }: Props) => {
    const formHook = useForm<SimpleDriver>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);
    const [driver, setDriver] = React.useState<Driver>(driverProp);

    useEffect(() => {
        if (!driver) {
            formHook.reset();
            return;
        }

        formHook.setValue('name', driver.name);
        formHook.setValue('email', driver.email);
        formHook.setValue('phone', driver.phone);
    }, [driver]);

    const submit = async (data: SimpleDriver) => {
        console.log('data to save', data);

        setLoading(true);

        const driverData: ExpandedDriver = {
            name: data.name,
            email: data.email,
            phone: data.phone,
        };

        const newDriver = await updateDriver(driver.id, driverData);
        console.log('updated driver', newDriver);

        setLoading(false);

        notify({ title: 'Driver updated', message: 'Driver updated successfully' });

        // Redirect to driver page
        router.push(`/drivers/${newDriver.id}`);
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
                            label: `${driver.name}`,
                            href: `/drivers/${driver.id}`,
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
                <div className="px-5 sm:px-6 md:px-8">
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

export default EditDriver;
