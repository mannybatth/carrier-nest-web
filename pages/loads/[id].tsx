import { Menu, Transition } from '@headlessui/react';
import {
    ArrowTopRightOnSquareIcon,
    ArrowUpTrayIcon,
    ChevronDownIcon,
    MapPinIcon,
    PaperClipIcon,
    StopIcon,
    TrashIcon,
    TruckIcon,
} from '@heroicons/react/24/outline';
import { LoadDocument, LoadStatus, Prisma } from '@prisma/client';
import classNames from 'classnames';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { ChangeEvent, Fragment, useEffect, useState } from 'react';
import { formatValue } from 'react-currency-input-field';
import { LoadProvider, useLoadContext } from '../../components/context/LoadContext';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import DriverSelectionModal from '../../components/drivers/DriverSelectionModal';
import { DownloadInvoicePDFButton } from '../../components/invoices/invoicePdf';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import LoadActivityLog from '../../components/loads/LoadActivityLog';
import LoadStatusBadge from '../../components/loads/LoadStatusBadge';
import { notify } from '../../components/Notification';
import LoadDetailsSkeleton from '../../components/skeletons/LoadDetailsSkeleton';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad } from '../../interfaces/models';
import { metersToMiles } from '../../lib/helpers/distance';
import { secondsToReadable } from '../../lib/helpers/time';
import { downloadCombinedPDFForLoad } from '../../lib/load/download-files';
import { isDate24HrInThePast, loadStatus, UILoadStatus } from '../../lib/load/load-utils';
import {
    addLoadDocumentToLoad,
    deleteLoadById,
    deleteLoadDocumentFromLoad,
    updateLoadStatus,
} from '../../lib/rest/load';
import { uploadFileToGCS } from '../../lib/rest/uploadFile';
import { LoadingOverlay } from 'components/LoadingOverlay';

