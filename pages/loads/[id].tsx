import { LoadDocument, LoadStatus, RouteLeg, RouteLegStatus } from '@prisma/client';
import RouteLegModal from 'components/assignment/RouteLegModal';
import { RouteLegDataProvider } from 'components/context/RouteLegDataContext';
import { LoadingOverlay } from 'components/LoadingOverlay';
import ActionsDropdown from 'components/loads/load-details/ActionsDropdown';
import LoadAssignmentsSection from 'components/loads/load-details/LoadAssignmentsSection';
import LoadDetailsToolbar from 'components/loads/load-details/LoadDetailsToolbar';
import LoadRouteSection from 'components/loads/load-details/LoadRouteSection';
import { removeRouteLegById } from 'lib/rest/assignment';
import { updateRouteLegStatus } from 'lib/rest/routeLeg';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { ChangeEvent, use, useEffect, useState } from 'react';
import { LoadProvider, useLoadContext } from '../../components/context/LoadContext';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import LoadActivityLog from '../../components/loads/load-details/LoadActivityLog';
import LoadDetailsDocuments from '../../components/loads/load-details/LoadDetailsDocuments';
import LoadDetailsInfo from '../../components/loads/load-details/LoadDetailsInfo';
import { notify } from '../../components/Notification';
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
import { v4 as uuidv4 } from 'uuid';
import { generateStandardizedFileName } from '../../lib/helpers/document-naming';

type Props = {
    loadId: string;
};

