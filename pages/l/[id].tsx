import { Menu, Transition } from '@headlessui/react';
import { LocationMarkerIcon, MapIcon, PaperClipIcon, TrashIcon } from '@heroicons/react/outline';
import { DotsVerticalIcon } from '@heroicons/react/solid';
import { LoadDocument, LoadStatus } from '@prisma/client';
import classNames from 'classnames';
import { NextPageContext } from 'next';
import React, { ChangeEvent, Fragment, useEffect, useState } from 'react';
import { notify } from '../../components/Notification';
import LoadDetailsSkeleton from '../../components/skeletons/LoadDetailsSkeleton';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad, ExpandedLoadDocument } from '../../interfaces/models';
import { loadStatus, UILoadStatus } from '../../lib/load/load-utils';
import { addLoadDocumentToLoad, deleteLoadDocumentFromLoad, getLoadById, updateLoadStatus } from '../../lib/rest/load';
import { uploadFileToGCS } from '../../lib/rest/uploadFile';

export async function getServerSideProps(context: NextPageContext) {
    const { id } = context.query;
    return {
        props: {
            loadId: String(id),
        },
    };
}

type Props = {
    loadId: string;
};

const loadingSvg = (
    <svg
        className="w-5 h-5 mr-3 -ml-1 text-white animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
    >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
    </svg>
);