type ActionsDropdownProps = {
    load: ExpandedLoad;
    disabled: boolean;
    editLoadClicked: () => void;
    viewInvoiceClicked?: () => void;
    createInvoiceClicked?: () => void;
    assignDriverClicked: () => void;
    downloadCombinedPDF: () => void;
    makeCopyOfLoadClicked: () => void;
    deleteLoadClicked: () => void;
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({
    load,
    disabled,
    editLoadClicked,
    viewInvoiceClicked,
    createInvoiceClicked,
    assignDriverClicked,
    downloadCombinedPDF,
    makeCopyOfLoadClicked,
    deleteLoadClicked,
}) => {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button
                    className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
                    disabled={disabled}
                >
                    Actions
                    <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" aria-hidden="true" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        editLoadClicked();
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Edit
                                </a>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (load.invoice) {
                                            viewInvoiceClicked();
                                        } else {
                                            createInvoiceClicked();
                                        }
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    {load.invoice ? 'Go to Invoice' : 'Create Invoice'}
                                </a>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        assignDriverClicked();
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Add/Remove Driver
                                </a>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        downloadCombinedPDF();
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Download Combined PDF
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        makeCopyOfLoadClicked();
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Make Copy of Load
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteLoadClicked();
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Delete
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

type ToolbarProps = {
    className?: string;
    load: ExpandedLoad;
    disabled: boolean;
    editLoadClicked: () => void;
    viewInvoiceClicked?: () => void;
    createInvoiceClicked?: () => void;
    assignDriverClicked: () => void;
    changeLoadStatus: (newStatus: LoadStatus) => void;
};

const Toolbar: React.FC<ToolbarProps> = ({
    className,
    load,
    disabled,
    editLoadClicked,
    viewInvoiceClicked,
    createInvoiceClicked,
    assignDriverClicked,
    changeLoadStatus,
}) => {
    const [dropOffDatePassed, setDropOffDatePassed] = useState(false);
    const [loadStatusValue, setLoadStatusValue] = useState(null);

    useEffect(() => {
        if (load) {
            setDropOffDatePassed(isDate24HrInThePast(new Date(load.receiver.date)));
            setLoadStatusValue(loadStatus(load));
        }
    }, [load]);

    return (
        <div className={`flex flex-row place-content-between ${className}`}>
            <span className="hidden rounded-md shadow-sm md:inline-flex isolate">
                <button
                    type="button"
                    className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-900 bg-white md:text-sm rounded-l-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 active:bg-gray-100"
                    onClick={editLoadClicked}
                    disabled={disabled}
                >
                    Edit Load
                </button>
                <button
                    type="button"
                    className="relative inline-flex items-center px-3 py-2 -ml-px text-xs font-semibold text-gray-900 bg-white md:text-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 active:bg-gray-100"
                    onClick={assignDriverClicked}
                    disabled={disabled}
                >
                    Add/Remove Drivers
                </button>
                <button
                    type="button"
                    className="relative inline-flex items-center px-3 py-2 -ml-px text-xs font-semibold text-gray-900 bg-white md:text-sm rounded-r-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 active:bg-gray-100"
                    onClick={() => {
                        if (load.invoice) {
                            viewInvoiceClicked();
                        } else {
                            createInvoiceClicked();
                        }
                    }}
                    disabled={disabled}
                >
                    {load?.invoice ? 'Go to Invoice' : 'Create Invoice'}
                </button>
            </span>

            <span className="inline-flex rounded-md shadow-sm isolate">
                {load &&
                    !dropOffDatePassed &&
                    (loadStatusValue === UILoadStatus.BOOKED ||
                        loadStatusValue === UILoadStatus.IN_PROGRESS ||
                        loadStatusValue === UILoadStatus.DELIVERED) && (
                        <div className="relative inline-flex rounded-md shadow-sm">
                            <button
                                type="button"
                                className="relative inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 bg-white rounded-l-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
                            >
                                Status: {loadStatusValue.toUpperCase()}
                            </button>
                            <Menu as="div" className="block -ml-px">
                                <Menu.Button className="relative inline-flex items-center h-full px-2 py-2 text-gray-400 bg-white rounded-r-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10">
                                    <span className="sr-only">Open options</span>
                                    <ChevronDownIcon className="w-5 h-5" aria-hidden="true" />
                                </Menu.Button>
                                <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-100"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-75"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                >
                                    <Menu.Items className="absolute left-0 z-10 w-56 mt-2 -mr-1 origin-top-right bg-white rounded-md shadow-lg md:right-0 md:left-auto ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        <div className="py-1">
                                            {loadStatusValue !== UILoadStatus.BOOKED && (
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <a
                                                            onClick={() => changeLoadStatus(LoadStatus.CREATED)}
                                                            className={classNames(
                                                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                                'block px-4 py-2 text-sm',
                                                            )}
                                                        >
                                                            Change status to Booked
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                            )}
                                            {loadStatusValue !== UILoadStatus.IN_PROGRESS && (
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <a
                                                            onClick={() => changeLoadStatus(LoadStatus.IN_PROGRESS)}
                                                            className={classNames(
                                                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                                'block px-4 py-2 text-sm',
                                                            )}
                                                        >
                                                            Change status to In Progress
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                            )}
                                            {loadStatusValue !== UILoadStatus.DELIVERED && (
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <a
                                                            onClick={() => changeLoadStatus(LoadStatus.DELIVERED)}
                                                            className={classNames(
                                                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                                'block px-4 py-2 text-sm',
                                                            )}
                                                        >
                                                            Change status to Delivered
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                            )}
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        </div>
                    )}
            </span>
        </div>
    );
};

type Props = {
    loadId: string;
};

const LoadDetailsPage: PageWithAuth<Props> = ({ loadId }: Props) => {
    const [load, setLoad] = useLoadContext();
    const { data: session } = useSession();
    const [openSelectDriver, setOpenSelectDriver] = useState(false);
    const [podDocuments, setPodDocuments] = useState<LoadDocument[]>([]);
    const [loadDocuments, setLoadDocuments] = useState<LoadDocument[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [downloadingDocs, setDownloadingDocs] = useState(false);

    const [openDeleteLoadConfirmation, setOpenDeleteLoadConfirmation] = useState(false);
    const [openDeleteDocumentConfirmation, setOpenDeleteDocumentConfirmation] = useState(false);
    const [documentIdToDelete, setDocumentIdToDelete] = useState<string | null>(null);

    const router = useRouter();

    let podFileInput: HTMLInputElement;
    let docFileInput: HTMLInputElement;

    useEffect(() => {
        if (!load) {
            return;
        }
        setLoadDocuments([load.rateconDocument, ...load.loadDocuments].filter((ld) => ld));
        setPodDocuments(load.podDocuments || []);
    }, [load]);

    const assignDriverAction = async () => {
        setOpenSelectDriver(true);
    };

    const deleteLoad = async (id: string) => {
        await deleteLoadById(id);

        notify({ title: 'Load deleted', message: 'Load deleted successfully' });

        router.push('/loads');
    };

    const handleUploadDocsChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            console.log('No file selected.');
            return;
        }

        setDocsLoading(true);
        try {
            const response = await uploadFileToGCS(file);
            if (response?.uniqueFileName) {
                const simpleDoc: Partial<LoadDocument> = {
                    fileKey: response.uniqueFileName,
                    fileUrl: response.gcsInputUri,
                    fileName: response.originalFileName,
                    fileType: file.type,
                    fileSize: file.size,
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
            console.log('No file selected.');
            return;
        }

        setDocsLoading(true);
        try {
            const response = await uploadFileToGCS(file);
            if (response?.uniqueFileName) {
                const simpleDoc: Partial<LoadDocument> = {
                    fileKey: response.uniqueFileName,
                    fileUrl: response.gcsInputUri,
                    fileName: response.originalFileName,
                    fileType: file.type,
                    fileSize: file.size,
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

    const deleteLoadDocument = async (id: string) => {
        setDocsLoading(true);
        try {
            const isRatecon = load.rateconDocument?.id === id;
            await deleteLoadDocumentFromLoad(load.id, id, {
                isPod: load.podDocuments.some((pod) => pod.id === id),
                isRatecon,
            });
            if (isRatecon) {
                const newLoadDocuments = loadDocuments.filter((ld) => ld.id !== id);
                setLoad({ ...load, loadDocuments: newLoadDocuments, rateconDocument: null });
            } else {
                const newLoadDocuments = loadDocuments.filter(
                    (ld) => ld.id !== id && ld.id !== load.rateconDocument?.id,
                );
                const newPodDocuments = podDocuments.filter((ld) => ld.id !== id);
                setLoad({ ...load, loadDocuments: newLoadDocuments, podDocuments: newPodDocuments });
            }
            notify({ title: 'Document deleted', message: 'Document deleted successfully' });
        } catch (e) {
            notify({ title: 'Error deleting document', message: e.message, type: 'error' });
        }
        setDocsLoading(false);
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
                                    router.push(`/accounting/invoices/${load.invoice.id}`);
                                }
                            }}
                            createInvoiceClicked={() => {
                                router.push(`/accounting/create-invoice/${load.id}`);
                            }}
                            assignDriverClicked={assignDriverAction}
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
                <DriverSelectionModal
                    show={openSelectDriver}
                    onClose={() => setOpenSelectDriver(false)}
                ></DriverSelectionModal>
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
                <div className="relative max-w-4xl py-2 mx-auto">
                    {downloadingDocs && <LoadingOverlay />}
                    <BreadCrumb
                        className="sm:px-6 md:px-8"
                        paths={[
                            {
                                label: 'Loads',
                                href: '/loads',
                            },
                            {
                                label: load ? `# ${load.refNum}` : '',
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
                                        router.push(`/accounting/invoices/${load.invoice.id}`);
                                    }
                                }}
                                createInvoiceClicked={() => {
                                    router.push(`/accounting/create-invoice/${load.id}`);
                                }}
                                assignDriverClicked={assignDriverAction}
                                downloadCombinedPDF={downloadCombinedPDF}
                                makeCopyOfLoadClicked={makeCopyOfLoadClicked}
                                deleteLoadClicked={() => {
                                    setOpenDeleteLoadConfirmation(true);
                                }}
                            ></ActionsDropdown>
                        </div>
                        <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                    </div>

                    <Toolbar
                        className="px-5 mb-3 sm:px-6 md:px-8"
                        load={load}
                        disabled={!load}
                        editLoadClicked={() => {
                            router.push(`/loads/edit/${load.id}`);
                        }}
                        viewInvoiceClicked={() => {
                            if (load.invoice) {
                                router.push(`/accounting/invoices/${load.invoice.id}`);
                            }
                        }}
                        createInvoiceClicked={() => {
                            router.push(`/accounting/create-invoice/${load.id}`);
                        }}
                        assignDriverClicked={assignDriverAction}
                        changeLoadStatus={changeLoadStatus}
                    ></Toolbar>

                    {load && load.routeEncoded && (
                        <Image
                            src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/path-5(${encodeURIComponent(
                                load.routeEncoded,
                            )})/auto/900x300?padding=50,50,50,50&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                            width={900}
                            height={300}
                            alt="Load Route"
                            loading="lazy"
                            className="w-full h-auto mb-3"
                        ></Image>
                    )}
                    <div className="grid grid-cols-8 gap-2 px-5 sm:gap-8 md:gap-2 lg:gap-8 sm:px-6 md:px-8">
                        {load ? (
                            <>
                                <div className="col-span-8 sm:col-span-3 md:col-span-8 lg:col-span-3">
                                    <aside className="bg-white border-gray-200">
                                        <div className="pb-0 space-y-6 lg:pb-10">
                                            <dl className="border-gray-200 divide-y divide-gray-200">
                                                <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                                                    <dt className="text-gray-500">Load/Order #</dt>
                                                    <dd className="text-right text-gray-900">{load.refNum}</dd>
                                                </div>
                                                <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                                                    <dt className="text-gray-500">Status</dt>
                                                    <dd className="text-right text-gray-900">
                                                        <LoadStatusBadge load={load} />
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                                                    <dt className="text-gray-500">Customer</dt>
                                                    <dd className="text-right text-gray-900">
                                                        {load.customer && (
                                                            <Link href={`/customers/${load.customer.id}`}>
                                                                {load.customer?.name}
                                                            </Link>
                                                        )}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                                                    <dt className="text-gray-500">Drivers</dt>
                                                    <dd className="text-right text-gray-900">
                                                        {load.drivers.length > 0 ? (
                                                            load.drivers.map((driver) => (
                                                                <div key={driver.id}>
                                                                    <Link href={`/drivers/${driver.id}`} passHref>
                                                                        {driver.name}
                                                                    </Link>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <a onClick={() => setOpenSelectDriver(true)}>
                                                                Assign Driver
                                                            </a>
                                                        )}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                                                    <dt className="text-gray-500">Rate</dt>
                                                    <dd className="text-right text-gray-900">
                                                        {formatValue({
                                                            value: load.rate.toString(),
                                                            groupSeparator: ',',
                                                            decimalSeparator: '.',
                                                            prefix: '$',
                                                            decimalScale: 2,
                                                        })}
                                                    </dd>
                                                </div>
                                                {load.routeDistance && (
                                                    <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                                                        <dt className="text-gray-500">Route Distance</dt>
                                                        <dd className="text-right text-gray-900">
                                                            {metersToMiles(
                                                                new Prisma.Decimal(load.routeDistance).toNumber(),
                                                            ).toFixed(0)}{' '}
                                                            miles
                                                        </dd>
                                                    </div>
                                                )}
                                                {load.routeDuration && (
                                                    <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                                                        <dt className="text-gray-500">Travel Time</dt>
                                                        <dd className="text-right text-gray-900">
                                                            {secondsToReadable(
                                                                new Prisma.Decimal(load.routeDuration).toNumber(),
                                                            )}
                                                        </dd>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                                                        <dt className="text-gray-500">Invoice</dt>
                                                        <dd className="text-right text-gray-900">
                                                            {load.invoice ? (
                                                                <Link
                                                                    href={`/accounting/invoices/${load.invoice.id}`}
                                                                    passHref
                                                                >
                                                                    # {load.invoice?.invoiceNum}
                                                                </Link>
                                                            ) : (
                                                                <Link href={`/accounting/create-invoice/${load.id}`}>
                                                                    Create Invoice
                                                                </Link>
                                                            )}
                                                        </dd>
                                                    </div>
                                                    {load.invoice ? (
                                                        <div className="mb-2 border border-gray-200 divide-y divide-gray-200 rounded-md">
                                                            <DownloadInvoicePDFButton
                                                                invoice={load.invoice}
                                                                customer={load.customer}
                                                                load={load}
                                                                fileName={`invoice-${load.invoice.invoiceNum}.pdf`}
                                                            />
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div>
                                                    <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                                                        <dt className="text-gray-500">PODs</dt>
                                                        <dd className="text-gray-900">
                                                            <div>
                                                                <input
                                                                    type="file"
                                                                    onChange={handleUploadPodsChange}
                                                                    style={{ display: 'none' }}
                                                                    ref={(input) => (podFileInput = input)}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="inline-flex items-center px-3 py-1 ml-5 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                                    onClick={() => podFileInput.click()}
                                                                    disabled={docsLoading}
                                                                >
                                                                    <ArrowUpTrayIcon className="w-4 h-4 mr-1 text-gray-500" />
                                                                    <span className="block md:hidden">Upload POD</span>
                                                                    <span className="hidden md:block">Upload POD</span>
                                                                </button>
                                                            </div>
                                                        </dd>
                                                    </div>
                                                    {podDocuments.length > 0 && (
                                                        <ul
                                                            role="list"
                                                            className="mb-2 border border-gray-200 divide-y divide-gray-200 rounded-md"
                                                        >
                                                            {podDocuments.map((doc, index) => (
                                                                <li key={`pod-doc-${index}`}>
                                                                    <div className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100">
                                                                        <div
                                                                            className="flex items-center flex-1 py-2 pl-3 pr-4"
                                                                            onClick={() => openDocument(doc)}
                                                                        >
                                                                            <PaperClipIcon
                                                                                className="flex-shrink-0 w-4 h-4 text-gray-400"
                                                                                aria-hidden="true"
                                                                            />
                                                                            <span className="flex-1 w-0 ml-2 truncate">
                                                                                {doc.fileName}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex-shrink-0 ml-2">
                                                                            <button
                                                                                type="button"
                                                                                className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setDocumentIdToDelete(doc.id);
                                                                                    setOpenDeleteDocumentConfirmation(
                                                                                        true,
                                                                                    );
                                                                                }}
                                                                                disabled={docsLoading}
                                                                            >
                                                                                <TrashIcon className="flex-shrink-0 w-4 h-4 text-gray-800"></TrashIcon>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                                                        <dt className="text-gray-500">Documents</dt>
                                                        <dd className="text-gray-900">
                                                            <div>
                                                                <input
                                                                    type="file"
                                                                    onChange={handleUploadDocsChange}
                                                                    style={{ display: 'none' }}
                                                                    ref={(input) => (docFileInput = input)}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="inline-flex items-center px-3 py-1 ml-5 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                                    onClick={() => docFileInput.click()}
                                                                    disabled={docsLoading}
                                                                >
                                                                    <ArrowUpTrayIcon className="w-4 h-4 mr-1 text-gray-500" />
                                                                    <span className="block md:hidden">Upload</span>
                                                                    <span className="hidden md:block">Upload Doc</span>
                                                                </button>
                                                            </div>
                                                        </dd>
                                                    </div>
                                                    {loadDocuments.length > 0 && (
                                                        <ul
                                                            role="list"
                                                            className="mb-2 border border-gray-200 divide-y divide-gray-200 rounded-md"
                                                        >
                                                            {loadDocuments.map((doc, index) => (
                                                                <li key={`doc-${index}`}>
                                                                    <div className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100">
                                                                        <div
                                                                            className="flex items-center flex-1 py-2 pl-3 pr-4"
                                                                            onClick={() => openDocument(doc)}
                                                                        >
                                                                            <PaperClipIcon
                                                                                className="flex-shrink-0 w-4 h-4 text-gray-400"
                                                                                aria-hidden="true"
                                                                            />
                                                                            <span className="flex-1 w-0 ml-2 truncate">
                                                                                {doc.fileName}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex-shrink-0 ml-2">
                                                                            <button
                                                                                type="button"
                                                                                className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setDocumentIdToDelete(doc.id);
                                                                                    setOpenDeleteDocumentConfirmation(
                                                                                        true,
                                                                                    );
                                                                                }}
                                                                                disabled={docsLoading}
                                                                            >
                                                                                <TrashIcon className="flex-shrink-0 w-4 h-4 text-gray-800"></TrashIcon>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </dl>
                                        </div>
                                    </aside>
                                </div>

                                <div className="col-span-8 space-y-8 sm:col-span-5 md:col-span-8 lg:col-span-5">
                                    <div className="mt-4 space-y-3">
                                        <div className="flex flex-row justify-between pb-2 border-b border-gray-200">
                                            <h3 className="text-base font-semibold leading-6 text-gray-900">
                                                Load Route
                                            </h3>

                                            <button
                                                type="button"
                                                className="inline-flex items-center px-3 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                onClick={openRouteInGoogleMaps}
                                            >
                                                Get Directions
                                                <ArrowTopRightOnSquareIcon className="flex-shrink-0 w-4 h-4 ml-2 -mr-1" />
                                            </button>
                                        </div>
                                        <div className="flow-root">
                                            <ul role="list" className="-mb-8">
                                                <li>
                                                    <div className="relative z-auto pb-8">
                                                        <span
                                                            className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                                                            aria-hidden="true"
                                                        />
                                                        <div className="relative flex items-start space-x-3">
                                                            <>
                                                                <div className="relative px-1">
                                                                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full ring-8 ring-white">
                                                                        <TruckIcon
                                                                            className="w-5 h-5 text-green-800"
                                                                            aria-hidden="true"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm text-gray-500">
                                                                        <div className="flex place-content-between">
                                                                            <div>
                                                                                <span className="text-lg font-medium text-gray-900">
                                                                                    {new Intl.DateTimeFormat('en-US', {
                                                                                        year: 'numeric',
                                                                                        month: 'long',
                                                                                        day: '2-digit',
                                                                                    }).format(
                                                                                        new Date(load.shipper.date),
                                                                                    )}
                                                                                </span>
                                                                                {load.shipper.time && (
                                                                                    <> @ {load.shipper.time}</>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div>{load.shipper.name}</div>
                                                                        <div>{load.shipper.street}</div>
                                                                        <div>
                                                                            {load.shipper.city}, {load.shipper.state}{' '}
                                                                            {load.shipper.zip}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        </div>
                                                    </div>
                                                </li>
                                                {load.stops.map((stop, index) => (
                                                    <li key={index}>
                                                        <div className="relative pb-8">
                                                            <span
                                                                className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                                                                aria-hidden="true"
                                                            />
                                                            <div className="relative flex items-start space-x-3">
                                                                <>
                                                                    <div className="relative px-1">
                                                                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ring-8 ring-white">
                                                                            <StopIcon
                                                                                className="w-5 h-5 text-gray-500"
                                                                                aria-hidden="true"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-sm text-gray-500">
                                                                            <span className="text-lg font-medium text-gray-900">
                                                                                {new Intl.DateTimeFormat('en-US', {
                                                                                    year: 'numeric',
                                                                                    month: 'long',
                                                                                    day: '2-digit',
                                                                                }).format(new Date(stop.date))}
                                                                            </span>
                                                                            {stop.time && <> @ {stop.time}</>}
                                                                            <div>{stop.name}</div>
                                                                            <div>{stop.street}</div>
                                                                            <div>
                                                                                {stop.city}, {stop.state} {stop.zip}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                                <li>
                                                    <div className="relative pb-8">
                                                        <div className="relative flex items-start space-x-3">
                                                            <>
                                                                <div>
                                                                    <div className="relative px-1">
                                                                        <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full ring-8 ring-white">
                                                                            <MapPinIcon
                                                                                className="w-5 h-5 text-red-800"
                                                                                aria-hidden="true"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm text-gray-500">
                                                                        <span className="text-lg font-medium text-gray-900">
                                                                            {new Intl.DateTimeFormat('en-US', {
                                                                                year: 'numeric',
                                                                                month: 'long',
                                                                                day: '2-digit',
                                                                            }).format(new Date(load.receiver.date))}
                                                                        </span>
                                                                        {load.receiver.time && (
                                                                            <> @ {load.receiver.time}</>
                                                                        )}
                                                                        <div>{load.receiver.name}</div>
                                                                        <div>{load.receiver.street}</div>
                                                                        <div>
                                                                            {load.receiver.city}, {load.receiver.state}{' '}
                                                                            {load.receiver.zip}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        <div className="pb-2 border-b border-gray-200">
                                            <h3 className="text-base font-semibold leading-6 text-gray-900">
                                                Load Activity
                                            </h3>
                                        </div>
                                        <LoadActivityLog loadId={loadId}></LoadActivityLog>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <LoadDetailsSkeleton></LoadDetailsSkeleton>
                        )}
                    </div>
                </div>
            </>
        </Layout>
    );
};

LoadDetailsPage.authenticationEnabled = true;

const LoadDetailsPageWrapper: PageWithAuth = () => {
    const searchParams = useSearchParams();
    const loadId = searchParams.get('id');

    return (
        <LoadProvider loadId={loadId}>
            <LoadDetailsPage loadId={loadId}></LoadDetailsPage>
        </LoadProvider>
    );
};

LoadDetailsPageWrapper.authenticationEnabled = true;

export default LoadDetailsPageWrapper;