const LoadDetailsPage: PageWithAuth<Props> = ({ loadId }: Props) => {
    const [load, setLoad] = useLoadContext();
    const { data: session } = useSession();
    const [openLegAssignment, setOpenLegAssignment] = useState(false);
    const [podDocuments, setPodDocuments] = useState<LoadDocument[]>([]);
    const [bolDocuments, setBolDocuments] = useState<LoadDocument[]>([]);
    const [loadDocuments, setLoadDocuments] = useState<LoadDocument[]>([]);
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

    useEffect(() => {
        if (!load) {
            return;
        }
        // Filter out rateconDocument from loadDocuments since it's displayed separately
        setLoadDocuments(load.loadDocuments || []);
        setPodDocuments(load.podDocuments || []);
        setBolDocuments(load.bolDocuments || []);
    }, [load]);

    const addAssignmentAction = async () => {
        setOpenLegAssignment(true);
    };

    const deleteLoad = async (id: string) => {
        await deleteLoadById(id);

        notify({ title: 'Load deleted', message: 'Load deleted successfully' });

        router.push('/loads');
    };

    const handleUploadDocsChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            // // console.log('No file selected.');
            return;
        }

        setDocsLoading(true);
        try {
            const response = await uploadFileToGCS(file);
            if (response?.uniqueFileName) {
                // Generate standardized filename for general documents
                const standardizedFileName = generateStandardizedFileName(file, 'DOCUMENT', session);

                const simpleDoc: Partial<LoadDocument> = {
                    fileKey: response.uniqueFileName,
                    fileUrl: response.gcsInputUri,
                    fileName: standardizedFileName,
                    fileType: file.type,
                    fileSize: BigInt(file.size),
                };
                const tempDocs = [simpleDoc, ...loadDocuments] as LoadDocument[];
                setLoadDocuments(tempDocs);
                const newLoadDocument = await addLoadDocumentToLoad(load.id, simpleDoc);

                const index = tempDocs.findIndex((ld) => ld.fileKey === simpleDoc.fileKey);
                if (index !== -1) {
                    const newLoadDocuments = [...tempDocs];
                    newLoadDocuments[index] = newLoadDocument;
                    setLoadDocuments(newLoadDocuments);
                    setLoad({ ...load, loadDocuments: newLoadDocuments });
                }
                notify({ title: 'Document uploaded', message: 'Document uploaded successfully' });
            } else {
                notify({ title: 'Error uploading document', message: 'Upload response invalid', type: 'error' });
            }
        } catch (e) {
            notify({ title: 'Error uploading document', message: e.message, type: 'error' });
        }
        event.target.value = '';
        setDocsLoading(false);
    };

    const handleUploadPodsChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            // console.log('No file selected.');
            return;
        }

        setDocsLoading(true);
        try {
            const response = await uploadFileToGCS(file);
            if (response?.uniqueFileName) {
                // Generate standardized filename for POD documents
                const standardizedFileName = generateStandardizedFileName(file, 'POD', session);

                const simpleDoc: Partial<LoadDocument> = {
                    fileKey: response.uniqueFileName,
                    fileUrl: response.gcsInputUri,
                    fileName: standardizedFileName,
                    fileType: file.type,
                    fileSize: BigInt(file.size),
                };
                const tempDocs = [simpleDoc, ...podDocuments] as LoadDocument[];
                setPodDocuments(tempDocs);
                const newPodDocument = await addLoadDocumentToLoad(load.id, simpleDoc, {
                    isPod: true,
                });

                const index = tempDocs.findIndex((ld) => ld.fileKey === simpleDoc.fileKey);
                if (index !== -1) {
                    const newPodDocuments = [...tempDocs];
                    newPodDocuments[index] = newPodDocument;
                    setPodDocuments(newPodDocuments);
                    setLoad({ ...load, podDocuments: newPodDocuments });
                }
                notify({ title: 'POD uploaded', message: 'POD uploaded successfully' });
            } else {
                notify({ title: 'Error uploading POD', message: 'Upload response invalid', type: 'error' });
            }
        } catch (e) {
            notify({ title: 'Error uploading POD', message: e.message, type: 'error' });
        }
        event.target.value = '';
        setDocsLoading(false);
    };

    const handleUploadBolsChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            // console.log('No file selected.');
            return;
        }

        setDocsLoading(true);
        try {
            const response = await uploadFileToGCS(file);
            if (response?.uniqueFileName) {
                // Generate standardized filename for BOL documents
                const standardizedFileName = generateStandardizedFileName(file, 'BOL', session);

                const simpleDoc: Partial<LoadDocument> = {
                    fileKey: response.uniqueFileName,
                    fileUrl: response.gcsInputUri,
                    fileName: standardizedFileName,
                    fileType: file.type,
                    fileSize: BigInt(file.size),
                };
                const tempDocs = [simpleDoc, ...bolDocuments] as LoadDocument[];
                setBolDocuments(tempDocs);
                const newBolDocument = await addLoadDocumentToLoad(load.id, simpleDoc, {
                    isBol: true,
                });

                const index = tempDocs.findIndex((ld) => ld.fileKey === simpleDoc.fileKey);
                if (index !== -1) {
                    const newBolDocuments = [...tempDocs];
                    newBolDocuments[index] = newBolDocument;
                    setBolDocuments(newBolDocuments);
                    setLoad({ ...load, bolDocuments: newBolDocuments });
                }
                notify({ title: 'BOL uploaded', message: 'BOL uploaded successfully' });
            } else {
                notify({ title: 'Error uploading BOL', message: 'Upload response invalid', type: 'error' });
            }
        } catch (e) {
            notify({ title: 'Error uploading BOL', message: e.message, type: 'error' });
        }
        event.target.value = '';
        setDocsLoading(false);
    };

    const handleUploadRateconChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        // Check if a rate con document already exists
        if (load.rateconDocument) {
            event.target.value = '';
            return;
        }

        setDocsLoading(true);
        try {
            const response = await uploadFileToGCS(file);
            if (response?.uniqueFileName) {
                // Generate standardized filename for rate confirmation documents
                const standardizedFileName = generateStandardizedFileName(file, 'RATECON', session);

                const simpleDoc: Partial<LoadDocument> = {
                    fileKey: response.uniqueFileName,
                    fileUrl: response.gcsInputUri,
                    fileName: standardizedFileName,
                    fileType: file.type,
                    fileSize: BigInt(file.size),
                };

                // Upload as rate confirmation document (single document, replaces existing)
                const newRateconDocument = await addLoadDocumentToLoad(load.id, simpleDoc, { isRatecon: true });

                // Update the load with the new rate confirmation document
                setLoad({ ...load, rateconDocument: newRateconDocument });
                notify({ title: 'Rate confirmation uploaded', message: 'Rate confirmation uploaded successfully' });
            } else {
                notify({
                    title: 'Error uploading rate confirmation',
                    message: 'Upload response invalid',
                    type: 'error',
                });
            }
        } catch (e) {
            notify({ title: 'Error uploading rate confirmation', message: e.message, type: 'error' });
        }
        event.target.value = '';
        setDocsLoading(false);
    };

    const deleteLoadDocument = async (id: string) => {
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
    };

    const openDocument = (document: LoadDocument) => {
        window.open(document.fileUrl);
    };

    const changeLoadStatus = async (newStatus: LoadStatus) => {
        if (load) {
            setLoad({ ...load, status: newStatus });
            await updateLoadStatus(load.id, newStatus);
        }
    };

    const openRouteInGoogleMaps = () => {
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
    };

    const downloadCombinedPDF = async () => {
        setDownloadingDocs(true);
        await downloadCombinedPDFForLoad(load, session.user.defaultCarrierId);
        setDownloadingDocs(false);
    };

    const makeCopyOfLoadClicked = async () => {
        router.push(`/loads/create?copyLoadId=${load.id}`);
    };

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

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Load Details</h1>
                    <div className="flex flex-none space-x-2">
                        <ActionsDropdown
                            load={load}
                            disabled={!load}
                            editLoadClicked={() => {
                                router.push(`/loads/edit/${load.id}`);
                            }}
                            viewInvoiceClicked={() => {
                                if (load.invoice) {
                                    router.push(`/invoices/${load.invoice.id}`);
                                }
                            }}
                            createInvoiceClicked={() => {
                                router.push(`/invoices/create-invoice/${load.id}`);
                            }}
                            addAssignmentClicked={addAssignmentAction}
                            downloadCombinedPDF={downloadCombinedPDF}
                            makeCopyOfLoadClicked={makeCopyOfLoadClicked}
                            deleteLoadClicked={() => {
                                setOpenDeleteLoadConfirmation(true);
                            }}
                        ></ActionsDropdown>
                    </div>
                </div>
            }
        >
            <>
                <RouteLegModal
                    show={openLegAssignment}
                    routeLeg={editingRouteLeg}
                    onClose={() => {
                        setOpenLegAssignment(false);
                        setEditingRouteLeg(null);
                    }}
                ></RouteLegModal>
                <SimpleDialog
                    show={openDeleteLoadConfirmation}
                    title="Delete Load"
                    description="Are you sure you want to delete this load?"
                    primaryButtonText="Delete"
                    primaryButtonAction={() => deleteLoad(load.id)}
                    secondaryButtonAction={() => setOpenDeleteLoadConfirmation(false)}
                    onClose={() => setOpenDeleteLoadConfirmation(false)}
                ></SimpleDialog>
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
                ></SimpleDialog>
                <SimpleDialog
                    show={openDeleteLegConfirmation}
                    title="Delete Assignment"
                    description="Are you sure you want to delete this assignment?"
                    primaryButtonText="Delete"
                    primaryButtonAction={confirmDeleteLeg}
                    secondaryButtonAction={() => setOpenDeleteLegConfirmation(false)}
                    onClose={() => setOpenDeleteLegConfirmation(false)}
                />
                <div className="relative max-w-7xl py-2 mx-auto">
                    {downloadingDocs && <LoadingOverlay message="Downloading documents..." />}
                    <BreadCrumb
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
                    ></BreadCrumb>
                    <div className="hidden px-5 mt-4 mb-3 md:block sm:px-6 md:px-8">
                        <div className="flex">
                            <h1 className="flex-1 text-2xl font-semibold text-gray-900">Load Details</h1>
                            <ActionsDropdown
                                load={load}
                                disabled={!load}
                                editLoadClicked={() => {
                                    router.push(`/loads/edit/${load.id}`);
                                }}
                                viewInvoiceClicked={() => {
                                    if (load.invoice) {
                                        router.push(`/invoices/${load.invoice.id}`);
                                    }
                                }}
                                createInvoiceClicked={() => {
                                    router.push(`/invoices/create-invoice/${load.id}`);
                                }}
                                addAssignmentClicked={addAssignmentAction}
                                downloadCombinedPDF={downloadCombinedPDF}
                                makeCopyOfLoadClicked={makeCopyOfLoadClicked}
                                deleteLoadClicked={() => {
                                    setOpenDeleteLoadConfirmation(true);
                                }}
                            ></ActionsDropdown>
                        </div>
                        <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                    </div>

                    <LoadDetailsToolbar
                        className="px-5 py-2 mb-1 bg-white sm:px-6 md:px-8"
                        load={load}
                        disabled={!load}
                        editLoadClicked={() => {
                            router.push(`/loads/edit/${load.id}`);
                        }}
                        viewInvoiceClicked={() => {
                            if (load.invoice) {
                                router.push(`/invoices/${load.invoice.id}`);
                            }
                        }}
                        createInvoiceClicked={() => {
                            router.push(`/invoices/create-invoice/${load.id}`);
                        }}
                        assignDriverClicked={() => setOpenLegAssignment(true)}
                        changeLoadStatus={changeLoadStatus}
                    ></LoadDetailsToolbar>

                    {load ? (
                        <div className="grid grid-cols-1 gap-4 px-5 sm:gap-6  lg:gap-6 sm:px-6 md:px-8">
                            <div>
                                <LoadDetailsInfo />
                                <LoadDetailsDocuments
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
                                />
                            </div>
                            <LoadRouteSection openRouteInGoogleMaps={openRouteInGoogleMaps} />
                            <LoadAssignmentsSection
                                removingRouteLegWithId={removingRouteLegWithId}
                                setOpenLegAssignment={setOpenLegAssignment}
                                changeLegStatusClicked={changeLegStatusClicked}
                                deleteLegClicked={deleteLegClicked}
                                editLegClicked={editLegClicked}
                                openRouteInMapsClicked={openRouteInMapsClicked}
                            />
                            <div className="mt-2">
                                <div className="pb-2 f">
                                    <h3 className="text-base font-semibold leading-6 text-gray-900">Load Activity</h3>
                                    <p className="text-xs text-slate-500">
                                        All changes made on this load are listed below
                                    </p>
                                </div>
                                <div className={`w-full gap-1 bg-neutral-50 border border-slate-100 p-3 rounded-lg`}>
                                    <LoadActivityLog loadId={loadId}></LoadActivityLog>
                                </div>
                            </div>
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
