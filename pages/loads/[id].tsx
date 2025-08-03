import { LoadDocument, LoadStatus, RouteLeg, RouteLegStatus } from '@prisma/client';
import { RouteLegDataProvider } from 'components/context/RouteLegDataContext';
import { LoadingOverlay } from 'components/LoadingOverlay';
import { removeRouteLegById } from 'lib/rest/assignment';
import { updateRouteLegStatus } from 'lib/rest/routeLeg';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { ChangeEvent, useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { LoadProvider, useLoadContext } from '../../components/context/LoadContext';
import { notify } from '../../components/Notification';

// Lazy load expensive components for better performance
const RouteLegModal = lazy(() => import('components/assignment/RouteLegModal'));
const LoadActivitySection = lazy(() => import('../../components/loads/load-details/LoadActivitySection'));
const SimpleDialog = lazy(() => import('../../components/dialogs/SimpleDialog'));

// Static imports for critical rendering path
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import LoadDetailsDocuments from '../../components/loads/load-details/LoadDetailsDocuments';
import LoadDetailsInfo from '../../components/loads/load-details/LoadDetailsInfo';
import LoadDetailsToolbar from '../../components/loads/load-details/LoadDetailsToolbar';
import LoadRouteSection from '../../components/loads/load-details/LoadRouteSection';
import LoadAssignmentsSection from '../../components/loads/load-details/LoadAssignmentsSection';
import ActionsDropdown from 'components/loads/load-details/ActionsDropdown';

// Memoized components for performance optimization
const MemoizedBreadCrumb = React.memo(BreadCrumb);
const MemoizedLoadDetailsToolbar = React.memo(LoadDetailsToolbar);
const MemoizedActionsDropdown = React.memo(ActionsDropdown);
const MemoizedLoadActivitySection = React.memo(LoadActivitySection);
const MemoizedLoadDetailsInfo = React.memo(LoadDetailsInfo);
const MemoizedLoadDetailsDocuments = React.memo(LoadDetailsDocuments);
const MemoizedLoadRouteSection = React.memo(LoadRouteSection);
const MemoizedLoadAssignmentsSection = React.memo(LoadAssignmentsSection);

// Additional imports
import LoadDetailsSkeleton from '../../components/skeletons/LoadDetailsSkeleton';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedRoute, ExpandedRouteLeg } from '../../interfaces/models';
import { downloadCombinedPDFForLoad } from '../../lib/load/download-files';
import {
    addLoadDocumentToLoad,
    deleteLoadById,
    deleteLoadDocumentFromLoad,
    updateLoadStatus,
} from '../../lib/rest/load';
import { uploadFileToGCS } from '../../lib/rest/uploadFile';
import { generateStandardizedFileName } from '../../lib/helpers/document-naming';

type Props = {
    loadId: string;
};

