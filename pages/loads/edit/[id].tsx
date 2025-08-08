import { Prisma } from '@prisma/client';
import { LoadProvider, useLoadContext } from 'components/context/LoadContext';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import LoadForm from '../../../components/forms/load/LoadForm';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import Layout from '../../../components/layout/Layout';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { notify } from '../../../components/notifications/Notification';
import { PageWithAuth } from '../../../interfaces/auth';
import type { ExpandedLoad } from '../../../interfaces/models';
import { getGeocoding, getRouteForCoords } from '../../../lib/mapbox/searchGeo';
import { updateLoad } from '../../../lib/rest/load';
import PDFViewer from 'components/PDFViewer';
import Spinner from 'components/Spinner';

const EditLoad: PageWithAuth = () => {
    const { load, setLoad } = useLoadContext();
    const router = useRouter();

    const formHook = useForm<ExpandedLoad>();

    const [loading, setLoading] = React.useState(false);

    const [openAddCustomer, setOpenAddCustomer] = React.useState(false);
    const [showMissingCustomerLabel, setShowMissingCustomerLabel] = React.useState(false);
    const [prefillName, setPrefillName] = React.useState(null);
    const [currentRateconFile, setCurrentRateconFile] = React.useState<File>(null);
    const [downloadRateconFile, setDownloadRateconFile] = React.useState(false);

    const stopsFieldArray = useFieldArray({ name: 'stops', control: formHook.control });

    // Memoize PDF viewer to prevent unnecessary re-renders
    const pdfViewer = useMemo(() => {
        if (!currentRateconFile) return null;
        return <PDFViewer fileBlob={currentRateconFile} />;
    }, [currentRateconFile]);

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

    const resetForm = () => {
        if (!load) return;

        // Reset form to original load data
        formHook.reset();
        formHook.setValue('customer', load.customer);
        formHook.setValue('loadNum', load.loadNum);
        formHook.setValue('rate', load.rate);
        formHook.setValue('shipper', load.shipper);
        formHook.setValue('receiver', load.receiver);
        formHook.setValue('stops', load.stops);

        // Reset customer form states
        setOpenAddCustomer(false);
        setShowMissingCustomerLabel(false);
        setPrefillName(null);
    };

    const submit = async (data: ExpandedLoad) => {
        // Validate that a customer is selected
        if (!data.customer) {
            notify({
                title: 'Customer Required',
                message: 'Please select a customer before updating the load.',
                type: 'error',
            });
            setLoading(false);
            return;
        }

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
            <div className="max-w-[1980px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <BreadCrumb
                    className="md:mb-6"
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
                />

                <div className="relative top-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 py-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Load</h1>
                </div>

                {(loading || !load) && (
                    <LoadingOverlay message={loading ? 'Updating load...' : 'Loading load data...'} />
                )}

                <div className="flex gap-6 flex-col md:flex-row">
                    {/* Left side - PDF viewer */}
                    <div
                        className={`${
                            currentRateconFile ? 'w-full md:w-[55%]' : 'w-full md:w-1/4'
                        } transition-all duration-300`}
                    >
                        {!currentRateconFile ? (
                            <div className="sticky top-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-200">
                                    <h2 className="text-lg font-medium text-gray-900">Rate Confirmation</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {downloadRateconFile
                                            ? 'Loading rate confirmation document...'
                                            : load?.rateconDocument
                                            ? 'Rate confirmation document loading...'
                                            : 'No rate confirmation document available'}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center justify-center p-12">
                                    {downloadRateconFile || load?.rateconDocument ? (
                                        <div className="flex items-center justify-center p-4">
                                            <Spinner className="text-blue-600" />
                                            <span className="ml-2 text-sm text-gray-600">
                                                Loading Rate Confirmation...
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="p-6 rounded-full bg-gray-100 mb-4">
                                                <svg
                                                    className="h-12 w-12 text-gray-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-medium text-gray-700 mb-2">
                                                No Rate Confirmation
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                This load doesn&apos;t have a rate confirmation document attached.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="block bg-white border border-gray-200 rounded-lg overflow-hidden overflow-y-visible">
                                <div className="relative p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between overflow-hidden">
                                    <div className="flex items-center overflow-hidden">
                                        <svg
                                            className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                            />
                                        </svg>
                                        <span className="font-medium text-gray-700 text-sm truncate">
                                            {currentRateconFile.name} ({Math.round(currentRateconFile.size / 1024)} KB)
                                        </span>
                                    </div>
                                </div>
                                {/* PDF Viewer Component */}
                                {pdfViewer}
                            </div>
                        )}
                    </div>

                    {/* Right side - Form */}
                    <div
                        className={`${
                            currentRateconFile ? 'w-full md:w-[45%]' : 'w-full md:w-3/4'
                        } transition-all duration-300 flex-shrink-0`}
                    >
                        {/* This div makes the form panel sticky and defines its fixed height. */}
                        {/* LoadForm inside will use h-full to fill this height and manage its own internal scroll. */}
                        <div
                            className={`sticky top-4 bg-white border border-gray-200 overflow-hidden rounded-lg h-full ${
                                currentRateconFile ? 'md:h-[85vh]' : 'h-full'
                            }`}
                        >
                            <form id="load-form" onSubmit={formHook.handleSubmit(submit)} className="h-full">
                                <LoadForm
                                    formHook={formHook}
                                    openAddCustomerFromProp={openAddCustomer}
                                    setOpenAddCustomerFromProp={setOpenAddCustomer}
                                    showMissingCustomerLabel={showMissingCustomerLabel}
                                    setShowMissingCustomerLabel={setShowMissingCustomerLabel}
                                    prefillName={prefillName}
                                    setPrefillName={setPrefillName}
                                    parentStopsFieldArray={stopsFieldArray}
                                    loading={loading}
                                    onResetForm={resetForm}
                                    isEditMode={true}
                                />
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
