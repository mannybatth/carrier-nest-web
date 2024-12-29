import { Location } from '@prisma/client';
import { LocationProvider, useLocationContext } from 'components/context/LocationContext';
import { LoadingOverlay } from 'components/LoadingOverlay';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import LocationForm from '../../../components/forms/location/LocationForm';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import Layout from '../../../components/layout/Layout';
import { notify } from '../../../components/Notification';
import { PageWithAuth } from '../../../interfaces/auth';
import { updateLocation } from 'lib/rest/locations';

const EditLocationPage: PageWithAuth = () => {
    const [location] = useLocationContext();

    const formHook = useForm<Location>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);

    useEffect(() => {
        if (!location) {
            formHook.reset();
            return;
        }

        formHook.setValue('name', location.name);
        formHook.setValue('street', location.street);
        formHook.setValue('city', location.city);
        formHook.setValue('state', location.state);
        formHook.setValue('zip', location.zip);
        formHook.setValue('country', location.country);
        formHook.setValue('latitude', location.latitude);
        formHook.setValue('longitude', location.longitude);
    }, [location]);

    const submit = async (data: Location) => {
        setLoading(true);

        const locationData: Partial<Location> = {
            name: data.name,
            street: data.street,
            city: data.city,
            state: data.state,
            zip: data.zip,
            country: data.country,
            latitude: data.latitude,
            longitude: data.longitude,
        };

        const updatedLocation = await updateLocation(location.id, locationData);

        notify({ title: 'Location updated', message: 'Location updated successfully' });

        // Redirect to location page
        await router.push(`/locations/${updatedLocation.id}`);

        setLoading(false);
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Edit Location</h1>}>
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Stop Locations',
                            href: '/locations',
                        },
                        {
                            label: location ? `${location.name}` : '',
                            href: location ? `/locations/${location.id}` : '',
                        },
                        {
                            label: 'Edit Location',
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Location</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="relative px-5 sm:px-6 md:px-8">
                    {(loading || !location) && <LoadingOverlay />}
                    <form id="location-form" onSubmit={formHook.handleSubmit(submit)}>
                        <LocationForm formHook={formHook}></LocationForm>
                        <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                            <div className="flex-1"></div>
                            <button
                                type="submit"
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Save Location
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

EditLocationPage.authenticationEnabled = true;

const EditLocationPageWrapper: PageWithAuth = () => {
    const params = useParams();
    const locationId = params.id as string;

    return (
        <LocationProvider locationId={locationId}>
            <EditLocationPage></EditLocationPage>
        </LocationProvider>
    );
};

EditLocationPageWrapper.authenticationEnabled = true;

export default EditLocationPageWrapper;