const LoadDetailsPage: PageWithAuth<Props> = ({ loadId }: Props) => {
    const { load, setLoad, loading: loadLoading, error: loadError, loadDocumentsData, refetch } = useLoadContext();
    const { data: session } = useSession();
    const [openLegAssignment, setOpenLegAssignment] = useState(false);
    // Remove separate document states since they're now in the load context
    const [docsLoading, setDocsLoading] = useState(false);
    const [downloadingDocs, setDownloadingDocs] = useState(false);

    const [removingRouteLegWithId, setRemovingRouteLegWithId] = React.useState<string | null>(null);

    const [openDeleteLoadConfirmation, setOpenDeleteLoadConfirmation] = useState(false);
    const [openDeleteDocumentConfirmation, setOpenDeleteDocumentConfirmation] = useState(false);
    const [documentIdToDelete, setDocumentIdToDelete] = useState<string | null>(null);
    const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
    const [editingRouteLeg, setEditingRouteLeg] = useState<ExpandedRouteLeg | null>(null);
    const [openDeleteLegConfirmation, setOpenDeleteLegConfirmation] = useState(false);
    const [legIdToDelete, setLegIdToDelete] = useState<string | null>(null);

    const router = useRouter();

    // Check to see if search query containts editAssignmentID
    const { routeLegId } = router.query;

    // Memoize document arrays to prevent unnecessary re-renders
    const podDocuments = useMemo(() => load?.podDocuments || [], [load?.podDocuments]);
    const bolDocuments = useMemo(() => load?.bolDocuments || [], [load?.bolDocuments]);
    const loadDocuments = useMemo(() => load?.loadDocuments || [], [load?.loadDocuments]);

    useEffect(() => {
        // Check if there's a hash in the URL
        if (router.asPath.includes('#')) {
            const id = router.asPath.split('#')[1];

            // Special case: if hash is 'add-assignment', open the assignment modal
            if (id === 'add-assignment') {
                setTimeout(() => {
                    setOpenLegAssignment(true);
                    // Remove the hash from the URL to prevent modal from reopening on refresh
                    router.replace(`/loads/${loadId}`, undefined, { shallow: true });
                }, 100); // Small delay to ensure component is ready
            } else {
                // Optionally, use a timeout to wait for content to load
                setTimeout(() => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100); // Adjust delay as needed
            }
        }

        if (routeLegId && routeLegId !== 'undefined' && load) {
            editLegClicked(routeLegId as string);
        }
    }, [router.asPath, load, routeLegId, loadId]);

    // Memoized functions to prevent unnecessary re-renders
    const addAssignmentAction = useCallback(async () => {
        setOpenLegAssignment(true);
    }, []);

    const deleteLoad = useCallback(
        async (id: string) => {
            await deleteLoadById(id);
            notify({ title: 'Load deleted', message: 'Load deleted successfully' });
            router.push('/loads');
        },
        [router],
    );

    // Consolidated document upload handler to reduce code duplication
    const handleDocumentUpload = useCallback(
        async (event: ChangeEvent<HTMLInputElement>, documentType: 'DOCUMENT' | 'POD' | 'BOL' | 'RATECON') => {
            const file = event.target.files?.[0];
            if (!file) return;

            setDocsLoading(true);
            try {
                const response = await uploadFileToGCS(file);
                if (!response?.uniqueFileName) {
                    notify({
                        title: `Error uploading ${documentType.toLowerCase()}`,
                        message: 'Upload response invalid',
                        type: 'error',
                    });
                    return;
                }

                const standardizedFileName = generateStandardizedFileName(file, documentType, session);
                const simpleDoc: Partial<LoadDocument> = {
                    fileKey: response.uniqueFileName,
                    fileUrl: response.gcsInputUri,
                    fileName: standardizedFileName,
                    fileType: file.type,
                    fileSize: BigInt(file.size),
                };

                const uploadOptions = {
                    isPod: documentType === 'POD',
                    isBol: documentType === 'BOL',
                    isRatecon: documentType === 'RATECON',
                };

                const newDocument = await addLoadDocumentToLoad(load.id, simpleDoc, uploadOptions);

                // Update load state based on document type
                setLoad((prevLoad) => {
                    switch (documentType) {
                        case 'POD':
                            return { ...prevLoad, podDocuments: [newDocument, ...podDocuments] };
                        case 'BOL':
                            return { ...prevLoad, bolDocuments: [newDocument, ...bolDocuments] };
                        case 'RATECON':
                            return { ...prevLoad, rateconDocument: newDocument };
                        default:
                            return { ...prevLoad, loadDocuments: [newDocument, ...loadDocuments] };
                    }
                });

                const successMessage =
                    documentType === 'RATECON' ? 'Rate confirmation uploaded' : `${documentType} uploaded`;
                notify({ title: successMessage, message: `${successMessage} successfully` });
            } catch (e) {
                notify({ title: `Error uploading ${documentType.toLowerCase()}`, message: e.message, type: 'error' });
            } finally {
                event.target.value = '';
                setDocsLoading(false);
            }
        },
        [load, loadDocuments, podDocuments, bolDocuments, setLoad, session],
    );

    // Specific handlers using the consolidated function
    const handleUploadDocsChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => handleDocumentUpload(event, 'DOCUMENT'),
        [handleDocumentUpload],
    );

    const handleUploadPodsChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => handleDocumentUpload(event, 'POD'),
        [handleDocumentUpload],
    );

    const handleUploadBolsChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => handleDocumentUpload(event, 'BOL'),
        [handleDocumentUpload],
    );

    const handleUploadRateconChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => handleDocumentUpload(event, 'RATECON'),
        [handleDocumentUpload],
    );

    const deleteLoadDocument = useCallback(
        async (id: string) => {
            setDeletingDocumentId(id);
            try {
                const isRatecon = load.rateconDocument?.id === id;
                const isPod = (load.podDocuments || []).some((pod) => pod.id === id);
                const isBol = (load.bolDocuments || []).some((bol) => bol.id === id);

                await deleteLoadDocumentFromLoad(load.id, id, {
                    isPod,
                    isBol,
                    isRatecon,
                });

                if (isRatecon) {
                    // Rate confirmation document is not in loadDocuments array, just clear it
                    setLoad({ ...load, rateconDocument: null });
                } else {
                    // Filter out the deleted document from the appropriate arrays
                    const newLoadDocuments = loadDocuments.filter((ld) => ld.id !== id);
                    const newPodDocuments = podDocuments.filter((ld) => ld.id !== id);
                    const newBolDocuments = bolDocuments.filter((ld) => ld.id !== id);
                    setLoad({
                        ...load,
                        loadDocuments: newLoadDocuments,
                        podDocuments: newPodDocuments,
                        bolDocuments: newBolDocuments,
                    });
                }
                notify({ title: 'Document deleted', message: 'Document deleted successfully' });
            } catch (e) {
                notify({ title: 'Error deleting document', message: e.message, type: 'error' });
            }
            setDeletingDocumentId(null);
            setDocumentIdToDelete(null);
            setOpenDeleteDocumentConfirmation(false);
        },
        [load, loadDocuments, podDocuments, bolDocuments, setLoad],
    );

    const openDocument = useCallback((document: LoadDocument) => {
        window.open(document.fileUrl);
    }, []);

    const changeLoadStatus = useCallback(
        async (newStatus: LoadStatus) => {
            if (load) {
                setLoad({ ...load, status: newStatus });
                await updateLoadStatus(load.id, newStatus);
            }
        },
        [load, setLoad],
    );

    const openRouteInGoogleMaps = useCallback(() => {
        if (load) {
            // origin is the load shipper address
            const origin = `${load.shipper.latitude}, ${load.shipper.longitude}`;
            // destination is the load receiver address
            const destination = `${load.receiver.latitude}, ${load.receiver.longitude}`;
            // waypoints are the load stops, separate by a pipe
            const waypoints =
                load.stops && load.stops.length > 0
                    ? load.stops.map((stop) => `${stop.latitude}, ${stop.longitude}`).join('|')
                    : null;
            const searchParams = new URLSearchParams();
            searchParams.append('api', '1');
            searchParams.append('origin', origin);
            searchParams.append('destination', destination);
            if (waypoints) {
                searchParams.append('waypoints', waypoints);
            }
            searchParams.append('travelmode', 'driving');
            const url = `https://www.google.com/maps/dir/?${searchParams.toString()}`;
            window.open(url);
        }
    }, [load]);

    const downloadCombinedPDF = useCallback(async () => {
        setDownloadingDocs(true);
        await downloadCombinedPDFForLoad(load, session.user.defaultCarrierId);
        setDownloadingDocs(false);
    }, [load, session]);

    const makeCopyOfLoadClicked = useCallback(async () => {
        router.push(`/loads/create?copyLoadId=${load.id}`);
    }, [load, router]);

    const editLegClicked = (legId: string) => {
        const leg = load.route.routeLegs.find((rl) => rl.id === legId) as Partial<RouteLeg>;
        if (leg) {
            setEditingRouteLeg(leg);
            setOpenLegAssignment(true);
        }
    };

    const openRouteInMapsClicked = (legId: string) => {
        // Find the relevant RouteLeg
        const routeLeg = load.route.routeLegs.find((rl) => rl.id === legId);
        if (!routeLeg) return;

        // Get the locations for the route leg
        const routeLegStops = routeLeg.locations || [];

        if (routeLegStops.length > 0) {
            // Origin is the first stop in the route leg, which could be a loadStop or Location
            const originStop = routeLegStops[0].loadStop || routeLegStops[0].location;
            const origin = `${originStop.latitude}, ${originStop.longitude}`;

            // Destination is the last stop in the route leg
            const destinationStop =
                routeLegStops[routeLegStops.length - 1].loadStop || routeLegStops[routeLegStops.length - 1].location;
            const destination = `${destinationStop.latitude}, ${destinationStop.longitude}`;

            // Waypoints are the stops in between the origin and destination
            const waypoints = routeLegStops
                .slice(1, -1) // Exclude the first (origin) and last (destination)
                .map((stop) => {
                    const stopItem = stop.loadStop || stop.location;
                    return `${stopItem.latitude}, ${stopItem.longitude}`;
                })
                .join('|');

            const searchParams = new URLSearchParams();
            searchParams.append('api', '1');
            searchParams.append('origin', origin);
            searchParams.append('destination', destination);
            if (waypoints) {
                searchParams.append('waypoints', waypoints);
            }
            searchParams.append('travelmode', 'driving');

            const url = `https://www.google.com/maps/dir/?${searchParams.toString()}`;
            window.open(url, '_blank');
        }
    };

    const changeLegStatusClicked = async (legStatus: RouteLegStatus, routeLegId: string) => {
        try {
            const { loadStatus, routeLeg: newRouteLeg } = await updateRouteLegStatus(routeLegId, legStatus);

            // Insert the updated route leg into the route
            const updatedRouteLegs = load.route.routeLegs.map((rl) => (rl.id === routeLegId ? newRouteLeg : rl));

            // Update the load context with the updated route legs
            setLoad((prev) => ({
                ...prev,
                status: loadStatus,
                route: {
                    ...prev.route,
                    routeLegs: updatedRouteLegs as ExpandedRoute['routeLegs'],
                },
            }));

            notify({ title: 'Load Assignment Status', message: 'Load assignment successfully updated' });
        } catch (error) {
            notify({ title: 'Error Updating Load Assignment ', type: 'error' });
        }
    };

    const deleteLegClicked = async (legId: string) => {
        setLegIdToDelete(legId);
        setOpenDeleteLegConfirmation(true);
    };

    const confirmDeleteLeg = async () => {
        if (legIdToDelete) {
            setRemovingRouteLegWithId(legIdToDelete);

            try {
                await removeRouteLegById(legIdToDelete);
                setLoad((prev) => ({
                    ...prev,
                    route: {
                        ...prev.route,
                        routeLegs: prev.route.routeLegs.filter((rl) => rl.id !== legIdToDelete),
                    },
                }));
                notify({ title: 'Load Assignment', message: 'Load assignment successfully removed' });
            } catch (e) {
                notify({ title: 'Error Removing Load Assignment', type: 'error' });
            }

            setRemovingRouteLegWithId(null);
            setLegIdToDelete(null);
            setOpenDeleteLegConfirmation(false);
        }
    };

    // Memoized action handlers to prevent unnecessary re-renders
    const actionHandlers = useMemo(
        () => ({
            editLoad: () => router.push(`/loads/edit/${load?.id}`),
            viewInvoice: () => load?.invoice && router.push(`/invoices/${load.invoice.id}`),
            createInvoice: () => router.push(`/invoices/create-invoice/${load?.id}`),
            addAssignment: addAssignmentAction,
            downloadCombinedPDF,
            makeCopyOfLoad: makeCopyOfLoadClicked,
            deleteLoad: () => setOpenDeleteLoadConfirmation(true),
            assignDriver: () => setOpenLegAssignment(true),
            changeLoadStatus,
        }),
        [
            load?.id,
            load?.invoice,
            router,
            addAssignmentAction,
            downloadCombinedPDF,
            makeCopyOfLoadClicked,
            changeLoadStatus,
        ],
    );
    if (loadLoading && !load) {
        return (
            <Layout
                smHeaderComponent={
                    <div className="flex items-center">
                        <h1 className="flex-1 text-xl font-semibold text-gray-900">Loading Load...</h1>
                    </div>
                }
            >
                <LoadDetailsSkeleton />
            </Layout>
        );
    }

    // Show error state
    if (loadError && !load) {
        return (
            <Layout
                smHeaderComponent={
                    <div className="flex items-center">
                        <h1 className="flex-1 text-xl font-semibold text-gray-900">Error</h1>
                    </div>
                }
            >
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Error loading load</h2>
                        <p className="text-gray-600 mb-4">{loadError}</p>
                        <button
                            onClick={refetch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    // Show loading skeleton if load is not available yet
    if (!load) {
        return (
            <Layout
                smHeaderComponent={
                    <div className="flex items-center">
                        <h1 className="flex-1 text-xl font-semibold text-gray-900">Load Details</h1>
                    </div>
                }
            >
                <LoadDetailsSkeleton />
            </Layout>
        );
    }

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Load Details</h1>
                    <div className="flex flex-none space-x-2">
                        <MemoizedActionsDropdown
                            load={load}
                            disabled={!load}
                            editLoadClicked={actionHandlers.editLoad}
                            viewInvoiceClicked={actionHandlers.viewInvoice}
                            createInvoiceClicked={actionHandlers.createInvoice}
                            addAssignmentClicked={actionHandlers.addAssignment}
                            downloadCombinedPDF={actionHandlers.downloadCombinedPDF}
                            makeCopyOfLoadClicked={actionHandlers.makeCopyOfLoad}
                            deleteLoadClicked={actionHandlers.deleteLoad}
                        />
                    </div>
                </div>
            }
        >
            <>
                <Suspense fallback={<div />}>
                    <RouteLegModal
                        show={openLegAssignment}
                        routeLeg={editingRouteLeg}
                        onClose={() => {
                            setOpenLegAssignment(false);
                            setEditingRouteLeg(null);
                        }}
                    />
                    <SimpleDialog
                        show={openDeleteLoadConfirmation}
                        title="Delete Load"
                        description="Are you sure you want to delete this load?"
                        primaryButtonText="Delete"
                        primaryButtonAction={() => deleteLoad(load.id)}
                        secondaryButtonAction={() => setOpenDeleteLoadConfirmation(false)}
                        onClose={() => setOpenDeleteLoadConfirmation(false)}
                    />
                    <SimpleDialog
                        show={openDeleteDocumentConfirmation}
                        title="Delete Document"
                        description="Are you sure you want to delete this document?"
                        primaryButtonText="Delete"
                        primaryButtonAction={() => {
                            if (documentIdToDelete) {
                                deleteLoadDocument(documentIdToDelete);
                            }
                        }}
                        secondaryButtonAction={() => {
                            setOpenDeleteDocumentConfirmation(false);
                            setDocumentIdToDelete(null);
                        }}
                        onClose={() => {
                            setOpenDeleteDocumentConfirmation(false);
                            setDocumentIdToDelete(null);
                        }}
                    />
                    <SimpleDialog
                        show={openDeleteLegConfirmation}
                        title="Delete Assignment"
                        description="Are you sure you want to delete this assignment?"
                        primaryButtonText="Delete"
                        primaryButtonAction={confirmDeleteLeg}
                        secondaryButtonAction={() => setOpenDeleteLegConfirmation(false)}
                        onClose={() => setOpenDeleteLegConfirmation(false)}
                    />
                </Suspense>
                <div className="relative max-w-7xl py-2 mx-auto">
                    {downloadingDocs && <LoadingOverlay message="Downloading documents..." />}
                    <MemoizedBreadCrumb
                        className="sm:px-6 md:px-8"
                        paths={[
                            {
                                label: 'Loads',
                                href: '/loads',
                            },
                            {
                                label: load ? `${load.refNum}` : '',
                            },
                        ]}
                    />
                    <div className="hidden px-5 mt-4 mb-3 md:block sm:px-6 md:px-8">
                        <div className="flex">
                            <h1 className="flex-1 text-2xl font-semibold text-gray-900">Load Details</h1>
                            <MemoizedActionsDropdown
                                load={load}
                                disabled={!load}
                                editLoadClicked={actionHandlers.editLoad}
                                viewInvoiceClicked={actionHandlers.viewInvoice}
                                createInvoiceClicked={actionHandlers.createInvoice}
                                addAssignmentClicked={actionHandlers.addAssignment}
                                downloadCombinedPDF={actionHandlers.downloadCombinedPDF}
                                makeCopyOfLoadClicked={actionHandlers.makeCopyOfLoad}
                                deleteLoadClicked={actionHandlers.deleteLoad}
                            />
                        </div>
                        <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                    </div>

                    <MemoizedLoadDetailsToolbar
                        className="px-5 py-2 mb-1 bg-white sm:px-6 md:px-8"
                        load={load}
                        disabled={!load}
                        editLoadClicked={actionHandlers.editLoad}
                        viewInvoiceClicked={actionHandlers.viewInvoice}
                        createInvoiceClicked={actionHandlers.createInvoice}
                        assignDriverClicked={actionHandlers.assignDriver}
                        changeLoadStatus={actionHandlers.changeLoadStatus}
                    />

                    {load ? (
                        <div className="grid grid-cols-1 gap-4 px-5 sm:gap-6  lg:gap-6 sm:px-6 md:px-8">
                            <div>
                                <MemoizedLoadDetailsInfo />
                                <MemoizedLoadDetailsDocuments
                                    podDocuments={podDocuments}
                                    bolDocuments={bolDocuments}
                                    loadDocuments={loadDocuments}
                                    rateconDocument={load.rateconDocument}
                                    docsLoading={docsLoading}
                                    handleUploadPodsChange={handleUploadPodsChange}
                                    handleUploadBolsChange={handleUploadBolsChange}
                                    handleUploadDocsChange={handleUploadDocsChange}
                                    handleUploadRateconChange={handleUploadRateconChange}
                                    openDocument={openDocument}
                                    setDocumentIdToDelete={setDocumentIdToDelete}
                                    setOpenDeleteDocumentConfirmation={setOpenDeleteDocumentConfirmation}
                                    deletingDocumentId={deletingDocumentId}
                                    documentIdToDelete={documentIdToDelete}
                                    loadDocumentsData={loadDocumentsData}
                                />
                            </div>
                            <MemoizedLoadRouteSection openRouteInGoogleMaps={openRouteInGoogleMaps} />
                            <MemoizedLoadAssignmentsSection
                                removingRouteLegWithId={removingRouteLegWithId}
                                setOpenLegAssignment={setOpenLegAssignment}
                                changeLegStatusClicked={changeLegStatusClicked}
                                deleteLegClicked={deleteLegClicked}
                                editLegClicked={editLegClicked}
                                openRouteInMapsClicked={openRouteInMapsClicked}
                            />
                            <Suspense
                                fallback={
                                    <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                                        Loading activity...
                                    </div>
                                }
                            >
                                <MemoizedLoadActivitySection loadId={loadId} />
                            </Suspense>
                        </div>
                    ) : (
                        <div className="px-5 sm:px-6 md:px-8">
                            <LoadDetailsSkeleton></LoadDetailsSkeleton>
                        </div>
                    )}
                </div>
            </>
        </Layout>
    );
};

LoadDetailsPage.authenticationEnabled = true;

const LoadDetailsPageWrapper: PageWithAuth = () => {
    const router = useRouter();
    const { id } = router.query;
    const loadId = id as string;

    return (
        <LoadProvider loadId={loadId}>
            <RouteLegDataProvider>
                <LoadDetailsPage loadId={loadId}></LoadDetailsPage>
            </RouteLegDataProvider>
        </LoadProvider>
    );
};

LoadDetailsPageWrapper.authenticationEnabled = true;

export default LoadDetailsPageWrapper;
