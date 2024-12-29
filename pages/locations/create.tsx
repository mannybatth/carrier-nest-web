import { useRouter } from 'next/router';
import React from 'react';
import { useForm } from 'react-hook-form';
import LocationForm from '../../components/forms/location/LocationForm';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import { PageWithAuth } from '../../interfaces/auth';
import { Location } from '@prisma/client';
import { createLocation } from 'lib/rest/locations';
import { getGeocoding } from 'lib/mapbox/searchGeo';

const CreateLocationPage: PageWithAuth = () => {
    const formHook = useForm<Location>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);

    const submit = async (data: Location) => {
        setLoading(true);

        try {
            const locationData: Partial<Location> = {
                name: data.name,
                street: data.street,
                city: data.city,
                state: data.state,
                zip: data.zip,
                country: data.country,
            };

            try {
                const address = `${data.street}, ${data.city}, ${data.state}, ${data.zip}, ${data.country}`;
                const locationCoordinates = await getGeocoding(address);
                locationData.latitude = locationCoordinates.latitude;
                locationData.longitude = locationCoordinates.longitude;
            } catch (error) {
                throw new Error('Failed to get location coordinates');
            }

            const newLocation = await createLocation(locationData);

            notify({ title: 'New location created', message: 'New location created successfully' });

            // Redirect to location page
            await router.push(`/locations/${newLocation.id}`);
        } catch (error) {
            notify({ title: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Create New Location</h1>}>
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Stop Locations',
                            href: '/locations',
                        },
                        {
                            label: 'Create New Location',
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Location</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <form id="location-form" onSubmit={formHook.handleSubmit(submit)}>
                        <LocationForm formHook={formHook}></LocationForm>
                        <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                            <div className="flex-1"></div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                    loading ? 'opacity-50' : ''
                                }`}
                            >
                                {loading ? 'Creating...' : 'Create Location'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

CreateLocationPage.authenticationEnabled = true;

export default CreateLocationPage;
