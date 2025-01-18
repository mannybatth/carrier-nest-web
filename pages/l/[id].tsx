import { Menu, Transition } from '@headlessui/react';
import { MapPinIcon, PaperClipIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ArrowTopRightOnSquareIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import { LoadDocument, Prisma, RouteLegStatus } from '@prisma/client';
import classNames from 'classnames';
import { useRouter } from 'next/router';
import React, { ChangeEvent, Fragment, useEffect, useRef, useState } from 'react';
import { notify } from '../../components/Notification';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedDriverAssignment, ExpandedLoadDocument } from '../../interfaces/models';
import { hoursToReadable } from '../../lib/helpers/time';
import { addLoadDocumentToLoad, deleteLoadDocumentFromLoad } from '../../lib/rest/load';
import { uploadFileToGCS } from '../../lib/rest/uploadFile';
import { getAssignmentById } from '../../lib/rest/assignment';
import { updateRouteLegStatus } from 'lib/rest/routeLeg';
import { isDate24HrInThePast } from 'lib/load/load-utils';
import RouteLegStatusBadge from 'components/loads/RouteLegStatusBadge';

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

const DriverAssignmentDetailsPageSkeleton = () => {
    return (
        <div className="flex flex-col space-y-4">
            <div className="flex items-start justify-between">
                <div>
                    <div className="w-40 h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-20 h-5 mt-2 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div>
                    <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
            </div>

            <div className="flex space-x-3">
                <div className="flex-grow flex h-10 justify-center animate-pulse items-center rounded-md bg-gray-200 px-3 py-2.5 text-sm font-semibold text-white shadow-sm"></div>
            </div>

            <div className="flex flex-col justify-between space-y-4">
                <div className="flex flex-row space-x-4">
                    <div className="w-20 h-[60px] p-2 text-base bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex flex-col space-y-2">
                        <div className="w-40 h-5 p-2 text-base bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-20 h-8 p-2 text-base bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </div>
                <div className="flex flex-row space-x-4">
                    <div className="w-20 h-[60px] p-2 text-base bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex flex-col space-y-2">
                        <div className="w-40 h-5 p-2 text-base bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-20 h-8 p-2 text-base bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DriverAssignmentDetailsPage: PageWithAuth = () => {
    const router = useRouter();
    const searchParams = new URLSearchParams(router.query as any);
    const driverId = searchParams.get('did');
    const { id: assignmentId } = router.query as { id: string };

    const [assignment, setAssignment] = useState<ExpandedDriverAssignment>();
    const [assignmentLoading, setAssignmentLoading] = useState(true);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);

    const [loadDocuments, setLoadDocuments] = useState<ExpandedLoadDocument[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [dropOffDatePassed, setDropOffDatePassed] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (assignmentId && driverId) {
            reloadAssignment();
        }
    }, [assignmentId, driverId]);

    const reloadAssignment = async () => {
        setAssignmentLoading(true);

        try {
            const assignment = await getAssignmentById(assignmentId, driverId);
            setAssignment(assignment);
            setLoadDocuments([...assignment.load.podDocuments].filter((ld) => ld));
            setDropOffDatePassed(isDate24HrInThePast(new Date(assignment.load.receiver.date)));
        } catch (e) {
            notify({ title: 'Assignment does not exist', message: e.message, type: 'error' });
        }
        setAssignmentLoading(false);
    };

    const getDeviceLocation = (): Promise<{
        longitude: number | null;
        latitude: number | null;
    }> => {
        if (navigator.geolocation) {
            return new Promise((resolve, reject) => {
                setFetchingLocation(true);
                try {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            setFetchingLocation(false);
                            if (!position || !position.coords) {
                                resolve({
                                    longitude: null,
                                    latitude: null,
                                });
                            } else {
                                resolve({
                                    longitude: position.coords.longitude,
                                    latitude: position.coords.latitude,
                                });
                            }
                        },
                        (error) => {
                            setFetchingLocation(false);
                            resolve({
                                longitude: null,
                                latitude: null,
                            });
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0,
                        },
                    );
                } catch (e) {
                    setFetchingLocation(false);
                    resolve({
                        longitude: null,
                        latitude: null,
                    });
                }
            });
        } else {
            return Promise.resolve({
                longitude: null,
                latitude: null,
            });
        }
    };

    const beginWork = async () => {
        setStatusLoading(true);
        const { longitude, latitude } = await getDeviceLocation();
        const response = await updateRouteLegStatus(assignment.routeLeg.id, RouteLegStatus.IN_PROGRESS, {
            driverId,
            startLatitude: latitude,
            startLongitude: longitude,
        });
        if (response) {
            await reloadAssignment();
        }
        setStatusLoading(false);
    };

    const stopWork = async () => {
        setStatusLoading(true);
        const { longitude, latitude } = await getDeviceLocation();
        const response = await updateRouteLegStatus(assignment.routeLeg.id, RouteLegStatus.ASSIGNED, {
            driverId,
            longitude,
            latitude,
        });
        if (response) {
            await reloadAssignment();
        }
        setStatusLoading(false);
    };

    const completeWork = async () => {
        setStatusLoading(true);
        const { longitude, latitude } = await getDeviceLocation();
        const response = await updateRouteLegStatus(assignment.routeLeg.id, RouteLegStatus.COMPLETED, {
            driverId,
            endLatitude: latitude,
            endLongitude: longitude,
        });
        if (response) {
            await reloadAssignment();
        }
        setStatusLoading(false);
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            console.log('No file selected.');
            return;
        }

        setDocsLoading(true);
        try {
            const [uploadResponse, locationResponse] = await Promise.all([
                uploadFileToGCS(file, driverId, assignmentId),
                getDeviceLocation(),
            ]);
            if (uploadResponse?.uniqueFileName) {
                const simpleDoc: Partial<LoadDocument> = {
                    fileKey: uploadResponse.uniqueFileName,
                    fileUrl: uploadResponse.gcsInputUri,
                    fileName: uploadResponse.originalFileName,
                    fileType: file.type,
                    fileSize: BigInt(file.size),
                };
                const { longitude, latitude } = locationResponse;
                await addLoadDocumentToLoad(assignment.load.id, simpleDoc, {
                    driverId: driverId,
                    isPod: true,
                    longitude,
                    latitude,
                });

                reloadAssignment();

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
            await deleteLoadDocumentFromLoad(assignment.load.id, id, {
                driverId: driverId,
                isPod: true,
            });
            const newLoadDocuments = loadDocuments.filter((ld) => ld.id !== id);
            setLoadDocuments(newLoadDocuments);
            reloadAssignment();
            notify({ title: 'Document deleted', message: 'Document deleted successfully' });
        } catch (e) {
            notify({ title: 'Error deleting document', message: e.message, type: 'error' });
        }
        setDocsLoading(false);
    };

    const openAddressInMaps = (address: string) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    };

    const openRouteInGoogleMaps = () => {
        if (assignment && assignment.routeLeg?.locations && assignment.routeLeg.locations.length > 0) {
            const locations = assignment.routeLeg.locations;
            // Extract origin
            const originLegLocation = locations[0];
            const originLatitude = originLegLocation.loadStop?.latitude ?? originLegLocation.location?.latitude;
            const originLongitude = originLegLocation.loadStop?.longitude ?? originLegLocation.location?.longitude;
            const origin = `${originLatitude},${originLongitude}`;

            // Extract destination
            const destinationLegLocation = locations[locations.length - 1];
            const destinationLatitude =
                destinationLegLocation.loadStop?.latitude ?? destinationLegLocation.location?.latitude;
            const destinationLongitude =
                destinationLegLocation.loadStop?.longitude ?? destinationLegLocation.location?.longitude;
            const destination = `${destinationLatitude},${destinationLongitude}`;

            // Extract waypoints, skipping the first and last locations
            const waypoints = locations
                .slice(1, locations.length - 1)
                .map((location) => {
                    const lat = location.loadStop?.latitude ?? location.location?.latitude;
                    const long = location.loadStop?.longitude ?? location.location?.longitude;
                    return `${lat},${long}`;
                })
                .join('|'); // Use '|' as the separator for waypoints

            // Ensure origin and destination are not empty
            if (!origin || !destination) {
                return;
            }

            // Build the Google Maps URL using query parameters
            const searchParams = new URLSearchParams({
                api: '1',
                origin: origin,
                destination: destination,
                travelmode: 'driving',
            });

            if (waypoints) {
                searchParams.append('waypoints', waypoints);
            }

            const googleMapsWebUri = `https://www.google.com/maps/dir/?${searchParams.toString()}`;
            window.open(googleMapsWebUri);
        }
    };

    return (
        <div className="max-w-4xl py-6 mx-auto">
            <h1 className="px-4 mb-2 text-2xl font-semibold text-center text-gray-900">
                {assignment?.load.carrier?.name || (
                    <span className="inline-block w-48 h-6 bg-gray-200 rounded animate-pulse"></span>
                )}
            </h1>
            <div className="flex flex-col px-4 mb-12 space-y-2">
                <div className="flex flex-row">
                    <h3 className="font-semibold">Your Load Assignment</h3>
                </div>

                {!assignmentLoading ? (
                    assignment ? (
                        <div className="p-4 space-y-5 overflow-hidden border-2 rounded-lg">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-base font-semibold uppercase">
                                        {assignment.load.customer?.name}
                                    </div>
                                    <div className="space-x-2">
                                        <span className="text-sm font-semibold text-slate-500">Load/Order #:</span>
                                        <span className="text-sm font-semibold">{assignment.load.refNum}</span>
                                    </div>
                                    <div className="space-x-2">
                                        <span className="text-sm font-semibold text-slate-500">Scheduled For:</span>
                                        <span className="text-sm font-semibold">
                                            {new Intl.DateTimeFormat('en-US', {
                                                month: 'short',
                                                day: '2-digit',
                                            }).format(new Date(assignment.routeLeg.scheduledDate))}
                                            , {assignment.routeLeg.scheduledTime}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <RouteLegStatusBadge routeLeg={assignment.routeLeg} />
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                {assignment.routeLeg.status === RouteLegStatus.ASSIGNED && (
                                    <button
                                        type="button"
                                        className="flex-grow flex justify-center items-center rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                                        onClick={() => beginWork()}
                                        disabled={statusLoading}
                                    >
                                        {statusLoading && loadingSvg}
                                        {!statusLoading && 'Begin Work'}
                                        {fetchingLocation && 'Fetching Location...'}
                                    </button>
                                )}
                                {assignment.routeLeg.status === RouteLegStatus.IN_PROGRESS && (
                                    <button
                                        type="button"
                                        className="flex-grow flex justify-center items-center rounded-md bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                                        onClick={() => completeWork()}
                                        disabled={statusLoading}
                                    >
                                        {statusLoading && loadingSvg}
                                        {!statusLoading && 'Set as Delivered'}
                                        {fetchingLocation && 'Fetching Location...'}
                                    </button>
                                )}
                                {assignment.routeLeg.status === RouteLegStatus.COMPLETED && (
                                    <>
                                        <button
                                            type="button"
                                            className="flex-grow flex justify-center items-center rounded-md bg-purple-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={docsLoading || statusLoading}
                                        >
                                            {(docsLoading || statusLoading) && loadingSvg}
                                            {!(docsLoading || statusLoading) && 'Upload POD'}
                                            {fetchingLocation && 'Fetching Location...'}
                                        </button>
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                            ref={fileInputRef}
                                        />
                                    </>
                                )}
                                {!dropOffDatePassed &&
                                    (assignment.routeLeg.status === RouteLegStatus.IN_PROGRESS ||
                                        assignment.routeLeg.status === RouteLegStatus.COMPLETED) && (
                                        <Menu as="div" className="relative inline-block text-left">
                                            <div>
                                                <Menu.Button
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex justify-center items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-400 hover:text-gray-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                                >
                                                    <span className="sr-only">Open options</span>
                                                    <EllipsisVerticalIcon className="w-6 h-6" aria-hidden="true" />
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
                                                        {assignment.routeLeg.status === RouteLegStatus.IN_PROGRESS && (
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
                                                        {assignment.routeLeg.status === RouteLegStatus.COMPLETED && (
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
                                                {doc.driverId === driverId && (
                                                    <div className="flex-shrink-0 ml-2">
                                                        <button
                                                            type="button"
                                                            className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteLoadDocument(doc.id);
                                                            }}
                                                            disabled={docsLoading}
                                                        >
                                                            <TrashIcon className="flex-shrink-0 w-4 h-4 text-gray-800"></TrashIcon>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-col justify-between space-y-4">
                                {assignment.routeLeg.locations.map((location, index) => {
                                    const item = location.loadStop || location.location;
                                    return (
                                        <div className="flex flex-col" key={index}>
                                            <div className="flex flex-col items-start px-4 py-4 border-l-4 border-blue-600 rounded-lg bg-gray-50 sm:flex-row sm:items-center sm:px-6">
                                                {/* Step Number */}
                                                <div className="flex items-center justify-center w-8 h-8 mb-3 font-bold text-white bg-blue-600 rounded-full sm:w-10 sm:h-10 sm:mb-0 sm:mr-6">
                                                    {index + 1}
                                                </div>

                                                {/* Location Details */}
                                                <div className="flex-1">
                                                    {/* Location Name */}
                                                    <h3 className="text-base font-semibold text-gray-800 sm:text-lg">
                                                        {item.name}
                                                    </h3>

                                                    {/* Address */}
                                                    <p className="mb-2 text-sm text-gray-700">
                                                        {item.street}, {item.city}, {item.state} {item.zip}
                                                    </p>

                                                    {/* LoadStop Date and Time */}
                                                    {location.loadStop && (
                                                        <>
                                                            <p className="mb-1 text-sm text-gray-700">
                                                                <span className="font-semibold text-gray-600">
                                                                    Date:
                                                                </span>{' '}
                                                                {new Intl.DateTimeFormat('en-US', {
                                                                    month: 'short',
                                                                    day: '2-digit',
                                                                }).format(new Date(location.loadStop.date))}{' '}
                                                                <span className="font-semibold text-gray-600">
                                                                    Time:
                                                                </span>{' '}
                                                                {location.loadStop.time}
                                                            </p>
                                                        </>
                                                    )}

                                                    {/* Additional Info */}
                                                    <div className="space-y-1 text-sm text-gray-700">
                                                        {location.loadStop?.poNumbers && (
                                                            <p>
                                                                <span className="font-semibold text-gray-600">
                                                                    PO #’s:
                                                                </span>{' '}
                                                                {location.loadStop.poNumbers}
                                                            </p>
                                                        )}
                                                        {location.loadStop?.pickUpNumbers && (
                                                            <p>
                                                                <span className="font-semibold text-gray-600">
                                                                    PU #’s:
                                                                </span>{' '}
                                                                {location.loadStop.pickUpNumbers}
                                                            </p>
                                                        )}
                                                        {location.loadStop?.referenceNumbers && (
                                                            <p>
                                                                <span className="font-semibold text-gray-600">
                                                                    Ref #’s:
                                                                </span>{' '}
                                                                {location.loadStop.referenceNumbers}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Map Button */}
                                                <div className="mt-3 sm:mt-0 sm:ml-auto">
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center justify-center w-full px-3 py-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openAddressInMaps(
                                                                `${item.street} ${item.city} ${item.state} ${item.zip}`,
                                                            );
                                                        }}
                                                        disabled={docsLoading}
                                                    >
                                                        <MapPinIcon className="w-5 h-5" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="flex flex-row space-x-2">
                                    <div className="text-sm">
                                        {assignment.routeLeg.distanceMiles && (
                                            <div>
                                                Distance:{' '}
                                                {new Prisma.Decimal(assignment.routeLeg.distanceMiles)
                                                    .toNumber()
                                                    .toFixed(2)}{' '}
                                                miles
                                            </div>
                                        )}
                                        {assignment.routeLeg.durationHours && (
                                            <div>
                                                Travel Time:{' '}
                                                {hoursToReadable(
                                                    new Prisma.Decimal(assignment.routeLeg.durationHours).toNumber(),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1"></div>
                                    <div className="flex-none">
                                        <button
                                            type="button"
                                            className="inline-flex items-center justify-center w-full px-3 py-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                                            onClick={openRouteInGoogleMaps}
                                        >
                                            Get Directions
                                            <ArrowTopRightOnSquareIcon className="flex-shrink-0 w-4 h-4 ml-2 -mr-1" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4 overflow-hidden border-2 rounded-lg">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-base font-semibold uppercase">No Assignment Found</div>
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="p-4 space-y-4 overflow-hidden border-2 rounded-lg">
                        <DriverAssignmentDetailsPageSkeleton></DriverAssignmentDetailsPageSkeleton>
                    </div>
                )}
            </div>
        </div>
    );
};

DriverAssignmentDetailsPage.authenticationEnabled = false;

export default DriverAssignmentDetailsPage;
