import { Menu, Transition } from '@headlessui/react';
import {
    ArrowTopRightOnSquareIcon,
    ArrowUpTrayIcon,
    ChevronDownIcon,
    EllipsisHorizontalIcon,
    MapPinIcon,
    PaperClipIcon,
    StopIcon,
    TrashIcon,
    TruckIcon,
} from '@heroicons/react/24/outline';
import { LoadDocument, LoadStatus, LoadStop, Location, Prisma, RouteLegStatus } from '@prisma/client';
import classNames from 'classnames';
import { LoadingOverlay } from 'components/LoadingOverlay';
import Spinner from 'components/Spinner';
import RouteLegModal from 'components/assignment/RouteLegModal';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { ChangeEvent, Fragment, useEffect, useState } from 'react';
import { formatValue } from 'react-currency-input-field';
import { notify } from '../../components/Notification';
import { LoadProvider, useLoadContext } from '../../components/context/LoadContext';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import { DownloadInvoicePDFButton } from '../../components/invoices/invoicePdf';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import LoadActivityLog from '../../components/loads/LoadActivityLog';
import LoadStatusBadge from '../../components/loads/LoadStatusBadge';
import LoadDetailsSkeleton from '../../components/skeletons/LoadDetailsSkeleton';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad, ExpandedRoute, ExpandedRouteLeg } from '../../interfaces/models';
import { metersToMiles } from '../../lib/helpers/distance';
import { secondsToReadable } from '../../lib/helpers/time';
import { downloadCombinedPDFForLoad } from '../../lib/load/download-files';
import { UILoadStatus, isDate24HrInThePast, loadStatus } from '../../lib/load/load-utils';
import {
    addLoadDocumentToLoad,
    deleteLoadById,
    deleteLoadDocumentFromLoad,
    updateLoadStatus,
} from '../../lib/rest/load';
import { uploadFileToGCS } from '../../lib/rest/uploadFile';
import { removeRouteLegById, updateRouteLegStatus } from 'lib/rest/routeLeg';
import { RouteLegDataProvider } from 'components/context/RouteLegDataContext';

type ActionsDropdownProps = {
    load: ExpandedLoad;
    disabled: boolean;
    editLoadClicked: () => void;
    viewInvoiceClicked?: () => void;
    createInvoiceClicked?: () => void;
    addAssignmentClicked: () => void;
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
    addAssignmentClicked,
    downloadCombinedPDF,
    makeCopyOfLoadClicked,
    deleteLoadClicked,
}) => {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button
                    className="inline-flex justify-center w-full px-4 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm sm:py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
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
                <Menu.Items className="absolute right-0 z-20 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                                        addAssignmentClicked();
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Add Driver Assignment
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

type LegAssignStatusDropDownProps = {
    disabled: boolean;
    status: RouteLegStatus;
    legId: string;
    startedAt: Date;
    endedAt: Date;
    changeStatusClicked: (newStatus: RouteLegStatus, legId: string) => void;
};

const LegAssignStatusDropDown: React.FC<LegAssignStatusDropDownProps> = ({
    disabled,
    status,
    legId,
    startedAt,
    endedAt,
    changeStatusClicked,
}) => {
    let qTipText = startedAt && !endedAt ? `Started at: ${new Date(startedAt).toLocaleString()}` : '';
    qTipText = endedAt ? `Completed at: ${new Date(endedAt).toLocaleString()}` : qTipText;

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button
                    data-tooltip-id="tooltip"
                    data-tooltip-content={qTipText}
                    data-tooltip-place="top-start"
                    className={`inline-flex justify-center capitalize w-full px-2 py-[4px] text-xs font-semibold text-slate-700 ${
                        status === RouteLegStatus.IN_PROGRESS
                            ? 'bg-amber-400/70 text-white hover:bg-amber-400'
                            : status === RouteLegStatus.COMPLETED
                            ? 'bg-green-700/70 text-white hover:bg-green-500'
                            : 'bg-white text-slate-900 hover:bg-gray-50'
                    } shadow-none border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500`}
                    disabled={disabled}
                >
                    {status.toLowerCase()}
                    <ChevronDownIcon className="w-5 h-4 pl-1 mx-0" aria-hidden="true" />
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
                <Menu.Items
                    key={'load-status-dropdown'}
                    className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                    {Object.values(RouteLegStatus).map((thisStatus, index) => {
                        return (
                            thisStatus !== status && (
                                <div className="py-1" key={`leg-status-item-${index}`}>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <a
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    changeStatusClicked(thisStatus, legId);
                                                }}
                                                className={classNames(
                                                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                    'block px-4 py-2 text-sm',
                                                )}
                                            >
                                                <p className="font-bold capitalize">
                                                    {RouteLegStatus[thisStatus].toLowerCase()}
                                                </p>
                                            </a>
                                        )}
                                    </Menu.Item>
                                </div>
                            )
                        );
                    })}
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