const LoadDetailsPage: PageWithAuth<Props> = ({ loadId }: Props) => {
    const [load, setLoad] = useState<ExpandedLoad>();
    const [loadStatusLoading, setLoadStatusLoading] = useState(false);

    const [loadDocuments, setLoadDocuments] = useState<ExpandedLoadDocument[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);

    let fileInput: HTMLInputElement;

    useEffect(() => {
        reloadLoad();
    }, [loadId]);

    const reloadLoad = async () => {
        const load = await getLoadById(loadId, 'driverId');
        setLoad(load);
        setLoadDocuments([...load.podDocuments].filter((ld) => ld));
    };

    const beginWork = async () => {
        setLoadStatusLoading(true);
        const response = await updateLoadStatus(loadId, LoadStatus.IN_PROGRESS);
        if (response) {
            await reloadLoad();
        }
        setLoadStatusLoading(false);
    };

    const stopWork = async () => {
        setLoadStatusLoading(true);
        const response = await updateLoadStatus(loadId, LoadStatus.CREATED);
        if (response) {
            await reloadLoad();
        }
        setLoadStatusLoading(false);
    };

    const completeWork = async () => {
        setLoadStatusLoading(true);
        const response = await updateLoadStatus(loadId, LoadStatus.DELIVERED);
        if (response) {
            await reloadLoad();
        }
        setLoadStatusLoading(false);
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
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
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                };
                await addLoadDocumentToLoad(load.id, simpleDoc, {
                    driverId: load.driverId,
                    isPod: true,
                });

                reloadLoad();

                notify({ title: 'Document uploaded', message: 'Document uploaded successfully' });
            } else {
                notify({ title: 'Error uploading document', message: 'Upload response invalid', type: 'error' });
            }
        } catch (e) {
            notify({ title: 'Error uploading document', message: e.message, type: 'error' });
        }
        setDocsLoading(false);
        event.target.value = '';
    };

    const openDocument = (document: ExpandedLoadDocument) => {
        window.open(document.fileUrl);
    };

    const deleteLoadDocument = async (id: string) => {
        setDocsLoading(true);
        try {
            await deleteLoadDocumentFromLoad(load.id, id, {
                driverId: load.driverId,
                isPod: true,
            });
            const newLoadDocuments = loadDocuments.filter((ld) => ld.id !== id);
            setLoadDocuments(newLoadDocuments);
            reloadLoad();
            notify({ title: 'Document deleted', message: 'Document deleted successfully' });
        } catch (e) {
            notify({ title: 'Error deleting document', message: e.message, type: 'error' });
        }
        setDocsLoading(false);
    };

    const openAddressInMaps = (address: string) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    };

    return (
        <div className="max-w-4xl py-6 mx-auto">
            <div className="flex flex-col px-4">
                <h4 className="mb-2 font-semibold">Your Loads</h4>

                {load ? (
                    <div className="p-4 space-y-4 overflow-hidden border-2 rounded-lg">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-base font-semibold uppercase">{load.customer?.name}</div>
                                <div className="space-x-2">
                                    <span className="text-sm font-semibold text-slate-400">Reference #:</span>
                                    <span className="text-sm font-semibold">{load.refNum}</span>
                                </div>
                            </div>
                            <div>
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 uppercase bg-green-100 rounded-md">
                                    {loadStatus(load)}
                                </span>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            {loadStatus(load) === UILoadStatus.BOOKED && (
                                <button
                                    type="button"
                                    className="flex-grow flex justify-center items-center rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                                    onClick={() => beginWork()}
                                    disabled={loadStatusLoading}
                                >
                                    {loadStatusLoading && loadingSvg}
                                    {!loadStatusLoading && 'Begin Work'}
                                </button>
                            )}
                            {loadStatus(load) === UILoadStatus.IN_PROGRESS && (
                                <button
                                    type="button"
                                    className="flex-grow flex justify-center items-center rounded-md bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                                    onClick={() => completeWork()}
                                    disabled={loadStatusLoading}
                                >
                                    {loadStatusLoading && loadingSvg}
                                    {!loadStatusLoading && 'Set as Delivered'}
                                </button>
                            )}
                            {(loadStatus(load) === UILoadStatus.DELIVERED ||
                                loadStatus(load) === UILoadStatus.POD_READY) && (
                                <>
                                    <button
                                        type="button"
                                        className="flex-grow flex justify-center items-center rounded-md bg-purple-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700"
                                        onClick={() => fileInput.click()}
                                        disabled={docsLoading || loadStatusLoading}
                                    >
                                        {(docsLoading || loadStatusLoading) && loadingSvg}
                                        {!(docsLoading || loadStatusLoading) && 'Upload POD'}
                                    </button>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                        ref={(input) => (fileInput = input)}
                                    />
                                </>
                            )}
                            {(loadStatus(load) === UILoadStatus.IN_PROGRESS ||
                                loadStatus(load) === UILoadStatus.DELIVERED) && (
                                <Menu as="div" className="relative inline-block text-left">
                                    <div>
                                        <Menu.Button
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex justify-center items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-400 hover:text-gray-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                        >
                                            <span className="sr-only">Open options</span>
                                            <DotsVerticalIcon className="w-6 h-6" aria-hidden="true" />
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
                                                {loadStatus(load) === UILoadStatus.IN_PROGRESS && (
                                                    <Menu.Item>
                                                        {({ active }) => (
                                                            <a
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    stopWork();
                                                                }}
                                                                className={classNames(
                                                                    active
                                                                        ? 'bg-gray-100 text-gray-900'
                                                                        : 'text-gray-700',
                                                                    'block px-4 py-2 text-sm',
                                                                )}
                                                            >
                                                                Change to Not In Progress
                                                            </a>
                                                        )}
                                                    </Menu.Item>
                                                )}
                                                {loadStatus(load) === UILoadStatus.DELIVERED && (
                                                    <Menu.Item>
                                                        {({ active }) => (
                                                            <a
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    beginWork();
                                                                }}
                                                                className={classNames(
                                                                    active
                                                                        ? 'bg-gray-100 text-gray-900'
                                                                        : 'text-gray-700',
                                                                    'block px-4 py-2 text-sm',
                                                                )}
                                                            >
                                                                Change to Not Delivered
                                                            </a>
                                                        )}
                                                    </Menu.Item>
                                                )}
                                            </div>
                                        </Menu.Items>
                                    </Transition>
                                </Menu>
                            )}
                        </div>

                        {loadDocuments.length > 0 && (
                            <div className="flex flex-col space-y-2">
                                {loadDocuments.map((doc) => (
                                    <div key={doc.id}>
                                        <div className="flex items-center justify-between text-sm border border-gray-200 rounded cursor-pointer hover:bg-gray-50 active:bg-gray-100">
                                            <div
                                                className="flex items-center flex-1 py-2 pl-3 pr-4"
                                                onClick={() => openDocument(doc)}
                                            >
                                                <PaperClipIcon
                                                    className="flex-shrink-0 w-4 h-4 text-gray-400"
                                                    aria-hidden="true"
                                                />
                                                <span className="flex-1 w-0 ml-2 truncate">{doc.fileName}</span>
                                            </div>
                                            <div className="flex-shrink-0 ml-2">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteLoadDocument(doc.id);
                                                    }}
                                                    disabled={docsLoading}
                                                >
                                                    <TrashIcon className="flex-shrink-0 w-4 h-4 text-gray-800"></TrashIcon>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col justify-between space-y-4">
                            <div className="flex flex-col">
                                <div className="relative flex">
                                    <span className="absolute w-6 h-6 px-2 py-1 text-xs font-medium text-center text-gray-600 bg-white rounded-full -left-2 -top-2 ring-1 ring-inset ring-gray-500/10">
                                        1
                                    </span>
                                    <div className="mr-3">
                                        <div className="w-20 p-2 text-base text-center text-gray-700 bg-slate-100">
                                            <div className="text-base font-medium text-gray-900">
                                                {new Intl.DateTimeFormat('en-US', {
                                                    month: 'short',
                                                    day: '2-digit',
                                                }).format(new Date(load.shipper.date))}
                                            </div>
                                            <div className="text-sm">{load.shipper.time}</div>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-base font-semibold tracking-wide text-indigo-500 uppercase select-all">
                                            {load.shipper.name}
                                        </p>
                                        <p className="text-sm text-gray-700 select-all">
                                            {load.shipper.street}
                                            <br />
                                            {load.shipper.city}, {load.shipper.state} {load.shipper.zip}
                                        </p>
                                    </div>
                                    <div className="flex flex-none place-items-center ">
                                        <button
                                            type="button"
                                            className="inline-flex items-center px-2 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openAddressInMaps(
                                                    `${load.shipper.street} ${load.shipper.city} ${load.shipper.state} ${load.shipper.zip}`,
                                                );
                                            }}
                                            disabled={docsLoading}
                                        >
                                            <LocationMarkerIcon className="w-6 h-6 text-gray-400" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {load.stops.map((stop, index) => (
                                <div className="flex flex-col" key={index}>
                                    <div className="relative flex">
                                        <span className="absolute w-6 h-6 px-2 py-1 text-xs font-medium text-center text-gray-600 bg-white rounded-full -left-2 -top-2 ring-1 ring-inset ring-gray-500/10">
                                            {index + 2}
                                        </span>
                                        <div className="mr-3">
                                            <div className="w-20 p-2 text-base text-center text-gray-700 bg-slate-100">
                                                <div className="text-base font-medium text-gray-900">
                                                    {new Intl.DateTimeFormat('en-US', {
                                                        month: 'short',
                                                        day: '2-digit',
                                                    }).format(new Date(stop.date))}
                                                </div>
                                                <div className="text-sm">{stop.time}</div>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-base font-semibold tracking-wide text-indigo-500 uppercase select-all">
                                                {stop.name}
                                            </p>
                                            <p className="text-sm text-gray-700 select-all">
                                                {stop.street}
                                                <br />
                                                {stop.city}, {stop.state} {stop.zip}
                                            </p>
                                        </div>
                                        <div className="flex flex-none place-items-center ">
                                            <button
                                                type="button"
                                                className="inline-flex items-center px-2 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openAddressInMaps(
                                                        `${stop.street} ${stop.city} ${stop.state} ${stop.zip}`,
                                                    );
                                                }}
                                                disabled={docsLoading}
                                            >
                                                <LocationMarkerIcon
                                                    className="w-6 h-6 text-gray-400"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="flex flex-col">
                                <div className="relative flex">
                                    <span className="absolute w-6 h-6 px-2 py-1 text-xs font-medium text-center text-gray-600 bg-white rounded-full -left-2 -top-2 ring-1 ring-inset ring-gray-500/10">
                                        {load.stops.length + 2}
                                    </span>
                                    <div className="mr-3">
                                        <div className="w-20 p-2 text-base text-center text-gray-700 bg-slate-100">
                                            <div className="text-base font-medium text-gray-900">
                                                {new Intl.DateTimeFormat('en-US', {
                                                    month: 'short',
                                                    day: '2-digit',
                                                }).format(new Date(load.receiver.date))}
                                            </div>
                                            <div className="text-sm">{load.receiver.time}</div>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-base font-semibold tracking-wide text-indigo-500 uppercase select-all">
                                            {load.receiver.name}
                                        </p>
                                        <p className="text-sm text-gray-700 select-all">
                                            {load.receiver.street}
                                            <br />
                                            {load.receiver.city}, {load.receiver.state} {load.receiver.zip}
                                        </p>
                                    </div>
                                    <div className="flex flex-none place-items-center ">
                                        <button
                                            type="button"
                                            className="inline-flex items-center px-2 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openAddressInMaps(
                                                    `${load.receiver.street} ${load.receiver.city} ${load.receiver.state} ${load.receiver.zip}`,
                                                );
                                            }}
                                            disabled={docsLoading}
                                        >
                                            <LocationMarkerIcon className="w-6 h-6 text-gray-400" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <LoadDetailsSkeleton></LoadDetailsSkeleton>
                )}
            </div>
        </div>
    );
};

LoadDetailsPage.authenticationEnabled = false;

export default LoadDetailsPage;
