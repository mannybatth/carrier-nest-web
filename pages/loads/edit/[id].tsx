import { Prisma } from '@prisma/client';
import { LoadProvider, useLoadContext } from 'components/context/LoadContext';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import LoadForm from '../../../components/forms/load/LoadForm';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import Layout from '../../../components/layout/Layout';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { notify } from '../../../components/Notification';
import { PageWithAuth } from '../../../interfaces/auth';
import type { ExpandedLoad } from '../../../interfaces/models';
import { getGeocoding, getRouteForCoords } from '../../../lib/mapbox/searchGeo';
import { updateLoad } from '../../../lib/rest/load';
import PDFViewer from 'components/PDFViewer';
import Spinner from 'components/Spinner';

const EditLoad: PageWithAuth = () => {
    const [load, setLoad] = useLoadContext();
    const router = useRouter();

    const formHook = useForm<ExpandedLoad>();

    const [loading, setLoading] = React.useState(false);

    const [openAddCustomer, setOpenAddCustomer] = React.useState(false);
    const [showMissingCustomerLabel, setShowMissingCustomerLabel] = React.useState(false);
    const [prefillName, setPrefillName] = React.useState(null);
    const [currentRateconFile, setCurrentRateconFile] = React.useState<File>(null);
    const [downloadRateconFile, setDownloadRateconFile] = React.useState(false);

    const stopsFieldArray = useFieldArray({ name: 'stops', control: formHook.control });

    useEffect(() => {
        if (!load) {
            formHook.reset();
            return;
        }

        formHook.setValue('customer', load.customer);
        formHook.setValue('loadNum', load.loadNum);
        formHook.setValue('rate', load.rate);
        formHook.setValue('shipper', load.shipper);
        formHook.setValue('receiver', load.receiver);
        formHook.setValue('stops', load.stops);

        if (load.rateconDocument && load.rateconDocument.fileUrl) {
            downloadRateCon(load.rateconDocument.fileUrl);
        }
    }, [load]);

    const downloadRateCon = async (fileUrl: string) => {
        setDownloadRateconFile(true);
        try {
            // Fetch the file from Google Cloud Storage (fileUrl is the public URL of the file)
            const response = await fetch(fileUrl);

            // Check if the response is successful
            if (!response.ok) {
                throw new Error('Failed to fetch file');
            }

            // Convert the response to a Blob (binary large object)
            const fileBlob = await response.blob();

            // Create a file from the Blob, optionally you can set the file name based on the URL or your preference
            const file = new File([fileBlob], 'downloaded-file', { type: fileBlob.type });

            // Set the file to state
            setCurrentRateconFile(file);
        } catch (error) {
            console.error('Error downloading file:', error);
        }
        setDownloadRateconFile(false);
    };

    const submit = async (data: ExpandedLoad) => {
        console.log('data to save', data);

        const loadData: ExpandedLoad = {
            customerId: data.customer.id,
            loadNum: data.loadNum,
            rate: new Prisma.Decimal(data.rate),
            customer: data.customer,
            shipper: data.shipper,
            receiver: data.receiver,
            stops: data.stops,
        };

        await saveLoadData(loadData);
    };

    const saveLoadData = async (loadData: ExpandedLoad) => {
        setLoading(true);

        const shipperAddress =
            loadData.shipper.street +
            ', ' +
            loadData.shipper.city +
            ', ' +
            loadData.shipper.state +
            ' ' +
            loadData.shipper.zip;
        const receiverAddress =
            loadData.receiver.street +
            ', ' +
            loadData.receiver.city +
            ', ' +
            loadData.receiver.state +
            ' ' +
            loadData.receiver.zip;
        const shipperCoordinates = await getGeocoding(shipperAddress);
        const receiverCoordinates = await getGeocoding(receiverAddress);
        const stopsCoordinates = await Promise.all(
            loadData.stops.map(async (stop) => {
                const stopAddress = stop.street + ', ' + stop.city + ', ' + stop.state + ' ' + stop.zip;
                return await getGeocoding(stopAddress);
            }),
        );

        const { routeEncoded, distanceMiles, durationHours } = await getRouteForCoords([
            [shipperCoordinates.longitude, shipperCoordinates.latitude],
            ...stopsCoordinates.map((stop) => [stop.longitude, stop.latitude]),
            [receiverCoordinates.longitude, receiverCoordinates.latitude],
        ]);

        loadData.shipper = {
            ...loadData.shipper,
            longitude: shipperCoordinates.longitude,
            latitude: shipperCoordinates.latitude,
        };
        loadData.receiver = {
            ...loadData.receiver,
            longitude: receiverCoordinates.longitude,
            latitude: receiverCoordinates.latitude,
        };
        loadData.stops = loadData.stops.map((stop, index) => {
            return {
                ...stop,
                longitude: stopsCoordinates[index].longitude,
                latitude: stopsCoordinates[index].latitude,
            };
        });
        loadData.routeEncoded = routeEncoded;
        loadData.routeDistanceMiles = new Prisma.Decimal(distanceMiles);
        loadData.routeDurationHours = new Prisma.Decimal(durationHours);

        const newLoad = await updateLoad(load.id, loadData);

        notify({ title: 'Load updated', message: 'Load updated successfully' });

        // Redirect to load page
        await router.push(`/loads/${newLoad.id}`);

        setLoading(false);
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Edit Load</h1>}>
            <div className={`${load?.rateconDocument ? 'max-w-full' : 'max-w-7xl'}  py-2 mx-auto`}>
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Loads',
                            href: '/loads',
                        },
                        {
                            label: load ? `# ${load.refNum}` : '',
                            href: load ? `/loads/${load.id}` : '',
                        },
                        {
                            label: 'Edit Load',
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Load</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="relative px-5 sm:px-6 md:px-8">
                    {(loading || !load) && <LoadingOverlay />}

                    <div className="relative flex flex-col lg:flex-row  lg:items-start w-full h-full min-h-screen gap-3 mb-4 bg-white rounded-lg">
                        {/* Check if the PDF file exists */}
                        {currentRateconFile ? (
                            <div className="flex-1 overflow-auto">
                                <PDFViewer fileBlob={currentRateconFile} />
                            </div>
                        ) : (
                            load?.rateconDocument && (
                                <div className="flex items-center justify-center flex-1 p-4 font-semi">
                                    <Spinner /> Loading Rate Confirmation...
                                </div>
                            )
                        )}

                        <div
                            className={`flex-1 flex ${
                                currentRateconFile
                                    ? 'relative lg:sticky top-2 overflow-y-scroll lg:max-h-screen bg-white p-1'
                                    : ''
                            } rounded-md `}
                        >
                            <form id="load-form" onSubmit={formHook.handleSubmit(submit)}>
                                <LoadForm
                                    formHook={formHook}
                                    openAddCustomerFromProp={openAddCustomer}
                                    setOpenAddCustomerFromProp={setOpenAddCustomer}
                                    showMissingCustomerLabel={showMissingCustomerLabel}
                                    setShowMissingCustomerLabel={setShowMissingCustomerLabel}
                                    prefillName={prefillName}
                                    setPrefillName={setPrefillName}
                                    parentStopsFieldArray={stopsFieldArray}
                                />
                                <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                                    <div className="flex-1"></div>
                                    <button
                                        type="submit"
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Save Load
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

EditLoad.authenticationEnabled = true;

const EditLoadPageWrapper: PageWithAuth = () => {
    const router = useRouter();
    const { id } = router.query;
    const loadId = id as string;

    return (
        <LoadProvider loadId={loadId}>
            <EditLoad></EditLoad>
        </LoadProvider>
    );
};

EditLoadPageWrapper.authenticationEnabled = true;

export default EditLoadPageWrapper;