type LegAssignDropDownProps = {
    load: ExpandedLoad;
    disabled: boolean;
    editLegClicked: (legId: string) => void;
    deleteLegClicked: (legId: string) => void;
    openRouteInMapsClicked: (legId: string) => void;
    legId: string;
};

const LegAssignDropDown: React.FC<LegAssignDropDownProps> = ({
    load,
    disabled,
    editLegClicked,
    deleteLegClicked,
    openRouteInMapsClicked,
    legId,
}) => {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button
                    className="inline-flex justify-center w-full px-1 py-[2px] text-sm font-bold text-slate-700 bg-white shadow-lg border border-gray-300 rounded-md  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
                    disabled={disabled}
                >
                    <EllipsisHorizontalIcon className="w-5 h-4 mx-0" aria-hidden="true" />
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
                                        editLegClicked(legId);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Edit Assignment
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
                                        openRouteInMapsClicked(legId);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Open route map
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
                                        deleteLegClicked(legId);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Delete Assignment
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
        <div className={`sticky z-0  sm:z-10 top-0 flex flex-row place-content-between ${className}`}>
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
                    Add Driver Assignment
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
    const [openLegAssignment, setOpenLegAssignment] = useState(false);
    const [podDocuments, setPodDocuments] = useState<LoadDocument[]>([]);
    const [loadDocuments, setLoadDocuments] = useState<LoadDocument[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [downloadingDocs, setDownloadingDocs] = useState(false);

    const [removingRouteLegWithId, setRemovingRouteLegWithId] = React.useState<string | null>(null);

    const [openDeleteLoadConfirmation, setOpenDeleteLoadConfirmation] = useState(false);
    const [openDeleteDocumentConfirmation, setOpenDeleteDocumentConfirmation] = useState(false);
    const [documentIdToDelete, setDocumentIdToDelete] = useState<string | null>(null);
    const [editingRouteLeg, setEditingRouteLeg] = useState<ExpandedRouteLeg | null>(null);

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

    const editLegClicked = (legId: string) => {
        const leg = load.route.routeLegs.find((rl) => rl.id === legId);
        if (leg) {
            setEditingRouteLeg(leg);
            setOpenLegAssignment(true);
        }
    };

    const openRouteInMapsClicked = (legId: string) => {
        // Get the stops for the route leg
        const routeLegStops = load.route.routeLegs.find((rl) => rl.id === legId)?.locations || [];
        const allStops = [...load.stops, load.shipper, load.receiver, ...routeLegStops] as LoadStop[];

        if (routeLegStops.length > 0) {
            // origin is the load shipper address
            const origin = `${allStops.find((s) => s.id === routeLegStops[0].id).latitude}, ${
                allStops.find((s) => s.id === routeLegStops[0].id).longitude
            }`;
            // destination is the load receiver address
            const destination = `${
                allStops.find((s) => s.id === routeLegStops[routeLegStops.length - 1].id).latitude
            }, ${allStops.find((s) => s.id === routeLegStops[routeLegStops.length - 1].id).longitude}`;

            let waypoints = null;
            // waypoints are the load stops, separate by a pipe
            if (routeLegStops.length > 2) {
                waypoints = routeLegStops
                    .map(
                        (stop, index) =>
                            index > 0 &&
                            index < routeLegStops.length - 1 &&
                            `${allStops.find((s) => s.id === stop.id).latitude}, ${
                                allStops.find((s) => s.id === stop.id).longitude
                            }`,
                    )
                    .join('|');
            }

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

    const changeLegStatusClicked = async (legStatus: RouteLegStatus, routeLegId: string) => {
        // Update the load context with the updated driver assignment
        const curRoute = load.route;
        const routeLeg: ExpandedRouteLeg = curRoute.routeLegs.find((leg) => leg.id === routeLegId);

        try {
            const loadStatus = await updateRouteLegStatus(routeLegId, legStatus);

            // Update the route leg status
            routeLeg.status = legStatus;
            switch (legStatus) {
                case RouteLegStatus.ASSIGNED:
                    routeLeg.startedAt = null;
                    routeLeg.endedAt = null;
                    break;
                case RouteLegStatus.IN_PROGRESS:
                    routeLeg.startedAt = new Date();
                    routeLeg.endedAt = null;
                    break;
                default:
                    routeLeg.startedAt = new Date();
                    routeLeg.endedAt = new Date();
                    break;
            }

            // Update the route with the updated route leg
            const updatedRouteLegs = curRoute.routeLegs.map((leg) => (leg.id === routeLegId ? routeLeg : leg)) as [];
            // Update the load context with the updated route
            const newRoute: ExpandedRoute = {
                id: curRoute.id,
                routeLegs: updatedRouteLegs,
            };

            // Update the load context with the updated route
            setLoad((prev) => ({
                ...prev,
                status: loadStatus,
                route: JSON.parse(JSON.stringify(newRoute)),
            }));

            notify({ title: 'Load Assignment Status', message: 'Load assignment successfully updated' });
        } catch (error) {
            notify({ title: 'Error Updating Load Assignment ', type: 'error' });
        }
    };

    const deleteLegClicked = async (legId: string) => {
        setRemovingRouteLegWithId(legId);

        try {
            await removeRouteLegById(legId);
            setLoad((prev) => ({
                ...prev,
                route: {
                    ...prev.route,
                    routeLegs: prev.route.routeLegs.filter((rl) => rl.id !== legId),
                },
            }));
            notify({ title: 'Load Assignment', message: 'Load assignment successfully removed' });
        } catch (e) {
            notify({ title: 'Error Removing Load Assignment', type: 'error' });
        }

        setRemovingRouteLegWithId(null);
    };

    // console.log('editing route leg', editingRouteLeg);
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

                    <Toolbar
                        className="px-5 py-2 mb-1 bg-white sm:px-6 md:px-8"
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
                        assignDriverClicked={() => setOpenLegAssignment(true)}
                        changeLoadStatus={changeLoadStatus}
                    ></Toolbar>

                    {/* {load && load.routeEncoded && (
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
                    )} */}
                    <div className="grid grid-cols-8 gap-2 px-5 sm:gap-8 md:gap-2 lg:gap-6 sm:px-6 md:px-8">
                        {load ? (
                            <>
                                <div className="col-span-8 lg:col-span-4 ">
                                    <aside className="bg-white border-gray-200">
                                        <div className="pb-0 space-y-6 lg:pb-10">
                                            <dl className="border-gray-200 divide-y divide-gray-200">
                                                <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
                                                    <dt className="text-gray-500">Load #</dt>
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
                                                {/* <div className="flex justify-between py-3 space-x-2 text-sm font-medium">
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
                                                </div> */}
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
                                                {/* {load.routeDistance && (
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
                                                )} */}
                                                {/* <div>
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
                                                </div> */}
                                            </dl>
                                        </div>
                                    </aside>
                                </div>
                                <div className="col-span-8 lg:col-span-4 ">
                                    <aside className="bg-white border-gray-200">
                                        <div className="pb-0 space-y-6 lg:pb-10">
                                            <dl className="border-gray-200 divide-y divide-gray-200">
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

                                {/* <div className="col-span-8 space-y-8 sm:col-span-5 md:col-span-8 lg:col-span-5">
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
                                                                        <div className="mt-1">
                                                                            {load.shipper.poNumbers && (
                                                                                <div className="text-xs">
                                                                                    PO #&rsquo;s:{' '}
                                                                                    {load.shipper.poNumbers}
                                                                                </div>
                                                                            )}
                                                                            {load.shipper.pickUpNumbers && (
                                                                                <div className="text-xs">
                                                                                    Pick Up #&rsquo;s:{' '}
                                                                                    {load.shipper.pickUpNumbers}
                                                                                </div>
                                                                            )}
                                                                            {load.shipper.referenceNumbers && (
                                                                                <div className="text-xs">
                                                                                    Ref #&rsquo;s:{' '}
                                                                                    {load.shipper.referenceNumbers}
                                                                                </div>
                                                                            )}
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
                                                                            <div className="mt-1">
                                                                                {stop.poNumbers && (
                                                                                    <div className="text-xs">
                                                                                        PO #&rsquo;s: {stop.poNumbers}
                                                                                    </div>
                                                                                )}
                                                                                {stop.pickUpNumbers && (
                                                                                    <div className="text-xs">
                                                                                        Pick Up #&rsquo;s:{' '}
                                                                                        {stop.pickUpNumbers}
                                                                                    </div>
                                                                                )}
                                                                                {stop.referenceNumbers && (
                                                                                    <div className="text-xs">
                                                                                        Ref #&rsquo;s:{' '}
                                                                                        {stop.referenceNumbers}
                                                                                    </div>
                                                                                )}
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
                                                                        <div className="mt-1">
                                                                            {load.receiver.poNumbers && (
                                                                                <div className="text-xs">
                                                                                    PO #&rsquo;s:{' '}
                                                                                    {load.receiver.poNumbers}
                                                                                </div>
                                                                            )}
                                                                            {load.receiver.pickUpNumbers && (
                                                                                <div className="text-xs">
                                                                                    Delivery #&rsquo;s:{' '}
                                                                                    {load.receiver.pickUpNumbers}
                                                                                </div>
                                                                            )}
                                                                            {load.receiver.referenceNumbers && (
                                                                                <div className="text-xs">
                                                                                    Ref #&rsquo;s:{' '}
                                                                                    {load.receiver.referenceNumbers}
                                                                                </div>
                                                                            )}
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
                                </div> */}
                                <div className="col-span-8 my-10 md:my-2">
                                    <div className="mt-4 space-y-3">
                                        <div className="flex flex-row justify-between gap-2 pb-2">
                                            <div className="flex flex-col">
                                                <h3 className="text-base font-semibold leading-6 text-gray-900">
                                                    Load Route
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    All the load stops are listed below | Pick-Up/Stops/Drop-Off
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                className="flex items-center h-8 px-3 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm whitespace-nowrap hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                onClick={openRouteInGoogleMaps}
                                            >
                                                Get Directions
                                                <ArrowTopRightOnSquareIcon className="flex-shrink-0 w-4 h-4 ml-2 -mr-1" />
                                            </button>
                                        </div>
                                        <div className="flex flex-col border rounded-lg border-slate-200">
                                            <div className="flex flex-row justify-between w-full p-2 rounded-tl-lg rounded-tr-lg bg-slate-100">
                                                <p className="text-sm text-slate-900">
                                                    Route Distance:{' '}
                                                    {metersToMiles(
                                                        new Prisma.Decimal(load.routeDistance).toNumber(),
                                                    ).toFixed(0)}{' '}
                                                    miles
                                                </p>
                                                <p className="text-sm text-slate-900">
                                                    Travel Time:{' '}
                                                    {secondsToReadable(
                                                        new Prisma.Decimal(load.routeDuration).toNumber(),
                                                    )}
                                                </p>
                                            </div>

                                            {load && load.routeEncoded && (
                                                <Image
                                                    src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/path-5(${encodeURIComponent(
                                                        load.routeEncoded,
                                                    )})/auto/1275x400?padding=25,25,25,25&access_token=${
                                                        process.env.NEXT_PUBLIC_MAPBOX_TOKEN
                                                    }`}
                                                    width={1200}
                                                    height={300}
                                                    alt="Load Route"
                                                    loading="lazy"
                                                    className="w-full h-auto mb-3"
                                                ></Image>
                                            )}
                                            <ul
                                                role="list"
                                                className="flex flex-col justify-between flex-grow gap-3 p-2 px-4 pb-4 overflow-x-auto lg:flex-row lg:gap-4 bg-whtie"
                                            >
                                                <li className="flex-grow p-2 mt-4 border rounded-lg bg-neutral-50 border-slate-100">
                                                    <div className="relative z-auto">
                                                        <div className="relative flex flex-col items-start ">
                                                            <>
                                                                <div className="relative w-full px-0">
                                                                    <div className="flex flex-row items-end justify-between pb-2 rounded-full ">
                                                                        <p className="absolute right-0  -top-7 rounded-md p-[3px] px-2 h-6  text-center text-xs font-semibold border bg-white border-slate-100">
                                                                            Pick-Up
                                                                        </p>
                                                                        <div className="flex p-1 bg-white border rounded-lg border-slate-200">
                                                                            <div className="flex items-center justify-center gap-2 lg:flex-col lg:items-start lg:gap-0">
                                                                                <span className="text-sm font-bold text-blue-500">
                                                                                    {new Intl.DateTimeFormat('en-US', {
                                                                                        year: 'numeric',

                                                                                        month: 'long',
                                                                                        day: '2-digit',
                                                                                    }).format(
                                                                                        new Date(load.shipper.date),
                                                                                    )}
                                                                                </span>
                                                                                {load.shipper.time && (
                                                                                    <p className="text-xs font-base text-slate-500">
                                                                                        @{load.shipper.time}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-row items-center justify-center w-8 h-8 bg-green-200 border-2 border-white rounded-md">
                                                                            <TruckIcon
                                                                                className="w-4 h-4 text-green-900"
                                                                                aria-hidden="true"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm text-gray-500">
                                                                        <div className="text-base font-semibold capitalize text-slate-900">
                                                                            {load.shipper.name.toLowerCase()}
                                                                        </div>
                                                                        <div>{load.shipper.street}</div>
                                                                        <div>
                                                                            {load.shipper.city}, {load.shipper.state}{' '}
                                                                            {load.shipper.zip}
                                                                        </div>
                                                                        <div className="mt-1">
                                                                            {load.shipper.poNumbers && (
                                                                                <div className="text-xs">
                                                                                    PO #&rsquo;s:{' '}
                                                                                    {load.shipper.poNumbers}
                                                                                </div>
                                                                            )}
                                                                            {load.shipper.pickUpNumbers && (
                                                                                <div className="text-xs">
                                                                                    Pick Up #&rsquo;s:{' '}
                                                                                    {load.shipper.pickUpNumbers}
                                                                                </div>
                                                                            )}
                                                                            {load.shipper.referenceNumbers && (
                                                                                <div className="text-xs">
                                                                                    Ref #&rsquo;s:{' '}
                                                                                    {load.shipper.referenceNumbers}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        </div>
                                                    </div>
                                                </li>
                                                {load.stops.map((stop, index) => (
                                                    <li
                                                        className="flex-grow p-2 mt-4 border rounded-lg bg-neutral-50 border-slate-100"
                                                        key={index}
                                                    >
                                                        <div className="relative">
                                                            <div className="relative flex items-start ">
                                                                <div className="flex-1 w-full">
                                                                    <div className="relative w-full px-0">
                                                                        <div className="flex flex-row items-end justify-between w-full pb-2 rounded-full ">
                                                                            <p className="absolute right-0  -top-7 rounded-md p-[3px] px-2 h-6  text-center text-xs font-semibold border bg-white border-slate-100">
                                                                                Stop
                                                                            </p>
                                                                            <div className="flex p-1 bg-white border rounded-lg border-slate-200">
                                                                                <div className="flex items-center justify-center gap-2 lg:flex-col lg:items-start lg:gap-0">
                                                                                    <span className="text-sm font-bold text-blue-500">
                                                                                        {new Intl.DateTimeFormat(
                                                                                            'en-US',
                                                                                            {
                                                                                                year: 'numeric',

                                                                                                month: 'long',
                                                                                                day: '2-digit',
                                                                                            },
                                                                                        ).format(new Date(stop.date))}
                                                                                    </span>
                                                                                    {stop.time && (
                                                                                        <p className="text-xs font-base text-slate-500">
                                                                                            @{stop.time}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex flex-row items-center justify-center w-8 h-8 bg-gray-200 border-2 border-white rounded-md">
                                                                                <StopIcon
                                                                                    className="w-4 h-4 text-gray-900"
                                                                                    aria-hidden="true"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-sm text-gray-500">
                                                                            <div className="text-base font-semibold capitalize text-slate-900">
                                                                                {stop.name.toLowerCase()}
                                                                            </div>
                                                                            <div>{stop.street}</div>
                                                                            <div>
                                                                                {stop.city}, {stop.state} {stop.zip}
                                                                            </div>
                                                                            <div className="mt-1">
                                                                                {stop.poNumbers && (
                                                                                    <div className="text-xs">
                                                                                        PO #&rsquo;s: {stop.poNumbers}
                                                                                    </div>
                                                                                )}
                                                                                {stop.pickUpNumbers && (
                                                                                    <div className="text-xs">
                                                                                        Pick Up #&rsquo;s:{' '}
                                                                                        {stop.pickUpNumbers}
                                                                                    </div>
                                                                                )}
                                                                                {stop.referenceNumbers && (
                                                                                    <div className="text-xs">
                                                                                        Ref #&rsquo;s:{' '}
                                                                                        {stop.referenceNumbers}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                                <li className="flex-grow p-2 mt-4 border rounded-lg bg-neutral-50 border-slate-100">
                                                    <div className="relative ">
                                                        <div className="relative flex flex-col items-start">
                                                            <div className="flex flex-row items-end justify-between w-full pb-2 rounded-full ">
                                                                <p className="absolute right-0  -top-7 rounded-md p-[3px] px-2 h-6  text-center text-xs font-semibold border bg-white border-slate-100">
                                                                    Drop-Off
                                                                </p>
                                                                <div className="flex p-1 bg-white border rounded-lg border-slate-200">
                                                                    <div className="flex items-center justify-center gap-2 lg:flex-col lg:items-start lg:gap-0">
                                                                        <span className="text-sm font-bold text-blue-500">
                                                                            {new Intl.DateTimeFormat('en-US', {
                                                                                year: 'numeric',
                                                                                month: 'long',
                                                                                day: '2-digit',
                                                                            }).format(new Date(load.receiver.date))}
                                                                        </span>
                                                                        {load.receiver.time && (
                                                                            <p className="text-xs font-base text-slate-500">
                                                                                @{load.receiver.time}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-row items-center justify-center w-8 h-8 bg-red-200 border-2 border-white rounded-md">
                                                                    <MapPinIcon
                                                                        className="w-4 h-4 text-red-900"
                                                                        aria-hidden="true"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm text-gray-500">
                                                                    <div className="text-base font-semibold capitalize text-slate-900">
                                                                        {load.receiver.name.toLowerCase()}
                                                                    </div>
                                                                    <div>{load.receiver.street}</div>
                                                                    <div>
                                                                        {load.receiver.city}, {load.receiver.state}{' '}
                                                                        {load.receiver.zip}
                                                                    </div>
                                                                    <div className="mt-1">
                                                                        {load.receiver.poNumbers && (
                                                                            <div className="text-xs">
                                                                                PO #&rsquo;s: {load.receiver.poNumbers}
                                                                            </div>
                                                                        )}
                                                                        {load.receiver.pickUpNumbers && (
                                                                            <div className="text-xs">
                                                                                Delivery #&rsquo;s:{' '}
                                                                                {load.receiver.pickUpNumbers}
                                                                            </div>
                                                                        )}
                                                                        {load.receiver.referenceNumbers && (
                                                                            <div className="text-xs">
                                                                                Ref #&rsquo;s:{' '}
                                                                                {load.receiver.referenceNumbers}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    {/* <div className="mt-4 space-y-3">
                                        <div className="pb-2 border-b border-gray-200">
                                            <h3 className="text-base font-semibold leading-6 text-gray-900">
                                                Load Activity
                                            </h3>
                                        </div>
                                        <LoadActivityLog loadId={loadId}></LoadActivityLog>
                                    </div> */}
                                </div>
                                <div className="col-span-8 my-10 md:my-2 ">
                                    <div className="flex flex-row justify-between align-top justify-items-start">
                                        <div>
                                            <h1 className="text-base font-semibold text-gray-900">Load Assignments</h1>
                                            <p className="text-xs text-slate-500">
                                                Following tasks have been assigned on this load:
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex justify-between py-0 space-x-2 text-sm font-medium">
                                                <dd className="text-right text-gray-900 whitespace-nowrap">
                                                    <a onClick={() => setOpenLegAssignment(true)}>Add Assignment</a>
                                                </dd>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        {load.route && load.route.routeLegs.length > 0 && (
                                            <div className="flex flex-col w-full" key={'route-legs-container'}>
                                                <div
                                                    className="p-0 my-3 mt-6 border rounded-lg border-slate-100"
                                                    key={'route-legs'}
                                                >
                                                    {load.route.routeLegs.map((leg, index) => {
                                                        const drivers = leg.driverAssignments.map(
                                                            (driver) => driver.driver,
                                                        );
                                                        const locations = leg.locations;
                                                        const legStatus = leg.status;

                                                        return (
                                                            <div className="relative pb-4" key={`routelegs-${index}`}>
                                                                {removingRouteLegWithId == leg.id && (
                                                                    <div className="absolute z-[5]  flex flex-col items-center h-full w-full bg-slate-50/90 ounded-lg justify-center flex-1 flex-grow ">
                                                                        <div className="flex items-center mt-10 space-x-2 text-slate-700">
                                                                            <Spinner />
                                                                            <span>Removing assignment...</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div
                                                                    className="flex flex-col items-start gap-1 p-2 text-sm lg:flex-row lg:items-center bg-slate-100 rounded-tl-md rounded-tr-md"
                                                                    key={`route-leg-${index}-drivers`}
                                                                >
                                                                    <div className="absolute right-0  -top-6 flex items-center flex-row gap-2 rounded-md p-[3px] px-2 h-8  text-center text-xs font-semibold border-2 bg-slate-100 border-slate-100">
                                                                        <p
                                                                            data-tooltip-id="tooltip"
                                                                            data-tooltip-content={`Assigned at: ${new Date(
                                                                                leg.createdAt,
                                                                            ).toLocaleString()}`}
                                                                            data-tooltip-place="top-start"
                                                                        >
                                                                            Assignment# {index + 1}
                                                                        </p>
                                                                        <div>
                                                                            <LegAssignDropDown
                                                                                deleteLegClicked={() =>
                                                                                    deleteLegClicked(leg.id)
                                                                                }
                                                                                editLegClicked={() =>
                                                                                    editLegClicked(leg.id)
                                                                                }
                                                                                openRouteInMapsClicked={() =>
                                                                                    openRouteInMapsClicked(leg.id)
                                                                                }
                                                                                disabled={false}
                                                                                legId={leg.id}
                                                                                load={load}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="absolute text-xs font-bold text-center rounded-md right-2 ">
                                                                        <div className="flex flex-row items-center gap-1">
                                                                            {/* <p className="text-xs font-semibold text-slate-800 ">
                                                                                Status:
                                                                            </p> */}
                                                                            <div className="font-light rounded-full bg-slate-100">
                                                                                {/* {leg.startedAt && !leg.endedAt && (
                                                                                    <p
                                                                                        data-tooltip-id="tooltip"
                                                                                        data-tooltip-place="top-start"
                                                                                        data-tooltip-content={`Started at: ${new Date(
                                                                                            leg.startedAt,
                                                                                        ).toLocaleString()}`}
                                                                                        className="px-2 py-1 font-semibold text-white rounded-full bg-amber-500"
                                                                                    >
                                                                                        Started
                                                                                    </p>
                                                                                )}
                                                                                {leg.startedAt && leg.endedAt && (
                                                                                    <p
                                                                                        data-tooltip-id="tooltip"
                                                                                        data-tooltip-place="top-start"
                                                                                        data-tooltip-content={`Completed at: ${new Date(
                                                                                            leg.startedAt,
                                                                                        ).toLocaleString()}`}
                                                                                        className="px-2 py-1 font-semibold text-white bg-green-600 rounded-full"
                                                                                    >
                                                                                        Completed
                                                                                    </p>
                                                                                )}
                                                                                {!leg.startedAt && !leg.endedAt && (
                                                                                    <p className="px-2 py-1 text-gray-600 bg-white rounded-full font-base">
                                                                                        Assigned
                                                                                    </p>
                                                                                )} */}

                                                                                <LegAssignStatusDropDown
                                                                                    changeStatusClicked={(legStatus) =>
                                                                                        changeLegStatusClicked(
                                                                                            legStatus,
                                                                                            leg.id,
                                                                                        )
                                                                                    }
                                                                                    startedAt={leg.startedAt}
                                                                                    endedAt={leg.endedAt}
                                                                                    legId={leg.id}
                                                                                    disabled={false}
                                                                                    status={legStatus}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <p className="font-semibold">Assigned Drivers:</p>
                                                                    <div
                                                                        className="flex gap-1"
                                                                        key={`route-legs-${index}-drivers`}
                                                                    >
                                                                        {drivers.map((driver, index) => {
                                                                            return (
                                                                                <p
                                                                                    className="px-2 py-1 text-xs capitalize bg-white border rounded-md whitespace-nowrap border-slate-300"
                                                                                    key={`driver-${index}`}
                                                                                >
                                                                                    <Link
                                                                                        href={`/drivers/${driver.id}`}
                                                                                    >
                                                                                        {driver.name.toLowerCase()}
                                                                                    </Link>
                                                                                </p>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-row gap-1 px-4 py-1 pt-4 text-xs font-normal">
                                                                    <p>Assignment begin time:</p>
                                                                    <p className="text-slate-600">
                                                                        {`${
                                                                            new Date(leg.scheduledDate)
                                                                                ?.toISOString()
                                                                                ?.split('T')[0]
                                                                        } @ ${new Date(
                                                                            `${
                                                                                leg.scheduledDate
                                                                                    ?.toString()
                                                                                    ?.split('T')[0]
                                                                            }T${leg.scheduledTime}`,
                                                                        ).toLocaleTimeString()}`}
                                                                    </p>
                                                                </div>
                                                                <div className="flex flex-row gap-1 px-4 py-1 pb-4 text-xs">
                                                                    <p>Instructions:</p>
                                                                    <p className="text-slate-600">
                                                                        {leg.driverInstructions}
                                                                    </p>
                                                                </div>
                                                                <div className="flex flex-row items-center justify-center gap-1 px-4 text-sm font-semibold text-slate-600 ">
                                                                    <div className="h-[1px] w-full border-b border-dashed flex-1 bg-slate-50  "></div>
                                                                    <p className="px-1 rounded-md ">Assigned Stops</p>
                                                                    <div className="h-[1px] w-full border-b border-dashed flex-1 bg-slate-50  "></div>
                                                                </div>
                                                                <div
                                                                    className="flex flex-col gap-2 p-3 m-4 mt-2 overflow-x-auto rounded-lg lg:flex-row bg-neutral-50"
                                                                    key={`route-legs-${index}-stops`}
                                                                >
                                                                    {locations.map((legLocation, index) => {
                                                                        const isLoadStop = !!legLocation.loadStop;
                                                                        const item = isLoadStop
                                                                            ? legLocation.loadStop
                                                                            : legLocation.location;

                                                                        return (
                                                                            <div
                                                                                className="flex-1"
                                                                                key={`route-legs-stops-stop-${index}`}
                                                                            >
                                                                                <label /* htmlFor={`stop-${index}`} */>
                                                                                    <div className="relative flex flex-col items-start flex-1 py-1 pl-1 cursor-default">
                                                                                        <div className="flex flex-row items-center w-full gap-0 justify-items-start">
                                                                                            <p className="relative top-0 text-sm font-medium bg-slate-200 p-[2px] h-7 w-7 text-center border-2 border-slate-300 rounded-full">
                                                                                                {index + 1}
                                                                                            </p>
                                                                                            <div className="h-[3px] w-full flex-1 bg-slate-300"></div>
                                                                                            {
                                                                                                <TruckIcon
                                                                                                    className="w-6 h-6 text-gray-500"
                                                                                                    aria-hidden="true"
                                                                                                />
                                                                                            }
                                                                                        </div>

                                                                                        <div className="flex-1 truncate pl-7">
                                                                                            <p className="text-base font-semibold text-gray-900 capitalize truncate">
                                                                                                {item.name.toLowerCase()}
                                                                                            </p>
                                                                                            <p className="text-xs text-gray-800 truncate">
                                                                                                {isLoadStop
                                                                                                    ? new Date(
                                                                                                          (
                                                                                                              item as LoadStop
                                                                                                          ).date,
                                                                                                      ).toLocaleDateString()
                                                                                                    : new Date(
                                                                                                          (
                                                                                                              item as Location
                                                                                                          ).createdAt,
                                                                                                      ).toLocaleDateString()}{' '}
                                                                                                @{' '}
                                                                                                {isLoadStop
                                                                                                    ? (item as LoadStop)
                                                                                                          .time
                                                                                                    : new Date(
                                                                                                          (
                                                                                                              item as Location
                                                                                                          ).updatedAt,
                                                                                                      ).toLocaleTimeString()}
                                                                                            </p>
                                                                                            <p className="text-sm text-gray-500 capitalize truncate">
                                                                                                {item.street.toLowerCase()}
                                                                                            </p>
                                                                                            <p className="text-sm text-gray-500 capitalize truncate">
                                                                                                {item.city.toLowerCase()}
                                                                                                ,{' '}
                                                                                                {item.state.toUpperCase()}
                                                                                                , {item.zip}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                </label>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        {!load.route ||
                                            (load.route.routeLegs.length == 0 && (
                                                <p className="flex flex-col items-center justify-center w-full h-20 p-1 my-2 text-sm rounded-lg bg-neutral-50">
                                                    No assignments created for this load.
                                                </p>
                                            ))}
                                    </div>
                                </div>
                                <div className="col-span-8 my-10 mt-2 md:my-2 ">
                                    <div className="pb-2 f">
                                        <h3 className="text-base font-semibold leading-6 text-gray-900">
                                            Load Activity
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            All changes made on this load are listed below
                                        </p>
                                    </div>
                                    <div
                                        className={`w-full gap-1 bg-neutral-50 border border-slate-100 p-3 rounded-lg`}
                                    >
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
    const params = useParams();
    const loadId = params.id as string;

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
