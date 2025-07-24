'use client';

import { Dialog, Transition } from '@headlessui/react';
import {
    PlusIcon,
    UserCircleIcon,
    XMarkIcon,
    UserPlusIcon,
    PencilSquareIcon,
    ChevronDoubleRightIcon,
    Bars3Icon,
    MapIcon,
    ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import React, { Fragment, useCallback, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { LoadingOverlay } from '../LoadingOverlay';
import { useLoadContext } from '../context/LoadContext';
import { type LoadStop, Prisma, type Route } from '@prisma/client';
import type { ExpandedRouteLeg, ExpandedRouteLegLocation } from 'interfaces/models';
import { notify } from 'components/Notification';
import type { CreateAssignmentRequest, DriverWithCharge, UpdateAssignmentRequest } from 'interfaces/assignment';
import RouteLegDriverSelection from './RouteLegDriverSelection';
import RouteLegLocationSelection from './RouteLegLocationSelection';
import { useRouteLegDataContext } from 'components/context/RouteLegDataContext';
import { getRouteForCoords } from 'lib/mapbox/searchGeo';
import { useLocalStorage } from 'lib/useLocalStorage';
import { hoursToReadable } from 'lib/helpers/time';
import { createRouteLeg, updateRouteLeg } from 'lib/rest/assignment';
import { calculateDriverPay, formatCurrency } from 'lib/helpers/calculateDriverPay';
import RouteMapViewer from './RouteMapViewer';

interface DragState {
    isDragging: boolean;
    draggedIndex: number | null;
    hoverIndex: number | null;
    dragDirection: 'up' | 'down' | null;
    dragOffset: { x: number; y: number };
}

interface LocationItemProps {
    location: ExpandedRouteLegLocation;
    index: number;
    onReorder: (fromIndex: number, toIndex: number) => void;
    onRemove: (event: React.ChangeEvent<HTMLInputElement>) => void;
    dragState: DragState;
    onDragStateChange: (state: Partial<DragState>) => void;
}

const LocationItem: React.FC<LocationItemProps> = ({
    location,
    index,
    onReorder,
    onRemove,
    dragState,
    onDragStateChange,
}) => {
    const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const dragRef = useRef<HTMLDivElement>(null);
    const itemRef = useRef<HTMLDivElement>(null);

    const isLoadStop = !!location.loadStop;
    const item = isLoadStop ? location.loadStop : location.location;
    const itemId = location.loadStop?.id || location.location.id;

    const isDragging = dragState.isDragging && dragState.draggedIndex === index;
    const isHovered = dragState.hoverIndex === index && dragState.draggedIndex !== index;
    const shouldSlideUp = isHovered && dragState.dragDirection === 'up';
    const shouldSlideDown = isHovered && dragState.dragDirection === 'down';

    // Calculate transform for sliding effect
    const getTransform = () => {
        if (isDragging) {
            return `translate(${dragState.dragOffset.x}px, ${dragState.dragOffset.y}px) scale(1.02) rotate(2deg)`;
        }
        if (shouldSlideUp) {
            return 'translateY(-8px)';
        }
        if (shouldSlideDown) {
            return 'translateY(8px)';
        }
        return 'translateY(0px)';
    };

    // Desktop drag handlers
    const handleDragStart = (e: React.DragEvent) => {
        const rect = itemRef.current?.getBoundingClientRect();
        if (rect) {
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            onDragStateChange({
                isDragging: true,
                draggedIndex: index,
                dragOffset: { x: 0, y: 0 },
            });

            // Hide default drag image
            const emptyImg = new Image();
            emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
            e.dataTransfer.setDragImage(emptyImg, 0, 0);
        }

        e.dataTransfer.setData('text/plain', index.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        onDragStateChange({
            isDragging: false,
            draggedIndex: null,
            hoverIndex: null,
            dragDirection: null,
            dragOffset: { x: 0, y: 0 },
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (dragState.draggedIndex !== null && dragState.draggedIndex !== index) {
            const rect = itemRef.current?.getBoundingClientRect();
            if (rect) {
                const mouseY = e.clientY;
                const itemCenterY = rect.top + rect.height / 2;
                const direction = mouseY < itemCenterY ? 'up' : 'down';

                onDragStateChange({
                    hoverIndex: index,
                    dragDirection: direction,
                });
            }
        }
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        if (dragState.draggedIndex !== null && dragState.draggedIndex !== index) {
            onDragStateChange({ hoverIndex: index });
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // Only clear hover if we're actually leaving the element
        const rect = itemRef.current?.getBoundingClientRect();
        if (rect) {
            const { clientX, clientY } = e;
            if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
                onDragStateChange({ hoverIndex: null, dragDirection: null });
            }
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();

        const fromIndex = Number.parseInt(e.dataTransfer.getData('text/plain'));
        const toIndex = index;

        if (fromIndex !== toIndex) {
            onReorder(fromIndex, toIndex);
        }

        onDragStateChange({
            isDragging: false,
            draggedIndex: null,
            hoverIndex: null,
            dragDirection: null,
            dragOffset: { x: 0, y: 0 },
        });
    };

    // Track mouse movement during drag for visual feedback
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && itemRef.current) {
                const rect = itemRef.current.getBoundingClientRect();
                const offsetX = e.clientX - rect.left - rect.width / 2;
                const offsetY = e.clientY - rect.top - rect.height / 2;

                onDragStateChange({
                    dragOffset: { x: offsetX * 0.3, y: offsetY * 0.3 }, // Dampen movement
                });
            }
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            return () => document.removeEventListener('mousemove', handleMouseMove);
        }
    }, [isDragging, onDragStateChange]);

    // Mobile touch handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setTouchStartPos({ x: touch.clientX, y: touch.clientY });

        const timer = setTimeout(() => {
            onDragStateChange({
                isDragging: true,
                draggedIndex: index,
                dragOffset: { x: 0, y: 0 },
            });

            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500);

        setLongPressTimer(timer);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartPos) return;

        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPos.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.y);

        // Cancel long press if moved too much
        if ((deltaX > 10 || deltaY > 10) && longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }

        // Handle drag if started
        if (isDragging) {
            e.preventDefault();

            // Update drag offset
            const offsetX = (touch.clientX - touchStartPos.x) * 0.3;
            const offsetY = (touch.clientY - touchStartPos.y) * 0.3;

            onDragStateChange({
                dragOffset: { x: offsetX, y: offsetY },
            });

            // Find element under touch
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const dropTarget = elementBelow?.closest('[data-drop-target]');

            if (dropTarget && dropTarget !== itemRef.current) {
                const targetIndex = Number.parseInt(dropTarget.getAttribute('data-index') || '0');
                const rect = dropTarget.getBoundingClientRect();
                const touchY = touch.clientY;
                const itemCenterY = rect.top + rect.height / 2;
                const direction = touchY < itemCenterY ? 'up' : 'down';

                onDragStateChange({
                    hoverIndex: targetIndex,
                    dragDirection: direction,
                });
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }

        if (isDragging && dragState.hoverIndex !== null && dragState.hoverIndex !== index) {
            onReorder(index, dragState.hoverIndex);
        }

        setTouchStartPos(null);
        onDragStateChange({
            isDragging: false,
            draggedIndex: null,
            hoverIndex: null,
            dragDirection: null,
            dragOffset: { x: 0, y: 0 },
        });
    };

    return (
        <div
            ref={itemRef}
            draggable
            data-drop-target
            data-index={index}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`
        relative bg-white rounded-lg p-4 border transition-all duration-300 ease-out
        ${
            isDragging
                ? 'opacity-90 shadow-2xl z-50 border-blue-400 ring-2 ring-blue-200 ring-opacity-50'
                : 'opacity-100 shadow-sm border-gray-200'
        }
        ${isHovered && !isDragging ? 'border-blue-300 shadow-md bg-blue-50' : ''}
        ${!isDragging ? 'hover:shadow-md hover:border-gray-300' : ''}
        cursor-grab active:cursor-grabbing
      `}
            style={{
                transform: getTransform(),
                zIndex: isDragging ? 1000 : 'auto',
                transition: isDragging
                    ? 'box-shadow 0.2s ease-out, border-color 0.2s ease-out'
                    : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            {/* Drag indicator overlay */}
            {isDragging && <div className="absolute inset-0 bg-blue-500 bg-opacity-5 rounded-lg pointer-events-none" />}

            {/* Drop zone indicators */}
            {isHovered && !isDragging && (
                <>
                    {shouldSlideUp && <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />}
                    {shouldSlideDown && (
                        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />
                    )}
                </>
            )}

            <div className="flex items-start space-x-3 relative z-10">
                <div className="flex-shrink-0 flex flex-col items-center space-y-2">
                    <div
                        className={`
            w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm transition-all duration-200
            ${isDragging ? 'bg-blue-600 scale-110 shadow-lg' : 'bg-blue-500'}
          `}
                    >
                        {index + 1}
                    </div>
                    <div
                        className={`
            w-5 h-5 bg-gray-100 rounded flex items-center justify-center transition-all duration-200
            ${isDragging ? 'bg-blue-100' : ''}
          `}
                    >
                        <Bars3Icon
                            className={`w-3 h-3 transition-colors duration-200 ${
                                isDragging ? 'text-blue-600' : 'text-gray-500'
                            }`}
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <p
                        className={`
            text-base font-semibold capitalize truncate mb-1 transition-colors duration-200
            ${isDragging ? 'text-blue-900' : 'text-gray-900'}
          `}
                    >
                        {item.name.toLowerCase()}
                    </p>
                    {isLoadStop && (
                        <p
                            className={`
              text-sm font-medium mb-1 transition-colors duration-200
              ${isDragging ? 'text-blue-700' : 'text-blue-600'}
            `}
                        >
                            {new Date((item as LoadStop).date).toLocaleDateString()} @ {(item as LoadStop).time}
                        </p>
                    )}
                    <p
                        className={`
            text-sm truncate mb-1 capitalize transition-colors duration-200
            ${isDragging ? 'text-blue-700' : 'text-gray-600'}
          `}
                    >
                        {item.street.toLowerCase()}
                    </p>
                    <p
                        className={`
            text-sm capitalize transition-colors duration-200
            ${isDragging ? 'text-blue-600' : 'text-gray-500'}
          `}
                    >
                        {item.city.toLowerCase()}, {item.state.toUpperCase()}
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <div
                        className={`
            w-6 h-6 bg-gray-50 rounded flex items-center justify-center border transition-all duration-200
            ${isDragging ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}
          `}
                    >
                        <input
                            type="checkbox"
                            value={itemId}
                            checked={true}
                            onChange={onRemove}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

type Props = {
    show: boolean;
    routeLeg?: ExpandedRouteLeg;
    onClose: (value: boolean) => void;
};

const RouteLegModal: React.FC<Props> = ({ show, routeLeg, onClose }: Props) => {
    const router = useRouter();
    const [load, setLoad] = useLoadContext();
    const [routeLegData, setRouteLegData] = useRouteLegDataContext();
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        draggedIndex: null,
        hoverIndex: null,
        dragDirection: null,
        dragOffset: { x: 0, y: 0 },
    });

    const [showDriverSelection, setShowDriverSelection] = React.useState(false);
    const [showLegLocationSelection, setShowLegLocationSelection] = React.useState(false);
    const [showRouteVisualization, setShowRouteVisualization] = React.useState(false);
    const [selectedRouteIndex, setSelectedRouteIndex] = React.useState(0);

    const [sendSMS, setSendSMS] = useLocalStorage<boolean>('sendSMS', true);

    const [saveLoading, setSaveLoading] = React.useState(false);
    const [loadingRouteDetails, setLoadingRouteDetails] = React.useState(false);

    const handleDragStateChange = useCallback((newState: Partial<DragState>) => {
        setDragState((prev) => ({ ...prev, ...newState }));
    }, []);

    React.useEffect(() => {
        if (routeLeg) {
            setRouteLegData({
                driversWithCharge: routeLeg.driverAssignments.map((assignment) => {
                    return {
                        driver: assignment.driver,
                        chargeType: assignment.chargeType,
                        chargeValue: Number(assignment.chargeValue),
                    };
                }),
                locations: routeLeg.locations,
                driverInstructions: routeLeg.driverInstructions,
                scheduledDate: new Date(routeLeg.scheduledDate).toISOString().split('T')[0],
                scheduledTime: routeLeg.scheduledTime,
                distanceMiles: new Prisma.Decimal(routeLeg.distanceMiles).toNumber(),
                durationHours: new Prisma.Decimal(routeLeg.durationHours).toNumber(),
            });
        } else {
            setRouteLegData({
                driversWithCharge: [],
                locations: [],
                driverInstructions: '',
                scheduledDate: new Date().toISOString().split('T')[0],
                scheduledTime: '',
            });
        }
    }, [routeLeg]);

    const close = (value: boolean) => {
        onClose(value);
        setRouteLegData({
            driversWithCharge: [],
            locations: [],
            driverInstructions: '',
            scheduledDate: new Date().toISOString().split('T')[0],
            scheduledTime: '',
        });
        setShowLegLocationSelection(false);
        setShowDriverSelection(false);
        setDragState({
            isDragging: false,
            draggedIndex: null,
            hoverIndex: null,
            dragDirection: null,
            dragOffset: { x: 0, y: 0 },
        });
    };

    const handleDriverCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.checked) {
            const currentDriverList = routeLegData.driversWithCharge;
            const newDriverList = currentDriverList.filter((item) => item.driver.id !== event.target.value);
            setRouteLegData({
                ...routeLegData,
                driversWithCharge: newDriverList,
            });
        }
    };

    const handleLegLocationCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.checked) {
            const currentLocationList = routeLegData.locations;
            const newLocationList = currentLocationList.filter((location) => {
                const locId = location.loadStop ? location.loadStop.id : location.location.id;
                return locId !== event.target.value;
            });
            setRouteLegData({
                ...routeLegData,
                locations: newLocationList,
            });

            updateRouteDetails(newLocationList);
        }
    };

    const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
        setRouteLegData((prevData) => {
            const newLocations = [...prevData.locations];
            const [movedItem] = newLocations.splice(fromIndex, 1);
            newLocations.splice(toIndex, 0, movedItem);

            // Debounce route updates
            setTimeout(() => {
                updateRouteDetails(newLocations);
            }, 300);

            return { ...prevData, locations: newLocations };
        });
    }, []);

    const updateRouteDetails = async (locations: ExpandedRouteLegLocation[]) => {
        if (locations.length < 2) return;

        setLoadingRouteDetails(true);
        try {
            const coords = locations.map((legLocation) => {
                const lat = legLocation.loadStop?.latitude ?? legLocation.location?.latitude;
                const long = legLocation.loadStop?.longitude ?? legLocation.location?.longitude;

                if (lat == null || long == null) {
                    throw new Error('One or more locations are missing latitude or longitude');
                }

                return [long, lat];
            });

            const { routeEncoded, distanceMiles, durationHours } = await getRouteForCoords(coords);

            setRouteLegData((prevData) => ({
                ...prevData,
                distanceMiles: distanceMiles,
                durationHours: durationHours,
                routeEncoded: routeEncoded, // Store the route encoding
            }));
        } catch (error) {
            notify({ title: 'Error', message: `Error fetching route details: ${error.message}`, type: 'error' });
        } finally {
            setLoadingRouteDetails(false);
        }
    };

    const onSelectedDriversChange = (drivers: DriverWithCharge[]) => {
        setRouteLegData({
            ...routeLegData,
            driversWithCharge: drivers,
        });
    };

    const onSelectedLegLocationsChange = async (locations: ExpandedRouteLegLocation[]) => {
        setRouteLegData({
            ...routeLegData,
            locations: locations,
        });

        updateRouteDetails(locations);
    };

    const handleSuccessAndClose = () => {
        // Check if we have routeLegId in URL params for navigation after close
        const { routeLegId } = router.query;

        if (routeLegId) {
            // For router navigation scenarios, we need to navigate first to avoid reopening
            router.replace(`/loads/${load.id}`).then(() => {
                // Close modal after URL has been updated
                close(true);
            });
        } else {
            // Normal close without navigation
            close(true);
        }
    };

    const submit = async () => {
        setSaveLoading(true);

        if (!routeLegData.scheduledDate) {
            notify({ title: 'Error', message: 'Please select a valid date', type: 'error' });
            setSaveLoading(false);
            return;
        }

        if (!routeLegData.scheduledTime) {
            notify({ title: 'Error', message: 'Please select a valid time', type: 'error' });
            setSaveLoading(false);
            return;
        }

        try {
            if (routeLeg) {
                const updateRequest: UpdateAssignmentRequest = {
                    routeLegId: routeLeg?.id,
                    routeLegData: routeLegData,
                    sendSms: sendSMS,
                    loadId: load.id,
                };

                try {
                    const route = await updateRouteLeg(updateRequest);

                    setLoad((prevLoad) => {
                        // Collect all driver assignments from all route legs for top-level update
                        const allDriverAssignments =
                            route?.routeLegs?.flatMap((leg) => leg.driverAssignments || []) || [];

                        const updatedLoad = {
                            ...prevLoad,
                            route: route as any,
                            driverAssignments: allDriverAssignments as any, // Update top-level driver assignments
                        };
                        return updatedLoad;
                    });

                    notify({ title: 'Load Assignment', message: 'Assignment updated successfully', type: 'success' });
                    handleSuccessAndClose();
                    setSaveLoading(false);
                } catch (error) {
                    setSaveLoading(false);
                    notify({ title: 'Error', message: 'Error updating driver assignment', type: 'error' });
                }
            } else {
                const createRequest: CreateAssignmentRequest = {
                    routeLegData: routeLegData,
                    sendSms: sendSMS,
                    loadId: load.id,
                };

                try {
                    const route = await createRouteLeg(createRequest);

                    // Update the load context with the new route, preserving all other load data
                    setLoad((prevLoad) => {
                        // Collect all driver assignments from all route legs
                        const allDriverAssignments =
                            route?.routeLegs?.flatMap((leg) => leg.driverAssignments || []) || [];

                        // Ensure we have the complete route structure
                        const updatedLoad = {
                            ...prevLoad,
                            route: route as any, // Type cast to resolve compatibility issues
                            driverAssignments: allDriverAssignments as any, // Update top-level driver assignments
                        };

                        return updatedLoad;
                    });

                    notify({ title: 'Load Assignment', message: 'Assignment created successfully', type: 'success' });
                    handleSuccessAndClose();
                    setSaveLoading(false);
                } catch (error) {
                    setSaveLoading(false);
                    notify({ title: 'Error', message: 'Error creating driver assignment', type: 'error' });
                }
            }
        } catch (error) {
            setSaveLoading(false);
            notify({ title: 'Error', message: `Error processing request: ${error.message}`, type: 'error' });
        }
    };

    const calcDriverPay = (driverId: string) => {
        const chargeType = routeLegData.driversWithCharge.find((d) => d.driver.id === driverId)?.chargeType;
        const chargeValue = routeLegData.driversWithCharge.find((d) => d.driver.id === driverId)?.chargeValue ?? 0;

        return calculateDriverPay({
            chargeType,
            chargeValue,
            distanceMiles: routeLegData.distanceMiles ?? 0,
            durationHours: routeLegData.durationHours ?? 0,
            loadRate: new Prisma.Decimal(load.rate),
        });
    };

    const calculateTotalPay = () => {
        return routeLegData.driversWithCharge
            .reduce((total, driverWithCharge) => {
                return total.plus(calcDriverPay(driverWithCharge.driver.id));
            }, new Prisma.Decimal(0))
            .toNumber();
    };

    return (
        <>
            <Transition.Root show={show} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={(value) => close(value)}>
                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-hidden">
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="fixed inset-y-0 right-0 flex max-w-full pointer-events-none">
                                <Transition.Child
                                    as={Fragment}
                                    enter="transform transition ease-in-out duration-500 sm:duration-200"
                                    enterFrom="translate-x-full"
                                    enterTo="translate-x-0"
                                    leave="transform transition ease-in-out duration-500 sm:duration-200"
                                    leaveFrom="translate-x-0"
                                    leaveTo="translate-x-full"
                                >
                                    <Dialog.Panel className="w-screen max-w-md sm:max-w-lg pointer-events-auto">
                                        {saveLoading && (
                                            <LoadingOverlay
                                                message={routeLeg ? 'Updating Assignment...' : 'Creating Assignment...'}
                                            />
                                        )}

                                        {showLegLocationSelection && (
                                            <div className="relative flex flex-col h-full space-y-4 bg-white shadow-xl">
                                                <RouteLegLocationSelection
                                                    title="Select Stops"
                                                    onLegLocationsSelectionSave={onSelectedLegLocationsChange}
                                                    onGoBack={() => {
                                                        setShowLegLocationSelection(false);
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {showDriverSelection && (
                                            <div className="relative flex flex-col h-full  bg-white shadow-xl">
                                                <RouteLegDriverSelection
                                                    title="Select Drivers"
                                                    selectedDrivers={routeLegData.driversWithCharge}
                                                    distanceMiles={routeLegData.distanceMiles}
                                                    durationHours={routeLegData.durationHours}
                                                    loadRate={new Prisma.Decimal(load.rate)}
                                                    onDriverSelectionSave={onSelectedDriversChange}
                                                    onGoBack={() => setShowDriverSelection(false)}
                                                />
                                            </div>
                                        )}

                                        {showRouteVisualization && (
                                            <div className="relative flex flex-col h-full bg-gray-50">
                                                {/* Sticky Header */}
                                                <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
                                                    <div className="flex items-center px-6 py-6">
                                                        <button
                                                            type="button"
                                                            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors mr-3"
                                                            onClick={() => setShowRouteVisualization(false)}
                                                        >
                                                            <ArrowLeftIcon className="w-4 h-4 text-gray-600" />
                                                        </button>
                                                        <div className="flex-1">
                                                            <h1 className="text-lg font-bold text-gray-900">Route</h1>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                Optimized for truck traffic
                                                            </p>
                                                        </div>
                                                        {routeLegData.distanceMiles && routeLegData.durationHours && (
                                                            <div className="flex items-center space-x-4 text-right">
                                                                <div>
                                                                    <div className="text-lg font-semibold text-gray-900 tabular-nums">
                                                                        {routeLegData.distanceMiles.toFixed(1)} mi
                                                                    </div>
                                                                    <div className="text-sm text-gray-500 -mt-1">
                                                                        {(() => {
                                                                            const totalMinutes = Math.round(
                                                                                routeLegData.durationHours * 60,
                                                                            );
                                                                            const h = Math.floor(totalMinutes / 60);
                                                                            const m = totalMinutes % 60;
                                                                            return h > 0 ? `${h}h ${m}m` : `${m}m`;
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 overflow-y-auto">
                                                    {routeLegData.locations.length < 2 ? (
                                                        <div className="flex items-center justify-center h-full">
                                                            <div className="text-center px-6">
                                                                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                                                    <MapIcon className="w-8 h-8 text-gray-400" />
                                                                </div>
                                                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                                    No Route Available
                                                                </h3>
                                                                <p className="text-gray-500 text-sm max-w-sm">
                                                                    Add at least two stops to view your route
                                                                    visualization
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-0">
                                                            {/* Route Map - Full width, no padding */}
                                                            <div className="bg-white overflow-hidden">
                                                                <RouteMapViewer
                                                                    locations={routeLegData.locations}
                                                                    routeEncoded={routeLegData.routeEncoded}
                                                                    distanceMiles={routeLegData.distanceMiles}
                                                                    durationHours={routeLegData.durationHours}
                                                                    selectedRouteIndex={selectedRouteIndex}
                                                                    onRouteUpdate={(routeData) => {
                                                                        setRouteLegData((prevData) => ({
                                                                            ...prevData,
                                                                            distanceMiles: routeData.distanceMiles,
                                                                            durationHours: routeData.durationHours,
                                                                            routeEncoded: routeData.routeEncoded,
                                                                        }));
                                                                        setSelectedRouteIndex(
                                                                            routeData.selectedRouteIndex,
                                                                        );
                                                                    }}
                                                                    className="w-full"
                                                                />
                                                            </div>

                                                            {/* Stops Section - Maintain padding */}
                                                            <div className="px-4 py-6">
                                                                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                                                                    <div className="px-6 py-4 border-b border-gray-100">
                                                                        <h2 className="text-lg font-semibold text-gray-900">
                                                                            Stops
                                                                        </h2>
                                                                        <p className="text-sm text-gray-500 mt-1">
                                                                            {routeLegData.locations.length} locations on
                                                                            this route
                                                                        </p>
                                                                    </div>
                                                                    <div className="divide-y divide-gray-100">
                                                                        {routeLegData.locations.map(
                                                                            (location, index) => {
                                                                                const isLoadStop = !!location.loadStop;
                                                                                const item = isLoadStop
                                                                                    ? location.loadStop
                                                                                    : location.location;
                                                                                const isFirst = index === 0;
                                                                                const isLast =
                                                                                    index ===
                                                                                    routeLegData.locations.length - 1;

                                                                                // Determine location type and styling
                                                                                let locationTypeLabel =
                                                                                    'Custom Location';
                                                                                let locationTypeColor =
                                                                                    'bg-gray-50 text-gray-700 border border-gray-200';

                                                                                if (isLoadStop) {
                                                                                    const loadStopType =
                                                                                        location.loadStop?.type;
                                                                                    switch (loadStopType) {
                                                                                        case 'SHIPPER':
                                                                                            locationTypeLabel =
                                                                                                'Shipper';
                                                                                            locationTypeColor =
                                                                                                'bg-green-50 text-green-700 border border-green-200';
                                                                                            break;
                                                                                        case 'RECEIVER':
                                                                                            locationTypeLabel =
                                                                                                'Receiver';
                                                                                            locationTypeColor =
                                                                                                'bg-red-50 text-red-700 border border-red-200';
                                                                                            break;
                                                                                        case 'STOP':
                                                                                            locationTypeLabel = 'Stop';
                                                                                            locationTypeColor =
                                                                                                'bg-blue-50 text-blue-700 border border-blue-200';
                                                                                            break;
                                                                                        default:
                                                                                            locationTypeLabel =
                                                                                                'Load Stop';
                                                                                            locationTypeColor =
                                                                                                'bg-purple-50 text-purple-700 border border-purple-200';
                                                                                    }
                                                                                }

                                                                                return (
                                                                                    <div
                                                                                        key={item.id}
                                                                                        className="px-6 py-5"
                                                                                    >
                                                                                        <div className="flex items-start space-x-4">
                                                                                            <div className="flex-shrink-0 relative">
                                                                                                <div
                                                                                                    className={`
                                                                                            w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold
                                                                                            ${
                                                                                                isFirst
                                                                                                    ? 'bg-green-500'
                                                                                                    : isLast
                                                                                                    ? 'bg-red-500'
                                                                                                    : 'bg-blue-500'
                                                                                            }
                                                                                        `}
                                                                                                >
                                                                                                    {index + 1}
                                                                                                </div>
                                                                                                {!isLast && (
                                                                                                    <div className="absolute top-8 left-1/2 w-px h-8 bg-gray-200 -translate-x-px"></div>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="flex items-start justify-between">
                                                                                                    <div className="flex-1 min-w-0">
                                                                                                        <h3 className="text-base font-medium text-gray-900 truncate">
                                                                                                            {item.name}
                                                                                                        </h3>
                                                                                                        <p className="text-sm text-gray-500 mt-1">
                                                                                                            {
                                                                                                                item.street
                                                                                                            }
                                                                                                            ,{' '}
                                                                                                            {item.city},{' '}
                                                                                                            {item.state.toUpperCase()}
                                                                                                        </p>
                                                                                                        {isLoadStop && (
                                                                                                            <div className="flex items-center space-x-2 mt-2">
                                                                                                                <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                                                                                                    {new Date(
                                                                                                                        (
                                                                                                                            item as any
                                                                                                                        ).date,
                                                                                                                    ).toLocaleDateString(
                                                                                                                        'en-US',
                                                                                                                        {
                                                                                                                            month: 'short',
                                                                                                                            day: 'numeric',
                                                                                                                        },
                                                                                                                    )}
                                                                                                                </div>
                                                                                                                <div className="text-xs font-medium text-gray-600">
                                                                                                                    {
                                                                                                                        (
                                                                                                                            item as any
                                                                                                                        )
                                                                                                                            .time
                                                                                                                    }
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="ml-4 flex-shrink-0">
                                                                                                        <span
                                                                                                            className={`
                                                                                                    inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                                                                                    ${locationTypeColor}
                                                                                                `}
                                                                                                        >
                                                                                                            {
                                                                                                                locationTypeLabel
                                                                                                            }
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            },
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {!showLegLocationSelection &&
                                            !showDriverSelection &&
                                            !showRouteVisualization && (
                                                <div className="relative flex flex-col h-full overflow-y-scroll bg-white shadow-xl">
                                                    <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6">
                                                        {/* Header */}
                                                        <div className="sticky top-0 flex items-start pt-4 bg-white z-20 justify-between mb-6 sm:mb-8 pb-4 border-b border-gray-100">
                                                            <div>
                                                                <Dialog.Title className="text-xl sm:text-2xl font-bold text-gray-900">
                                                                    {routeLeg ? 'Edit Assignment' : 'Create Assignment'}
                                                                </Dialog.Title>
                                                                <p className="text-sm sm:text-base text-gray-600 mt-1">
                                                                    {routeLeg
                                                                        ? 'Update route details and assignments'
                                                                        : 'Set up a new route assignment'}
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="p-2 text-gray-400 bg-gray-50 rounded-lg hover:bg-gray-100 hover:text-gray-600 transition-colors border border-gray-200"
                                                                onClick={() => close(false)}
                                                            >
                                                                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
                                                            </button>
                                                        </div>

                                                        {/* Route Section */}
                                                        <section className="mb-6 sm:mb-8">
                                                            {routeLegData.locations.length !== 0 && (
                                                                <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
                                                                        <div>
                                                                            <h5 className="text-lg sm:text-xl font-bold text-gray-900">
                                                                                Route Stops
                                                                            </h5>
                                                                            <p className="text-sm text-gray-600 mt-1">
                                                                                {dragState.isDragging
                                                                                    ? 'Drop to reorder • Release to place'
                                                                                    : 'Long press and drag to reorder stops • Tap checkbox to remove stop'}
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            className="mt-3 sm:mt-0 whitespace-nowrap inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-200 transition-all"
                                                                            onClick={() =>
                                                                                setShowLegLocationSelection(true)
                                                                            }
                                                                        >
                                                                            <PencilSquareIcon className="w-4 h-4 mr-2" />
                                                                            Edit Route
                                                                        </button>
                                                                    </div>

                                                                    <div className="space-y-3">
                                                                        {routeLegData.locations.map(
                                                                            (location, index) => (
                                                                                <LocationItem
                                                                                    key={
                                                                                        location.loadStop?.id ||
                                                                                        location.location.id
                                                                                    }
                                                                                    location={location}
                                                                                    index={index}
                                                                                    onReorder={handleReorder}
                                                                                    onRemove={
                                                                                        handleLegLocationCheckboxChange
                                                                                    }
                                                                                    dragState={dragState}
                                                                                    onDragStateChange={
                                                                                        handleDragStateChange
                                                                                    }
                                                                                />
                                                                            ),
                                                                        )}
                                                                    </div>

                                                                    {loadingRouteDetails ? (
                                                                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                                            <p className="text-sm font-medium text-blue-800">
                                                                                Loading route details...
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        routeLegData.distanceMiles &&
                                                                        routeLegData.durationHours && (
                                                                            <div
                                                                                className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-all duration-200 group"
                                                                                onClick={() =>
                                                                                    setShowRouteVisualization(true)
                                                                                }
                                                                            >
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex items-center space-x-8">
                                                                                        <div className="flex flex-col items-center">
                                                                                            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1 leading-tight">
                                                                                                Distance
                                                                                            </div>
                                                                                            <div className="text-2xl font-bold text-blue-900 leading-none tabular-nums">
                                                                                                {new Prisma.Decimal(
                                                                                                    routeLegData.distanceMiles,
                                                                                                )
                                                                                                    .toNumber()
                                                                                                    .toFixed(1)}
                                                                                            </div>
                                                                                            <div className="text-sm font-medium text-blue-700 mt-0.5">
                                                                                                miles
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="h-12 w-px bg-blue-200"></div>
                                                                                        <div className="flex flex-col items-center">
                                                                                            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1 leading-tight">
                                                                                                Duration
                                                                                            </div>
                                                                                            <div className="text-2xl font-bold text-blue-900 leading-none tabular-nums">
                                                                                                {(() => {
                                                                                                    const hours =
                                                                                                        new Prisma.Decimal(
                                                                                                            routeLegData.durationHours,
                                                                                                        ).toNumber();
                                                                                                    const totalMinutes =
                                                                                                        Math.round(
                                                                                                            hours * 60,
                                                                                                        );
                                                                                                    const h =
                                                                                                        Math.floor(
                                                                                                            totalMinutes /
                                                                                                                60,
                                                                                                        );
                                                                                                    const m =
                                                                                                        totalMinutes %
                                                                                                        60;
                                                                                                    return h > 0
                                                                                                        ? `${h}:${m
                                                                                                              .toString()
                                                                                                              .padStart(
                                                                                                                  2,
                                                                                                                  '0',
                                                                                                              )}`
                                                                                                        : `${m}`;
                                                                                                })()}
                                                                                            </div>
                                                                                            <div className="text-sm font-medium text-blue-700 mt-0.5">
                                                                                                {(() => {
                                                                                                    const hours =
                                                                                                        new Prisma.Decimal(
                                                                                                            routeLegData.durationHours,
                                                                                                        ).toNumber();
                                                                                                    const totalMinutes =
                                                                                                        Math.round(
                                                                                                            hours * 60,
                                                                                                        );
                                                                                                    const h =
                                                                                                        Math.floor(
                                                                                                            totalMinutes /
                                                                                                                60,
                                                                                                        );
                                                                                                    return h > 0
                                                                                                        ? 'hours'
                                                                                                        : 'minutes';
                                                                                                })()}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center text-blue-500 group-hover:text-blue-600 transition-colors">
                                                                                        <MapIcon className="h-6 w-6" />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-xs text-blue-500 mt-3 text-center font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                                                                                    Click to view route visualization
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}

                                                            {routeLegData.locations.length === 0 && (
                                                                <div className="bg-blue-50 rounded-lg p-6 sm:p-8 text-center border border-blue-200">
                                                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                                        <ChevronDoubleRightIcon className="w-6 h-6 text-blue-600" />
                                                                    </div>
                                                                    <h5 className="text-lg font-semibold text-blue-900 mb-2">
                                                                        Assignment Route
                                                                    </h5>
                                                                    <p className="text-sm text-blue-700 mb-4">
                                                                        Select stops and locations for this assignment
                                                                    </p>
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md transition-all"
                                                                        onClick={() =>
                                                                            setShowLegLocationSelection(true)
                                                                        }
                                                                    >
                                                                        Select Locations
                                                                        <ChevronDoubleRightIcon className="w-4 h-4 ml-2" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </section>

                                                        {/* Drivers Section */}
                                                        {routeLegData.locations.length !== 0 && (
                                                            <section className="mb-6 sm:mb-8">
                                                                {routeLegData.driversWithCharge.length !== 0 && (
                                                                    <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
                                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
                                                                            <div>
                                                                                <h5 className="text-lg sm:text-xl font-bold text-gray-900">
                                                                                    Assigned Drivers
                                                                                </h5>
                                                                                <p className="text-sm text-gray-600 mt-1">
                                                                                    Drivers assigned to this route
                                                                                </p>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-200 transition-all"
                                                                                onClick={() =>
                                                                                    setShowDriverSelection(true)
                                                                                }
                                                                            >
                                                                                <PencilSquareIcon className="w-4 h-4 mr-2" />
                                                                                Edit Drivers
                                                                            </button>
                                                                        </div>

                                                                        <div className="space-y-3 mb-4">
                                                                            {routeLegData.driversWithCharge?.map(
                                                                                (item, index) => (
                                                                                    <div
                                                                                        key={index}
                                                                                        className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                                                                                    >
                                                                                        <div className="flex items-center space-x-3">
                                                                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                                                                                                <UserCircleIcon className="w-6 h-6 text-gray-600" />
                                                                                            </div>
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <p className="text-base font-semibold text-gray-900 capitalize truncate">
                                                                                                    {item.driver.name}
                                                                                                </p>
                                                                                                <p className="text-sm text-green-600 font-medium">
                                                                                                    Pay:{' '}
                                                                                                    {formatCurrency(
                                                                                                        calcDriverPay(
                                                                                                            item.driver
                                                                                                                .id,
                                                                                                        ).toNumber(),
                                                                                                    )}
                                                                                                </p>
                                                                                            </div>
                                                                                            <div className="w-6 h-6 bg-gray-50 rounded flex items-center justify-center border">
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    value={
                                                                                                        item.driver.id
                                                                                                    }
                                                                                                    checked={true}
                                                                                                    onChange={
                                                                                                        handleDriverCheckboxChange
                                                                                                    }
                                                                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                ),
                                                                            )}
                                                                        </div>

                                                                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                                                                <div>
                                                                                    <span className="font-semibold text-blue-900">
                                                                                        Total Pay:
                                                                                    </span>
                                                                                    <span className="ml-2 text-green-600 font-bold">
                                                                                        {formatCurrency(
                                                                                            calculateTotalPay(),
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-semibold text-blue-900">
                                                                                        Load Rate:
                                                                                    </span>
                                                                                    <span className="ml-2 text-blue-700 font-bold">
                                                                                        {formatCurrency(
                                                                                            new Prisma.Decimal(
                                                                                                load.rate,
                                                                                            ).toNumber(),
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {routeLegData.driversWithCharge.length === 0 && (
                                                                    <div className="bg-blue-50 rounded-lg p-6 sm:p-8 text-center border border-blue-200">
                                                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                                            <UserPlusIcon className="w-6 h-6 text-blue-600" />
                                                                        </div>
                                                                        <h5 className="text-lg font-semibold text-blue-900 mb-2">
                                                                            Route Drivers
                                                                        </h5>
                                                                        <p className="text-sm text-blue-700 mb-4">
                                                                            Select drivers for this assignment
                                                                        </p>
                                                                        <button
                                                                            type="button"
                                                                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md transition-all"
                                                                            onClick={() => setShowDriverSelection(true)}
                                                                        >
                                                                            Select Drivers
                                                                            <ChevronDoubleRightIcon className="w-4 h-4 ml-2" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </section>
                                                        )}

                                                        {/* Schedule Section */}
                                                        {routeLegData.driversWithCharge.length !== 0 &&
                                                            routeLegData.locations.length !== 0 && (
                                                                <section className="mb-6 sm:mb-8">
                                                                    <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
                                                                        <div className="mb-4 sm:mb-6">
                                                                            <h5 className="text-lg sm:text-xl font-bold text-gray-900">
                                                                                Schedule Details
                                                                            </h5>
                                                                            <p className="text-sm text-gray-600 mt-1">
                                                                                When should drivers begin this
                                                                                assignment
                                                                            </p>
                                                                        </div>

                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 sm:mb-6">
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                                    Date
                                                                                </label>
                                                                                <input
                                                                                    onChange={(e) => {
                                                                                        setRouteLegData({
                                                                                            ...routeLegData,
                                                                                            scheduledDate:
                                                                                                e.target.value,
                                                                                        });
                                                                                    }}
                                                                                    value={
                                                                                        new Date(
                                                                                            routeLegData.scheduledDate,
                                                                                        )
                                                                                            .toISOString()
                                                                                            .split('T')[0]
                                                                                    }
                                                                                    type="date"
                                                                                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                                    Time
                                                                                </label>
                                                                                <input
                                                                                    type="time"
                                                                                    value={routeLegData.scheduledTime}
                                                                                    onChange={(e) => {
                                                                                        setRouteLegData({
                                                                                            ...routeLegData,
                                                                                            scheduledTime:
                                                                                                e.target.value,
                                                                                        });
                                                                                    }}
                                                                                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        <div className="mb-4 sm:mb-6">
                                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                                Driver Instructions (Optional)
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={routeLegData.driverInstructions}
                                                                                onChange={(e) => {
                                                                                    setRouteLegData({
                                                                                        ...routeLegData,
                                                                                        driverInstructions:
                                                                                            e.target.value,
                                                                                    });
                                                                                }}
                                                                                placeholder="Enter special instructions for drivers"
                                                                                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                                            />
                                                                        </div>

                                                                        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                                                                            <label className="flex items-center space-x-3 cursor-pointer">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={sendSMS}
                                                                                    onChange={(e) =>
                                                                                        setSendSMS(e.target.checked)
                                                                                    }
                                                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                                />
                                                                                <span className="text-sm font-medium text-gray-700">
                                                                                    Send notification to selected
                                                                                    drivers
                                                                                </span>
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                </section>
                                                            )}

                                                        <div className="h-16 sm:h-20"></div>
                                                    </div>

                                                    {/* Sticky Footer */}
                                                    {!showDriverSelection && !showLegLocationSelection && (
                                                        <div className="sticky bottom-0 left-0 right-0 p-4 sm:p-6 bg-white border-t border-gray-200 shadow-lg">
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    routeLegData.driversWithCharge.length < 1 ||
                                                                    routeLegData.locations.length < 2 ||
                                                                    saveLoading
                                                                }
                                                                className="w-full inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                onClick={() => submit()}
                                                            >
                                                                <PlusIcon className="w-5 h-5 mr-2" />
                                                                {routeLeg ? 'Save Assignment' : 'Add Assignment'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>
        </>
    );
};

export default RouteLegModal;
